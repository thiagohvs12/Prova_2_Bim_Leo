# Diário de bordo

Prova Prática Integradora - Operação Maré Alta
Thiago Henrique Velasquez Santana, RA 241959542

Hipóteses testadas, erros encontrados e correções, na ordem em que aconteceram.


- O primeiro comando do gerador falhou porque o contêiner mongo-lab estava parado. Resolvi com `docker start mongo-lab`.
- A primeira versão do grafo.cypher saiu com o texto do terminal misturado. Gerei de novo copiando o script para o contêiner e usando `--file --quiet`.
- O Neo4j ainda tinha os dados do exercício da aula (Antena, CoreRouter e Switch). Apaguei tudo com `MATCH (n) DETACH DELETE n` antes de carregar o grafo da prova e conferi 5 terminais, 30 empresas e 90 contêineres.
- A1: na primeira vez esqueci de tirar o print do item b. Apaguei o índice ESR, criei de novo o índice do item b, rodei o explain e depois voltei o ESR.
- A1 b: eu tinha previsto uns 9,7 mil documentos lidos, mas foram só 20. As chaves bateram, 9741. Eu não tinha pensado que, como o peso está no índice, o banco ordena pelas chaves e só busca os documentos no final.
- A2: com as coordenadas na ordem do Google Maps o terminal não mostrou nada, e parecia que o comando nem tinha rodado. Repeti com `.toArray()` para aparecer o `[]`.
- A2: eu tinha previsto centenas de chaves e documentos lidos. Foram 102 chaves e 36 documentos, porque a busca para assim que acha os 10 mais perto, e eles estavam a poucos metros do ponto.
- A3: minha hipótese do pré-registro, de que o campo estava gravado como texto, se confirmou. O primeiro sinal foi o findOne mostrar a data entre aspas.
- A3: o alerta de teste não some na hora. A tarefa do TTL roda a cada 60 segundos, então esperei uns dois minutos antes de contar de novo.
- A4: a previsão de uns 16 mil registros bateu, foram 15945. O estágio sem o `_id: 0` apareceu como PROJECTION_SIMPLE em vez de só PROJECTION, mas o importante, o FETCH, apareceu como eu esperava.
- B1: eu tinha previsto uns 49 a 50 mil documentos entrando no $group, e foram 49610. No começo estranhei o nReturned 5 no explain, achei que fosse o número de documentos que entraram. Depois entendi que, nessa versão do MongoDB, o $group roda junto com a busca e o nReturned é a saída do grupo, um por terminal. Confirmei a entrada contando os documentos do $match.
- B2: previ que o pipeline errado ia trazer 0 ou 1 documento, com peso 0. Veio 1 documento (T2), com peso 0.
- B2: esperava que o pipeline corrigido também ficasse mais rápido, mas o tempo foi parecido (103 ms contra 111 ms). Entendi que buscar 1/4 dos documentos pelo índice, um por um, custa parecido com ler a coleção inteira em sequência quando tudo está na memória. O ganho real aparece em documentos lidos e em grupos na memória.
- C2: eu tinha previsto a direção chegando na E2, porque no script ela só aparece no campo "para" das sociedades, e o teste no sentido contrário deu 0 como eu esperava. Previ entre 0 e 5 registros e vieram 5.
- C3 (i): rodei o CREATE com defeito duas vezes sem perceber e acabaram sendo criadas 4 empresas falsas em vez de 2. Isso acabou mostrando bem o problema, porque cada execução duplica de novo. Apaguei as 4 com o DETACH DELETE antes de rodar a versão com MERGE.
- C3 (ii): no print grande do Neo4j os resultados ficaram empilhados e repetidos, então recortei só a parte de cada consulta para as evidências.
