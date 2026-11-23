// Prova Prática - Operação Maré Alta
// Thiago Henrique Velasquez Santana - RA 241959542
// Parâmetros: CLASSE_ALVO = Granel, TERMINAL_ALVO = T4, DATA_CORTE = 2026-06-01
// Executado com: docker exec -it mongo-lab mongosh logiporto

// Função auxiliar: mostra os estágios do plano vencedor e as métricas do explain
function resumo(e) {
  const s = e.executionStats;
  const st = [];
  let p = e.queryPlanner.winningPlan;
  p = p.queryPlan || p;
  while (p) {
    st.push(p.stage);
    p = p.inputStage || (p.inputStages && p.inputStages[0]);
  }
  printjson({
    estagios: st.join(" <- "),
    nReturned: s.nReturned,
    totalDocsExamined: s.totalDocsExamined,
    totalKeysExamined: s.totalKeysExamined,
    executionTimeMillis: s.executionTimeMillis,
    indice: JSON.stringify(
      e.queryPlanner.winningPlan.queryPlan?.inputStage?.keyPattern ||
      e.queryPlanner.winningPlan.inputStage?.inputStage?.keyPattern ||
      e.queryPlanner.winningPlan.inputStage?.keyPattern || "nenhum")
  });
}

// ---------- A1. Painel do pátio ----------
const consultaA1 = () => db.movimentacoes.find({
  terminal: "T4",
  classe: "Granel",
  ts: { $gte: ISODate("2026-06-01") }
}).sort({ peso_kg: -1 }).limit(20);

// a) sem índice
resumo(consultaA1().explain("executionStats"));

// b) índice na ordem do filtro
db.movimentacoes.createIndex({ terminal: 1, classe: 1, ts: 1, peso_kg: -1 });
resumo(consultaA1().explain("executionStats"));

// c) índice ESR (igualdade, ordenação, faixa)
db.movimentacoes.dropIndex({ terminal: 1, classe: 1, ts: 1, peso_kg: -1 });
db.movimentacoes.createIndex({ terminal: 1, classe: 1, peso_kg: -1, ts: 1 });
resumo(consultaA1().explain("executionStats"));

// ---------- A2. Incidente no pátio ----------
// Google Maps mostra "lat, lon" = -25.4580, -48.4900
// GeoJSON exige [longitude, latitude] = [-48.4900, -25.4580]
const pontoIncidente = { type: "Point", coordinates: [-48.4900, -25.4580] };

// Antes do índice: erro "unable to find index for $geoNear query"
db.movimentacoes.find({ posicao: { $near: { $geometry: pontoIncidente, $maxDistance: 300 } } }).limit(10);

db.movimentacoes.createIndex({ posicao: "2dsphere" });

// Armadilha: ordem do Google Maps (lat, lon) -> resultado vazio
db.movimentacoes.find(
  { posicao: { $near: { $geometry: { type: "Point", coordinates: [-25.4580, -48.4900] }, $maxDistance: 300 } } },
  { _id: 0, container: 1, posicao: 1 }
).limit(10).toArray();

// Correto: 10 mais próximos em até 300 m, já ordenados por distância
db.movimentacoes.find(
  { posicao: { $near: { $geometry: pontoIncidente, $maxDistance: 300 } } },
  { _id: 0, container: 1, posicao: 1 }
).limit(10);

resumo(db.movimentacoes.find({ posicao: { $near: { $geometry: pontoIncidente, $maxDistance: 300 } } }).limit(10).explain("executionStats"));

// ---------- A3. O TTL que não apaga ----------
db.alertas.findOne();   // registrado_em aparece entre aspas: é texto
db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000 }); // 30 dias
db.alertas.countDocuments();                                  // 100000 antes e depois de esperar
db.alertas.countDocuments({ registrado_em: { $type: "string" } }); // 100000
db.alertas.countDocuments({ registrado_em: { $type: "date" } });   // 0

// Como a aplicação deve gravar: data de verdade (Date), não texto
db.alertas.insertOne({ sensor: "TESTE", nivel: "info", registrado_em: new Date(Date.now() - 40*24*60*60*1000) });
db.alertas.countDocuments({ sensor: "TESTE" }); // 1 logo depois, 0 depois de ~2 minutos

// ---------- A4. Consulta coberta ----------
db.movimentacoes.createIndex({ tipo: 1, terminal: 1, container: 1 });
// Coberta: PROJECTION_COVERED, totalDocsExamined 0
resumo(db.movimentacoes.find({ tipo: "inspecao", terminal: "T4" }, { _id: 0, container: 1 }).explain("executionStats"));
// Sem _id: 0 o _id volta na resposta, não está no índice -> FETCH
resumo(db.movimentacoes.find({ tipo: "inspecao", terminal: "T4" }, { container: 1 }).explain("executionStats"));

// ================= PARTE B =================
// Função auxiliar para explain de aggregate
function resumoAgg(ex) {
  const c = ex.stages ? ex.stages[0].$cursor : ex;
  const s = c.executionStats;
  let p = c.queryPlanner.winningPlan;
  p = p.queryPlan || p;
  const st = [];
  while (p) { st.push(p.stage); p = p.inputStage || (p.inputStages && p.inputStages[0]); }
  printjson({ estagios: st.join(" <- "), nReturned: s.nReturned, totalDocsExamined: s.totalDocsExamined,
              totalKeysExamined: s.totalKeysExamined, executionTimeMillis: s.executionTimeMillis });
}

// ---------- B1. Relatório gerencial ----------
const pipelineB1 = [
  { $match: { classe: "Granel", ts: { $gte: ISODate("2026-06-01") } } },
  { $group: { _id: "$terminal", total_movimentacoes: { $sum: 1 }, peso_total: { $sum: "$peso_kg" },
              peso_medio: { $avg: "$peso_kg" }, maior_peso: { $max: "$peso_kg" } } },
  { $sort: { peso_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", total_movimentacoes: 1, peso_total: 1, peso_medio: 1, maior_peso: 1 } }
];
db.movimentacoes.aggregate(pipelineB1);
resumoAgg(db.movimentacoes.explain("executionStats").aggregate(pipelineB1)); // antes do índice
db.movimentacoes.createIndex({ classe: 1, ts: 1 });
resumoAgg(db.movimentacoes.explain("executionStats").aggregate(pipelineB1)); // depois do índice
db.movimentacoes.countDocuments({ classe: "Granel", ts: { $gte: ISODate("2026-06-01") } }); // 49610 entram no $group
