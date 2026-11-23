# Previsões (pré-registro)

Registradas antes de executar as questões. Parâmetros: CLASSE_ALVO = Granel, TERMINAL_ALVO = T4, DATA_CORTE = 2026-06-01, INCIDENTE = -25.4580, -48.4900, EMPRESA_SANCIONADA = E2, BASE_DA_PILHA = K8.

Base para as estimativas: 400 mil movimentações distribuídas de forma uniforme entre 5 terminais, 4 classes e 5 tipos, com datas entre 01/01/2026 e o fim de outubro (300 dias). Então terminal + classe pega cerca de 1/20 da coleção (uns 20 mil, o próprio código de autenticidade indica 19.545 para T4 + Granel) e a partir de 01/06 sobra mais ou menos metade disso.

## A1 - Painel do pátio

Consulta: terminal T4, classe Granel, ts >= 2026-06-01, ordenado por peso_kg decrescente, limit 20.

a) Sem índice: COLLSCAN. totalDocsExamined = 400.000 (a coleção inteira), totalKeysExamined = 0. Vai ter SORT em memória (top 20). nReturned = 20.

b) Índice { terminal: 1, classe: 1, ts: 1, peso_kg: -1 }: IXSCAN usando igualdade em terminal e classe e faixa em ts. Espero uns 9 a 10 mil keys examinadas e o mesmo número de documentos examinados. Ainda vai ter SORT em memória, porque depois da faixa em ts o peso não sai ordenado do índice. nReturned = 20.

c) Índice ESR { terminal: 1, classe: 1, peso_kg: -1, ts: 1 }: IXSCAN sem estágio SORT, porque o índice já entrega os documentos na ordem de peso. O filtro de ts é aplicado nas próprias chaves do índice. Como mais ou menos metade dos registros passa no filtro de data, espero algo na casa de 40 keys examinadas e cerca de 20 documentos examinados. nReturned = 20.

## A2 - Incidente no pátio

Antes do índice: espero erro do tipo "unable to find index for $geoNear query", porque $near exige índice geoespacial.

Hipótese de armadilha: as coordenadas vêm do Google Maps no formato "lat, lon", mas o GeoJSON usa [longitude, latitude]. Se usar na ordem do Google Maps, o ponto fica em outro lugar do mundo e nada é encontrado. A ordem certa é [-48.4900, -25.4580].

Depois de criar o índice 2dsphere em posicao: estágio GEO_NEAR_2DSPHERE com FETCH. nReturned = 10. Pela densidade (400 mil pontos numa área de uns 5 x 5,5 km), deve haver alguns milhares de pontos dentro de 300 m, mas a busca para quando acha os 10 mais próximos, então espero centenas de keys/docs examinados, não a coleção inteira.

## A3 - TTL que não apaga

Hipótese: o campo registrado_em foi gravado como String (texto ISO) e não como Date. O índice TTL só funciona com campos do tipo Date (ou array de Date); se o valor for texto, o monitor TTL ignora o documento. Não acho que seja tempo de espera do monitor (ele roda a cada 60 segundos), porque já se passaram horas.

## A4 - Consulta coberta

Consulta: tipo "inspecao", terminal T4, projeção { _id: 0, container: 1 }.

Com índice { tipo: 1, terminal: 1, container: 1 }: IXSCAN + PROJECTION_COVERED, totalDocsExamined = 0, totalKeysExamined e nReturned perto de 16 mil (1/5 dos tipos x 1/5 dos terminais = 1/25 de 400 mil). Sem SORT.

Sem o _id: 0 na projeção: o _id não está no índice, então o plano passa a ter FETCH, e totalDocsExamined sobe para o mesmo valor de nReturned (cerca de 16 mil). Deixa de ser coberta.

## B1 - Relatório gerencial

$match em classe Granel e ts >= 2026-06-01 primeiro. Com índice { classe: 1, ts: 1 }, espero IXSCAN e cerca de 49 a 50 mil documentos entrando no $group (100 mil da classe x metade do período). Saída: 3 documentos, um por terminal, com valores próximos entre si porque a distribuição é uniforme.

## B2 - Debug do pipeline

Rodando como está, espero resultado errado: kg_total = 0 em tudo, porque o $project tira o peso_kg e o $sum recebe a string "peso_kg" em vez do campo "$peso_kg". Como o $limit vem antes do $sort e o $match vem no final, ele pega 3 grupos quaisquer e depois filtra a classe, então devem sobrar 0 ou 1 documento. Varre a coleção inteira (COLLSCAN, 400 mil docs).

## C2 - Neo4j

Direção esperada: a aresta é (a)-[:SOCIA_DE]->(b), ou seja, a é sócia de b. Para achar quem está ligado à sancionada pelos donos (quem controla a E2), a travessia deve ir contra a seta, chegando na E2: (x)-[:SOCIA_DE*1..3]->(E2). Olhando o script, a E2 não aparece como "de" em nenhuma sociedade, só como "para", então pela direção de saída o resultado seria vazio.

Ordem de grandeza: cerca de 10 a 15 empresas no raio de 3 níveis, mas poucos registros finais (algo entre 0 e 5), porque precisa coincidir terminal e data exatos num mês de 30 dias e 5 terminais.
