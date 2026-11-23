// mongosh --file logiporto_gerador.js
const RA =241959542 ; // <<< RA do aluno (somente dígitos, sem zeros à esquerda)
if (!RA) throw new Error("Defina o RA");

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(RA);
const ri = (n) => Math.floor(rand() * n);
const pick = (a) => a[ri(a.length)];

const TERMINAIS = ["T1", "T2", "T3", "T4", "T5"];
const CLASSES = ["Refrigerado", "Perigoso", "Granel", "Geral"];
const TIPOS = ["gate_in", "gate_out", "inspecao", "carga", "descarga"];
const TAGS = ["refrigerado", "perigoso", "fragil", "alto_valor", "urgente", "inspecao_fiscal", "granel", "lacre_violado", "transbordo", "exportacao", "importacao", "overweight"];
const PALAVRAS = ["lacre", "guindaste", "patio", "fila", "balanca", "doca", "navio", "carga", "descarga", "vistoria", "atraso", "liberado"];

const CLASSE_ALVO = CLASSES[RA % 4];
const TERMINAL_ALVO = TERMINAIS[Math.floor(RA / 7) % 5];
const DATA_CORTE = new Date(Date.UTC(2026, 3 + (RA % 4), 1));
const PONTO_LAT = -25.50 + ((RA % 50) / 1000);
const PONTO_LON = -48.52 + ((Math.floor(RA / 3) % 50) / 1000);

db = db.getSiblingDB("logiporto");
db.movimentacoes.drop(); db.alertas.drop();

const INICIO = Date.UTC(2026, 0, 1);
const TOTAL = 400000;
for (let i = 0; i < TOTAL; i += 20000) {
  const lote = [];
  for (let j = i; j < Math.min(i + 20000, TOTAL); j++) {
    const tags = Array.from({ length: 1 + ri(3) }, () => pick(TAGS));
    const palavras = Array.from({ length: 8 }, () => pick(PALAVRAS));
    if (ri(500) === 0) palavras.push("avaria");
    lote.push({
      container: "CTN" + String(ri(60000)).padStart(5, "0"),
      tipo: pick(TIPOS), terminal: pick(TERMINAIS), classe: pick(CLASSES),
      peso_kg: 1000 + ri(30000),
      ts: new Date(INICIO + ri(300 * 86400000)),
      posicao: { type: "Point", coordinates: [-48.52 + rand() * 0.05, -25.50 + rand() * 0.05] },
      tags: tags, obs: palavras.join(" ")
    });
  }
  db.movimentacoes.insertMany(lote, { ordered: false });
}
const alertas = [];
for (let i = 0; i < 100000; i++) {
  alertas.push({ sensor: "S" + ri(500), nivel: pick(["info", "aviso", "critico"]),
    registrado_em: new Date(INICIO + ri(300 * 86400000)).toISOString() }); // String de propósito (armadilha da A3)
}
db.alertas.insertMany(alertas, { ordered: false });

const aut = db.movimentacoes.aggregate([
  { $match: { classe: CLASSE_ALVO, terminal: TERMINAL_ALVO } },
  { $group: { _id: null, n: { $sum: 1 }, kg: { $sum: "$peso_kg" } } }]).toArray()[0];
print("=== PARÂMETROS DA SUA PROVA ===");
print("CLASSE_ALVO   : " + CLASSE_ALVO);
print("TERMINAL_ALVO : " + TERMINAL_ALVO);
print("DATA_CORTE    : " + DATA_CORTE.toISOString().slice(0, 10));
print("INCIDENTE (formato Google Maps 'lat, lon'): " + PONTO_LAT.toFixed(4) + ", " + PONTO_LON.toFixed(4));
print("CÓDIGO DE AUTENTICIDADE: LP-" + RA + "-" + aut.n + "-" + (aut.kg % 99991));
