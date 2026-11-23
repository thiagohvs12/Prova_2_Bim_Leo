// Prova Prática - Operação Maré Alta - Parte C
// Thiago Henrique Velasquez Santana - RA 241959542
// EMPRESA_SANCIONADA = E2 | BASE_DA_PILHA = K8

// ---------- C1. Sócios diretos da sancionada ----------
MATCH (s:Empresa {sancionada: true})-[r:SOCIA_DE]-(socio:Empresa)
RETURN socio.nome AS socio, r.pct AS pct, startNode(r) = socio AS socio_aponta_para_E2;

// ---------- C2. Investigação societária e operacional ----------
MATCH (x:Empresa)-[:SOCIA_DE*1..3]->(s:Empresa {sancionada: true})
WITH DISTINCT x, s
MATCH (x)<-[:PERTENCE_A]-(kx:Container)-[px:PASSOU_POR]->(t:Terminal)<-[ps:PASSOU_POR]-(ks:Container)-[:PERTENCE_A]->(s)
WHERE px.data = ps.data AND x <> s
RETURN DISTINCT x.nome AS empresa, kx.id AS container, t.nome AS terminal, px.data AS data
ORDER BY empresa, data;

// Direção contrária: saindo da sancionada não se chega em ninguém
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
RETURN count(DISTINCT x) AS empresas_alcancadas;

// ---------- C3. Debug Cypher ----------
// (i) Corrigido: encontra as empresas existentes e cria a ligação só se não existir
MATCH (a:Empresa {cnpj:'E1'}), (b:Empresa {cnpj:'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
ON CREATE SET r.pct = 30
RETURN a.nome, r.pct, b.nome;
// Limpeza das cópias criadas pelo CREATE com defeito
// MATCH (e:Empresa) WHERE e.nome IS NULL DETACH DELETE e;

// (ii) Corrigido: com direção, limite de 3 níveis e DISTINCT
MATCH (x:Empresa)-[:SOCIA_DE*1..3]->(s:Empresa {sancionada:true})
RETURN DISTINCT x.nome ORDER BY x.nome;

// (iii) Corrigido: a seta aponta de cima para baixo, então busca quem aponta para a base
MATCH (base:Container {id:'K8'})<-[:EMPILHADO_SOBRE*1..3]-(x:Container)
RETURN x.id ORDER BY x.id;

// (iv) Corrigido: conta contêineres diferentes, não passagens
MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso'
RETURN t.nome, count(DISTINCT k) ORDER BY t.nome;
