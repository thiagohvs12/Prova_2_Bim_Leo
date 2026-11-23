// mongosh --nodb --file grafo_gerador.js > grafo.cypher
const RA = 241959542; // <<< RA do aluno
if (!RA) throw new Error("Defina o RA");
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(RA + 7919);
const ri = (n) => Math.floor(rand() * n);
const lit = (o) => JSON.stringify(o).replace(/"(\w+)":/g, "$1:");
const NE = 30, NC = 90, TERM = ["T1", "T2", "T3", "T4", "T5"], CL = ["Refrigerado", "Perigoso", "Granel", "Geral"];
const SANC = RA % NE;
const empresas = Array.from({ length: NE }, (_, i) => ({ cnpj: "E" + i, nome: "Empresa " + i, sancionada: i === SANC }));
const socios = []; const vistos = new Set();
while (socios.length < 45) { const a = ri(NE), b = ri(NE); const k = a + "-" + b;
  if (a !== b && !vistos.has(k)) { vistos.add(k); socios.push({ de: "E" + a, para: "E" + b, pct: 5 + ri(90) }); } }
const containers = Array.from({ length: NC }, (_, i) => ({ id: "K" + i, classe: CL[ri(4)], dono: "E" + ri(NE) }));
containers[0].dono = "E" + SANC; containers[1].dono = "E" + SANC; containers[2].dono = "E" + SANC;
const passagens = [];
containers.forEach(c => { for (let p = 0; p < 2; p++) passagens.push({ id: c.id, term: TERM[ri(5)],
  data: "2026-10-" + String(1 + ri(30)).padStart(2, "0") }); });
const pilhas = [];
for (let s = 0; s < 15; s++) for (let n = 1; n < 4; n++) pilhas.push({ topo: "K" + (4 * s + n), base: "K" + (4 * s + n - 1) });
print("// BASE_DA_PILHA da sua prova: K" + (4 * (RA % 15)) + " | EMPRESA SANCIONADA: E" + SANC);
print("UNWIND " + lit(TERM.map(t => ({ nome: t }))) + " AS t CREATE (:Terminal {nome: t.nome});");
print("UNWIND " + lit(empresas) + " AS e CREATE (:Empresa {cnpj: e.cnpj, nome: e.nome, sancionada: e.sancionada});");
print("UNWIND " + lit(socios) + " AS s MATCH (a:Empresa {cnpj: s.de}), (b:Empresa {cnpj: s.para}) CREATE (a)-[:SOCIA_DE {pct: s.pct}]->(b);");
print("UNWIND " + lit(containers) + " AS c MATCH (e:Empresa {cnpj: c.dono}) CREATE (:Container {id: c.id, classe: c.classe})-[:PERTENCE_A]->(e);");
print("UNWIND " + lit(passagens) + " AS p MATCH (k:Container {id: p.id}), (t:Terminal {nome: p.term}) CREATE (k)-[:PASSOU_POR {data: p.data}]->(t);");
print("UNWIND " + lit(pilhas) + " AS p MATCH (a:Container {id: p.topo}), (b:Container {id: p.base}) CREATE (a)-[:EMPILHADO_SOBRE]->(b);");
