# Prova Prática Integradora - Operação Maré Alta

Banco de Dados NoSQL - 2º Bimestre - Engenharia de Software (6º Semestre) - Unicesumar
Prof. Leonardo Rocha

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

Primeira linha do grafo.cypher (grafo_gerador.js):

```
// BASE_DA_PILHA da sua prova: K8 | EMPRESA SANCIONADA: E2
```

## Ambiente

- MongoDB rodando no contêiner Docker mongo-lab (banco logiporto, coleções movimentacoes e alertas)
- Neo4j rodando no contêiner Docker do Encontro 6
- Windows, comandos executados pelo PowerShell

Observação: no PowerShell o operador `<` não funciona, então os scripts foram executados com `cmd /c "docker exec -i mongo-lab mongosh < logiporto_gerador.js"`. Para o grafo, o script foi copiado para dentro do contêiner e executado com `--file --quiet`, porque pela entrada padrão o mongosh gravava os prompts junto no arquivo .cypher.

## Uso de IA

Utilizei IA (Claude) como apoio na resolução, com autorização do professor. Todas as consultas, métricas e resultados foram executados no meu próprio ambiente, com o dataset gerado a partir do meu RA.

## Estrutura

- README.md - parâmetros, ambiente e diário de bordo
- previsoes.md - previsões registradas antes de executar cada questão
- (demais arquivos serão adicionados conforme as questões forem resolvidas)

## Diário de bordo

- Primeira tentativa de rodar o gerador falhou porque o contêiner mongo-lab estava parado. Resolvido com `docker start mongo-lab`.
- Primeira geração do grafo.cypher saiu com os prompts do mongosh misturados ao Cypher. Gerei de novo copiando o script para o contêiner e usando `--file --quiet`.
