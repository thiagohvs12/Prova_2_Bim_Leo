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
