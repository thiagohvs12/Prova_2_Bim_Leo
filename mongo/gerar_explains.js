// Gera os explains completos (executionStats) das Partes A e B em arquivos JSON.
// Thiago Henrique Velasquez Santana - RA 241959542
//
// Como rodar (na pasta da prova):
//   docker cp mongo/gerar_explains.js mongo-lab:/tmp/gerar_explains.js
//   docker exec mongo-lab mongosh logiporto --quiet --file /tmp/gerar_explains.js
//   docker cp mongo-lab:/tmp/explains/. mongo/explains
//
// O script não muda o estado final do banco: o único índice criado aqui (o do
// item b da A1) é apagado no final dele, igual foi feito na prova.
// Para os casos "sem índice" foi usado hint({ $natural: 1 }), que obriga o
// MongoDB a ler a coleção inteira, como se o índice não existisse.

const fs = require("fs");
const pasta = "/tmp/explains";
fs.mkdirSync(pasta, { recursive: true });

function salvar(nome, explain) {
  fs.writeFileSync(pasta + "/" + nome + ".json", EJSON.stringify(explain, null, 2, { relaxed: true }));
  print("salvo: " + nome + ".json");
}

const col = db.movimentacoes;

// ---------- A1 ----------
const filtroA1 = { terminal: "T4", classe: "Granel", ts: { $gte: ISODate("2026-06-01") } };
const indiceB = { terminal: 1, classe: 1, ts: 1, peso_kg: -1 };
const indiceESR = { terminal: 1, classe: 1, peso_kg: -1, ts: 1 };

salvar("A1a_sem_indice",
  col.find(filtroA1).sort({ peso_kg: -1 }).limit(20).hint({ $natural: 1 }).explain("executionStats"));

col.createIndex(indiceB);
salvar("A1b_ordem_filtro",
  col.find(filtroA1).sort({ peso_kg: -1 }).limit(20).hint(indiceB).explain("executionStats"));
col.dropIndex(indiceB);

salvar("A1c_esr",
  col.find(filtroA1).sort({ peso_kg: -1 }).limit(20).hint(indiceESR).explain("executionStats"));

// ---------- A2 ----------
const ponto = { type: "Point", coordinates: [-48.4900, -25.4580] };
salvar("A2_geo_near",
  col.find({ posicao: { $near: { $geometry: ponto, $maxDistance: 300 } } }).limit(10).explain("executionStats"));

// ---------- A4 ----------
salvar("A4a_coberta",
  col.find({ tipo: "inspecao", terminal: "T4" }, { _id: 0, container: 1 }).explain("executionStats"));
salvar("A4b_sem_id0",
  col.find({ tipo: "inspecao", terminal: "T4" }, { container: 1 }).explain("executionStats"));

// ---------- B1 ----------
const pipelineB1 = [
  { $match: { classe: "Granel", ts: { $gte: ISODate("2026-06-01") } } },
  { $group: { _id: "$terminal", total_movimentacoes: { $sum: 1 }, peso_total: { $sum: "$peso_kg" },
              peso_medio: { $avg: "$peso_kg" }, maior_peso: { $max: "$peso_kg" } } },
  { $sort: { peso_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", total_movimentacoes: 1, peso_total: 1, peso_medio: 1, maior_peso: 1 } }
];
salvar("B1a_sem_indice", col.explain("executionStats").aggregate(pipelineB1, { hint: { $natural: 1 } }));
salvar("B1b_com_indice", col.explain("executionStats").aggregate(pipelineB1));

// ---------- B2 ----------
const pipelineErrado = [
  { $project: { terminal: 1, classe: 1 } },
  { $group: { _id: { terminal: "$terminal", classe: "$classe" }, kg_total: { $sum: "peso_kg" }, mov: { $sum: 1 } } },
  { $limit: 3 },
  { $sort: { kg_total: -1 } },
  { $match: { "_id.classe": "Granel" } }
];
const pipelineCorrigido = [
  { $match: { classe: "Granel" } },
  { $group: { _id: "$terminal", kg_total: { $sum: "$peso_kg" }, mov: { $sum: 1 } } },
  { $sort: { kg_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", kg_total: 1, mov: 1 } }
];
salvar("B2a_errado", col.explain("executionStats").aggregate(pipelineErrado));
salvar("B2b_corrigido", col.explain("executionStats").aggregate(pipelineCorrigido));

// ---------- Auditoria ----------
salvar("indices_finais", col.getIndexes());
print("pronto");
