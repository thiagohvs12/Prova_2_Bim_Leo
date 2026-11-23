# Prova Prática Integradora - Operação Maré Alta

Banco de Dados NoSQL, 2º Bimestre, Engenharia de Software, 6º Semestre, Unicesumar
Professor Leonardo Rocha

Aluno: Thiago Henrique Velasquez Santana
RA: 241959542

## Parâmetros da minha prova

Saída do logiporto_gerador.js:

```
CLASSE_ALVO   : Granel
TERMINAL_ALVO : T4
DATA_CORTE    : 2026-06-01
INCIDENTE (formato Google Maps 'lat, lon'): -25.4580, -48.4900
CÓDIGO DE AUTENTICIDADE: LP-241959542-19545-33562
```

Primeira linha do grafo.cypher:

```
// BASE_DA_PILHA da sua prova: K8 | EMPRESA SANCIONADA: E2
```

## Ambiente

Usei o MongoDB no contêiner Docker mongo-lab e o Neo4j no contêiner neo4j-lab, os dois das aulas. Meu computador é Windows e rodei os comandos pelo terminal do VS Code.

No PowerShell o sinal `<` não funciona, então rodei o gerador assim:

```
cmd /c "docker exec -i mongo-lab mongosh < logiporto_gerador.js"
```

Para gerar o grafo eu copiei o script para dentro do contêiner e rodei com `--file --quiet`, porque do outro jeito o arquivo .cypher saía com o texto do terminal misturado.

## Uso de IA

Usei IA (Claude) como apoio, com autorização do professor. Todos os comandos e resultados foram rodados no meu computador, com o banco gerado pelo meu RA.

## Arquivos

- README.md: parâmetros, respostas e diário de bordo
- previsoes.md: o que eu esperava antes de rodar cada questão
- consultas_mongodb.js: todos os comandos usados no MongoDB
- evidencias: prints dos resultados

## Parte A - MongoDB

Para não ter que procurar os números no meio do explain, que é bem grande, criei uma função chamada `resumo` que mostra só o que a questão pede. O código dela está no consultas_mongodb.js.

### A1. Painel do pátio

Consulta com os meus parâmetros:

```js
db.movimentacoes.find({
  terminal: "T4",
  classe: "Granel",
  ts: { $gte: ISODate("2026-06-01") }
}).sort({ peso_kg: -1 }).limit(20)
```

a) Sem índice

![A1 a](evidencias/A1a_sem_indice.png)

b) Com o índice na ordem do filtro `{ terminal: 1, classe: 1, ts: 1, peso_kg: -1 }`

![A1 b](evidencias/A1b_ordem_filtro.png)

c) Com o índice pela regra ESR `{ terminal: 1, classe: 1, peso_kg: -1, ts: 1 }`

![A1 c](evidencias/A1c_esr.png)

d) Comparação

| | a) sem índice | b) ordem do filtro | c) ESR |
|---|---|---|---|
| Estágios | SORT, COLLSCAN | FETCH, SORT, IXSCAN | LIMIT, FETCH, IXSCAN |
| Ordenou na memória | sim | sim | não |
| totalKeysExamined | 0 | 9741 | 30 |
| totalDocsExamined | 400000 | 20 | 20 |
| nReturned | 20 | 20 | 20 |
| executionTimeMillis | 543 | 13 | 12 |

Sem índice o banco precisou ler as 400 mil movimentações, uma por uma, e depois ordenar tudo na memória para achar as 20 mais pesadas.

No item b o índice ajudou a achar os registros, mas não ajudou na ordenação. O índice é uma B-Tree, que guarda as chaves em ordem, campo por campo, na ordem em que foram criados. Terminal e classe são valores fixos, então o próximo campo da árvore é a data. Como eu pedi uma faixa de datas, o banco teve que passar por todas as chaves de T4 e Granel a partir de junho, que deram 9741. Essas chaves estão em ordem de data, não de peso. Por isso o banco ainda precisou ordenar tudo na memória antes de devolver os 20 primeiros.

Uma coisa que eu não esperava: foram lidos só 20 documentos e não os 9741. Como o peso está dentro do índice, o banco ordenou usando as próprias chaves e só depois foi buscar os 20 documentos que ganharam.

No item c usei a regra ESR, que diz para colocar no índice primeiro os campos de igualdade, depois o campo da ordenação e por último o campo de faixa. Ficou terminal, classe, peso e data. Assim, dentro de T4 e Granel as chaves já estão em ordem do mais pesado para o mais leve. O banco só vai descendo pela árvore, pula quem é de antes de junho e para quando junta 20. Por isso não precisou ordenar nada na memória e leu só 30 chaves. As 10 que sobraram eram registros pesados, mas de antes da data de corte.

O tempo do b e do c ficou quase igual porque 9741 chaves ainda é pouco. A diferença que importa é que no c o banco não ordena nada e o trabalho depende só do limit, e não de quantos registros existem no período.

O índice que ficou na coleção no final da A1 foi o ESR.

### A2. Incidente no pátio

O ponto do alarme veio no formato do Google Maps, que mostra primeiro a latitude e depois a longitude: `-25.4580, -48.4900`.

Primeiro rodei a busca antes de ter índice:

```js
db.movimentacoes.find({
  posicao: { $near: {
    $geometry: { type: "Point", coordinates: [-48.4900, -25.4580] },
    $maxDistance: 300
  } }
}).limit(10)
```

![A2 erro](evidencias/A2a_erro_sem_indice.png)

Deu o erro `unable to find index for $geoNear query`. Uma busca normal sem índice ainda consegue ler a coleção inteira, mas o `$near` precisa devolver os resultados por ordem de distância, e o MongoDB só faz isso usando um índice geográfico. Sem ele a consulta nem roda.

Depois criei o índice:

```js
db.movimentacoes.createIndex({ posicao: "2dsphere" })
```

![A2 indice](evidencias/A2b_indice_2dsphere.png)

Escolhi o `2dsphere` porque o campo posicao está no formato GeoJSON e a distância precisa ser calculada em metros, considerando que a Terra é redonda. O índice `2d` serve para um plano e não trabalha em metros.

Depois testei colando as coordenadas na mesma ordem do Google Maps:

```js
db.movimentacoes.find({
  posicao: { $near: {
    $geometry: { type: "Point", coordinates: [-25.4580, -48.4900] },
    $maxDistance: 300
  } }
}, { _id: 0, container: 1, posicao: 1 }).limit(10).toArray()
```

![A2 ordem errada](evidencias/A2c_ordem_google_maps.png)

Voltou vazio e sem nenhum erro. O GeoJSON usa a ordem contrária, primeiro longitude e depois latitude. Com a ordem trocada o banco entende um ponto que existe, mas fica no meio do oceano, bem longe de Paranaguá. Como não tem nada perto de lá, a busca volta vazia sem avisar. Esse é o problema mais perigoso, porque parece que deu certo.

Então rodei com a ordem certa, longitude e depois latitude:

```js
db.movimentacoes.find({
  posicao: { $near: {
    $geometry: { type: "Point", coordinates: [-48.4900, -25.4580] },
    $maxDistance: 300
  } }
}, { _id: 0, container: 1, posicao: 1 }).limit(10)
```

![A2 resultado 1](evidencias/A2d_resultado_parte1.png)

![A2 resultado 2](evidencias/A2d_resultado_parte2.png)

Voltaram os 10 registros mais próximos, já em ordem de distância, sem eu precisar usar sort: CTN14966, CTN22280, CTN01260, CTN29540, CTN17399, CTN56094, CTN46454, CTN48264, CTN14920 e CTN12506. O valor 300 do `$maxDistance` é em metros porque o ponto foi passado em GeoJSON.

Por último, o explain:

```js
db.movimentacoes.find({
  posicao: { $near: {
    $geometry: { type: "Point", coordinates: [-48.4900, -25.4580] },
    $maxDistance: 300
  } }
}).limit(10).explain("executionStats")
```

![A2 explain](evidencias/A2e_explain.png)

| | Valor |
|---|---|
| Estágios | LIMIT, GEO_NEAR_2DSPHERE, FETCH, IXSCAN |
| nReturned | 10 |
| totalKeysExamined | 102 |
| totalDocsExamined | 36 |
| executionTimeMillis | 1 |
| Índice | posicao 2dsphere |

O que cada etapa faz, de baixo para cima:

IXSCAN. O índice 2dsphere divide o mapa em pequenas áreas, chamadas células, e guarda em qual célula cada ponto está. O banco calcula quais células ficam em volta do incidente e lê só as chaves delas. Foram 102.

FETCH. Uma célula é uma área aproximada, então um contêiner pode estar na célula certa e mesmo assim passar de 300 metros. Por isso o banco busca os documentos candidatos, que foram 36, para ver a posição exata de cada um.

GEO_NEAR_2DSPHERE. Calcula a distância de verdade de cada candidato, tira quem passou de 300 metros e coloca em ordem. Ele faz isso em anéis, começando pelo mais perto do ponto e indo para fora. Só abre um anel novo se ainda faltar resultado.

LIMIT. Corta em 10. Como os resultados já chegam em ordem, quando completa 10 a busca para.

No fim o banco leu 36 documentos para responder, em vez das 400 mil movimentações.

### A3. O TTL que não apaga

Primeiro olhei como um alerta está gravado:

```js
db.alertas.findOne()
```

![A3 findOne](evidencias/A3a_findOne.png)

O campo `registrado_em` aparece entre aspas: `'2026-07-05T19:49:33.047Z'`. Isso quer dizer que a data foi gravada como texto, e não como data.

Depois criei o mesmo índice TTL que o desenvolvedor anterior criou, para apagar depois de 30 dias (30 x 24 x 60 x 60 = 2592000 segundos):

```js
db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000 })
```

![A3 indice](evidencias/A3b_indice_ttl.png)

Contei os alertas logo depois e de novo alguns minutos mais tarde. Continuaram 100000, mesmo todos sendo de 2026 e quase todos com bem mais de 30 dias.

![A3 antes](evidencias/A3c_contagem_antes.png)

![A3 depois](evidencias/A3d_contagem_depois.png)

Para comprovar o motivo, contei os alertas pelo tipo do campo:

```js
db.alertas.countDocuments({ registrado_em: { $type: "string" } })
db.alertas.countDocuments({ registrado_em: { $type: "date" } })
```

![A3 string](evidencias/A3e_tipo_string.png)

![A3 date](evidencias/A3f_tipo_date.png)

Todos os 100000 estão como texto e nenhum está como data.

Causa raiz. O MongoDB tem uma tarefa que roda sozinha a cada 60 segundos e apaga os documentos vencidos de um índice TTL. Para saber se um documento venceu, ela soma a data do campo com o `expireAfterSeconds` e compara com a hora atual. Essa conta só é feita quando o campo é do tipo Date, ou uma lista de Dates. Se o campo for texto, a tarefa simplesmente ignora o documento, sem dar erro nenhum. Mesmo o texto tendo cara de data, para o banco ele é só um texto. Por isso o índice foi criado sem problema e nada foi apagado.

O comando do índice em si está certo. O que precisa mudar é o jeito de gravar. O índice correto é:

```js
db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000 })
```

E a aplicação precisa gravar `registrado_em` como data de verdade, usando `new Date()` ou o tipo de data do driver da linguagem, e não como texto com `toISOString()`:

```js
db.alertas.insertOne({ sensor: "S1", nivel: "aviso", registrado_em: new Date() })
```

Para testar, gravei um alerta do jeito certo com data de 40 dias atrás:

```js
db.alertas.insertOne({ sensor: "TESTE", nivel: "info", registrado_em: new Date(Date.now() - 40*24*60*60*1000) })
db.alertas.countDocuments({ sensor: "TESTE" })
```

![A3 insert](evidencias/A3g_insert_teste.png)

![A3 teste antes](evidencias/A3h_teste_antes.png)

Logo depois de gravar a contagem era 1. Uns dois minutos depois rodei de novo e deu 0. O TTL apagou o alerta gravado como data e continuou ignorando os 100000 gravados como texto.

![A3 teste depois](evidencias/A3i_teste_depois.png)

### A4. Consulta coberta

Consulta da questão:

```js
db.movimentacoes.find(
  { tipo: "inspecao", terminal: "T4" },
  { _id: 0, container: 1 }
)
```

Criei um índice com os dois campos do filtro e o campo que a consulta devolve:

```js
db.movimentacoes.createIndex({ tipo: 1, terminal: 1, container: 1 })
```

![A4 indice](evidencias/A4a_indice.png)

Com `_id: 0` na projeção:

![A4 coberta](evidencias/A4b_coberta.png)

Sem o `_id: 0`, ou seja, `{ container: 1 }`:

![A4 sem _id 0](evidencias/A4c_sem_id0.png)

| | com _id: 0 | sem _id: 0 |
|---|---|---|
| Estágios | PROJECTION_COVERED, IXSCAN | PROJECTION_SIMPLE, FETCH, IXSCAN |
| totalKeysExamined | 15945 | 15945 |
| totalDocsExamined | 0 | 15945 |
| nReturned | 15945 | 15945 |

Com `_id: 0` a consulta é coberta. Tudo o que ela precisa está dentro do índice: tipo e terminal para filtrar e container para devolver. O banco lê só as chaves do índice e monta a resposta com elas, sem abrir nenhum documento. Por isso aparece PROJECTION_COVERED e totalDocsExamined fica 0.

Quando eu tiro o `_id: 0`, o MongoDB volta a devolver o `_id`, porque ele vem por padrão em toda consulta. Só que o `_id` não está nesse índice. Então, para cada uma das 15945 chaves, o banco precisa ir no documento buscar o `_id`. Aparece o estágio FETCH e os documentos lidos sobem de 0 para 15945. A consulta deixa de ser coberta só por causa de um campo que eu nem tinha pedido.

O tempo ficou igual nos dois (28 ms) porque os dados cabem na memória do meu computador. Numa coleção maior, ou quando os documentos não estão em memória, cada FETCH é uma leitura a mais no disco, e é aí que a consulta coberta faz diferença.

## Parte B - Aggregation Pipeline

Para o explain do aggregate criei a função `resumoAgg`, parecida com a `resumo` da Parte A. O código está no consultas_mongodb.js.

### B1. Relatório gerencial

Pipeline, usando só os estágios vistos nos Encontros 7 e 8:

```js
const pipelineB1 = [
  // 1. Filtra primeiro, para o índice poder ser usado e menos documentos seguirem
  { $match: { classe: "Granel", ts: { $gte: ISODate("2026-06-01") } } },
  // 2. Agrupa por terminal e calcula os totais
  { $group: {
      _id: "$terminal",
      total_movimentacoes: { $sum: 1 },
      peso_total: { $sum: "$peso_kg" },
      peso_medio: { $avg: "$peso_kg" },
      maior_peso: { $max: "$peso_kg" }
  } },
  // 3. Ordena pelo peso total e fica com os 3 maiores
  { $sort: { peso_total: -1 } },
  { $limit: 3 },
  // 4. Troca o _id pelo campo terminal
  { $project: { _id: 0, terminal: "$_id", total_movimentacoes: 1, peso_total: 1, peso_medio: 1, maior_peso: 1 } }
]
db.movimentacoes.aggregate(pipelineB1)
```

![B1 pipeline](evidencias/B1a_pipeline.png)

Resultado:

![B1 resultado](evidencias/B1b_resultado.png)

| terminal | total_movimentacoes | peso_total | peso_medio | maior_peso |
|---|---|---|---|---|
| T5 | 10001 | 160953101 | 16093,70 | 30995 |
| T3 | 10058 | 159915134 | 15899,30 | 30999 |
| T1 | 9882 | 159030430 | 16092,94 | 30995 |

O $sort e o $limit vêm depois do $group de propósito. Só dá para saber quais são os 3 maiores depois de somar o peso de todos os terminais.

Explain antes de criar o índice:

```js
db.movimentacoes.explain("executionStats").aggregate(pipelineB1)
```

![B1 sem indice](evidencias/B1c_explain_sem_indice.png)

Criei um índice com os dois campos do $match. Classe vem primeiro porque é igualdade e a data depois porque é faixa:

```js
db.movimentacoes.createIndex({ classe: 1, ts: 1 })
```

![B1 indice](evidencias/B1d_indice.png)

Explain depois do índice:

![B1 com indice](evidencias/B1e_explain_com_indice.png)

| | sem índice | com índice { classe: 1, ts: 1 } |
|---|---|---|
| Estágios | GROUP, COLLSCAN | GROUP, FETCH, IXSCAN |
| totalKeysExamined | 0 | 49610 |
| totalDocsExamined | 400000 | 49610 |
| Saída do GROUP (nReturned) | 5 | 5 |
| executionTimeMillis | 116 | 72 |

Quantos documentos entraram no $group. Na minha versão do MongoDB o $match e o $group rodam juntos dentro do motor de busca, por isso o explain mostra GROUP direto em cima do FETCH. Tudo o que o FETCH lê e passa adiante entra no GROUP, então entraram 49610 documentos. O nReturned 5 é a saída do GROUP, um grupo para cada terminal, antes do $sort e do $limit deixarem só 3.

Para confirmar, contei os documentos que passam no filtro do $match:

```js
db.movimentacoes.countDocuments({ classe: "Granel", ts: { $gte: ISODate("2026-06-01") } })
```

![B1 contagem](evidencias/B1f_contagem_match.png)

Deu 49610, o mesmo número. Sem o índice o banco lia as 400 mil movimentações para descartar a maioria. Com o índice ele vai direto nas chaves de Granel a partir de junho e só lê os documentos que realmente entram no $group. Nenhuma chave foi lida à toa, porque keys e docs examinados são iguais ao resultado do filtro.

## Diário de bordo

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
