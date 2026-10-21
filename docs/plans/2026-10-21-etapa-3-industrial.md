# Etapa 3 — Frente 1: Engenharia Industrial e Fechamento da SPEC — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax. TDD: cada Task começa pelo teste que falha.

**Goal:** Fechar o SPEC (§15 Etapa 3: matriz 5×5 com "Reavaliar", caso 27) e acrescentar três capacidades de engenharia industrial: rastreabilidade TAF/FAT e TAC/SAT nos entregáveis físicos, cláusula de multa contratual por atraso com provisão automática e checksum SHA-256 no backup JSON. O projeto de referência dos testes (automação industrial) exercita tudo.

**Architecture:** Inalterada (ARCHITECTURE §3): `shared → core → module-logic → project → analytics → commands → platform → module-ui/registers → app`. Campos novos entram nos schemas Zod dos módulos; a mudança de formato sobe `SCHEMA_VERSION` 2 → 3 com migração única usada pela importação **e** pelo upgrade do Dexie (§6.5). Cálculos cruzados (multa = Governança × Cronograma × LB × Finanças; alerta de testes = Escopo) só em `analytics/`. O checksum é uma função pura assíncrona em `project/serialization.ts` sobre Web Crypto (`crypto.subtle.digest`).

**Tech Stack:** a mesma da Etapa 2 + design system Vercel Geist. **Nenhuma dependência nova.**

**Spec:** `SPEC.md` §6.1, §6.2c, §6.3a, §6.4, §6.5, §7.3, §8.4, §9.2, §10.1, §13 (casos 4, 27), §14 (critérios 2, 3), §15. `ARCHITECTURE.md` §5–§8.

Caminhos e comandos relativos à raiz do app (`_bakeoff/3-ruflo`).

> **Alinhamento com o código atual (2026-10-21).** Dois ajustes posteriores à implementação mudaram o contexto deste plano:
> - **Projeto Demo removido do app.** Não há mais botão no cabeçalho nem na tela inicial; o sistema opera só com projetos criados pelo usuário ou importados via JSON. O antigo `src/app/demo/demo-project.ts` virou o projeto de referência dos testes em `src/test/demo-project.ts`, e os E2E o geram para "hoje" e o importam pela tela inicial (`e2e/support.ts`, `importReferenceProject`).
> - **Mudanças dentro de Governança.** As solicitações de mudança saíram do Escopo: seção **Governança › Mudanças** (`/projeto/governance/mudancas`), coleção `governance.changeRequests` (tabela `governance_changeRequests`). A troca de tabela subiu os dados para a versão 4 (`TABLE_RENAMES[3]`); a migração v2 → v3 desta etapa (D10) continua valendo como passo intermediário.

---

## Decisões (o pedido diverge do SPEC ou deixa lacunas)

| # | Ponto | SPEC diz | Pedido diz | Decisão adotada | Tasks |
|---|---|---|---|---|---|
| D1 | Trocar 3×3 ↔ 5×5 com riscos avaliados | confirmação; **níveis são limpos**, riscos ficam "Reavaliar" (§6.5, caso 27) | "sem perda de dados" | Confirmação mantida; os níveis **não** são limpos: são convertidos (3→5: 1→1, 2→3, 3→5; 5→3: 1–2→1, 3→2, 4–5→3) e a avaliação original é guardada em `risk.reassess = { scale, probability, impact }` ("Reavaliar"). Voltar à escala original antes de reavaliar **restaura os níveis exatos**. Desmarcar "Reavaliar" no formulário (ou mudar P/I) confirma a nova avaliação. Matriz, filtros e RAG continuam funcionando com os níveis convertidos | 1, 2, 3 |
| D2 | Faixas 5×5 | 1–4 Baixo, 5–9 Moderado, 10–16 Alto, 20–25 Crítico; limites configuráveis (§8.4) | igual | Padrões por escala `{3: 2/4/6, 5: 4/9/16}`; trocar a escala no formulário preenche as faixas padrão da nova escala; `high` precisa ficar abaixo de `escala²` | 1, 3 |
| D3 | Quando o TAF/TAC se aplica | §6.2c só tem o tipo de documento "Relatório de teste (TAF/TAC/TAP/TDS)" | equipamentos, painéis, software de CLP/IHM e sistemas industriais | Campos `fatStatus/fatDate/satStatus/satDate` só na categoria **Entregável físico / serviço**; novo tipo `Software de CLP/IHM`. Tipos `Equipamento`, `Painel/Sistema` e `Software de CLP/IHM` começam com `Pendente`; os demais com `Não Aplicável`. Registros antigos migram com `Não Aplicável` (nenhum alerta falso) | 4, 5, 6 |
| D4 | O que é "Entregue/Aceito" para o alerta | status físicos: `Não iniciado`, `Em execução`, `Concluído`, `Aceito pelo cliente`, `Cancelado` | Entregue/Aceito com TAF ou TAC Reprovado/Pendente | `Aceito pelo cliente` exige TAF **e** TAC aprovados (ou com ressalvas); `Concluído` (entregue) exige o TAF — o TAC acontece em campo depois da entrega. `Reprovado` → alerta vermelho; `Pendente` → amarelo. `Não Aplicável` nunca alerta | 6 |
| D5 | Data do teste | — | "status e data" | `Aprovado`, `Aprovado com Ressalvas` e `Reprovado` exigem a data; `Pendente` aceita data prevista opcional; `Não Aplicável` não tem data | 4 |
| D6 | Quais marcos sofrem multa e qual é o prazo contratual | marco `Contratual` (§6.3a); data na LB vem da LB vigente | "marcos contratuais atrasados na data de status" | Só marcos do tipo `Contratual`. Prazo = data do marco na **LB vigente** (o compromisso assinado); sem LB, a data manual; sem nenhum dos dois, o marco fica fora. Dias de atraso = (data real, se concluído; senão o maior entre previsão e data de status) − prazo, se > 0. O valor é **provisão** (atraso real ou previsto) | 7, 8 |
| D7 | Base e período da multa | — | % diário/semanal sobre o valor do contrato ou do marco; teto em % | Cláusula opcional em Governança: `% por período`, período `Diário`/`Semanal` (semana ou fração = ⌈dias/7⌉), base `Valor do contrato` (campo da cláusula, moeda base) ou `Valor do marco` (Σ receitas não canceladas vinculadas ao marco, exige Custos & Finanças), teto `% do valor do contrato` opcional sobre o total. Arredondamento half-even nos centavos | 7, 8, 9 |
| D8 | Onde configurar a multa | §6.1 não tem "definições contratuais" | "Nas definições contratuais (Governança)" | Nova seção **Governança › Contrato** (`/projeto/governance/contrato`), gravando no perfil de Governança (`profile.latePenalty`) | 9 |
| D9 | Checksum: sobre o quê e o que fazer quando não confere | §7: import recusa JSON inválido sem alterar nada | "avisar se adulterado; retrocompatível" | `checksumSha256` (hex minúsculo) = SHA-256 do JSON **canônico** (chaves ordenadas) do arquivo inteiro sem o próprio campo. Validado antes da migração; divergente → **recusa** com "Integridade SHA-256 não confere: o arquivo foi alterado ou corrompido depois da exportação." (nada muda). Sem o campo → aceito (arquivos antigos), e a prévia mostra "sem checksum (exportação antiga)" | 10, 11 |
| D10 | Versão de dados | — | — | `SCHEMA_VERSION` 3: v2 → v3 acrescenta `reassess: null` aos riscos e `fatStatus/satStatus = 'Não Aplicável'`, datas `null` aos entregáveis físicos; perfil ganha `latePenalty` desativada. Dexie `version(3)` com a mesma `migrateRows`; tabelas da v2 congeladas em `STORES_V2` | 2, 4, 7 |
| D11 | SPEC §15 | Etapa 3 = só 5×5 | Etapa 3 Frente 1 = 5 itens | Ao final, atualizar §6.2c (TAF/TAC), §6.5 (D1), §6.1 (contrato), §7 (checksum) e a tabela §15 | 13 |

---

## Global Constraints

Valem todas as das Etapas 1 e 2, mais:

- Status de teste exatamente: `Não Aplicável`, `Pendente`, `Aprovado`, `Aprovado com Ressalvas`, `Reprovado`.
- Rótulos 5×5: probabilidade `Muito baixa`, `Baixa`, `Média`, `Alta`, `Muito alta`; impacto `Muito baixo`, `Baixo`, `Médio`, `Alto`, `Muito alto`. Os 3×3 continuam `Baixa/Média/Alta` e `Baixo/Médio/Alto`.
- Nenhum módulo grava em outro: a troca de escala grava parâmetros de Riscos **e** os próprios riscos (mesmo módulo), numa única transação.
- Toda escrita continua comando puro → `Changeset` → validação por schema + integridade (níveis fora da escala são erro de integridade).
- Dinheiro em centavos inteiros; percentuais da cláusula como número decimal (0,1 = 0,1%).
- UI: tokens Geist; RAG e status sempre com texto; códigos, datas e valores em `.tb-mono`.

## Review Focus

1. **Migração v2 → v3 nas duas portas** (importação da fixture v2 + banco Dexie criado na v2). Tasks 2 e 12.
2. **Round-trip 3 → 5 → 3 sem perda** (D1) e RAG idêntico nas duas escalas para riscos equivalentes. Task 3.
3. **Checksum**: exportar → importar passa; alterar 1 caractere de um valor → recusa sem alterar nada; arquivo antigo sem checksum → aceito. Tasks 10, 11 e 12.
4. **Multa nunca grava nada**: é projeção derivada; marco concluído no prazo = 0; teto respeitado; base "Valor do marco" com Finanças desligado = n/a. Task 8.

---

## Tasks

### Task 1 — Riscos: modelo com escala 3 | 5
**Files:** `src/modules/risks/model/risk.ts`, `domain/exposure.ts`, `manifest.ts`, testes `domain/exposure.test.ts`, `model/risk.test.ts`.
- [x] Teste: `levelsFor(5)` = 1..5; rótulos 5×5; `riskSchema` aceita nível 5 e `reassess`; settings aceitam `scale: 5` com faixas 4/9/16 e recusam `high ≥ 25`; `bandOf` nas duas escalas (5×5: 4 Baixo, 5 Moderado, 16 Alto, 20 Crítico).
- [x] Implementar: `RISK_SCALES`, `levelsFor`, `levelLabels`, `DEFAULT_BANDS`, nível 1..5, `reassess`.

### Task 2 — Migração v2 → v3 (riscos, entregáveis, perfil)
**Files:** `src/project/migrations.ts`, `src/platform/persistence/db.ts`, fixture `src/project/__fixtures__/export-v2.json`, testes de migração e do banco.
- [x] Teste: fixture v2 importa e ganha `reassess: null`, campos de teste `Não Aplicável` e `latePenalty` desativada; banco v2 abre na v3 com os dados migrados.
- [x] Implementar: `ROW_STEPS[2]`, `migrateRows(table, rows, from, to)`, `STORES_V2`, `db.version(3).upgrade`.

### Task 3 — Troca de escala com confirmação e "Reavaliar"
**Files:** `src/modules/risks/domain/rescale.ts`, `src/commands/project.ts` (`updateModuleSettings`), `src/project/integrity.ts` (nível fora da escala), `src/modules/risks/ui/RisksPage.tsx`, `RiskMatrixPage.tsx`, `src/app/ui/ConfigPage.tsx`.
- [x] Teste (domínio): 3→5 converte e guarda o original; 5→3 de um risco convertido restaura exatamente; risco não avaliado fica intacto; risco reavaliado (sem `reassess`) converte a partir dos níveis atuais.
- [x] Teste (comando): `updateModuleSettings('risks', {scale:5,…})` grava parâmetros e riscos convertidos numa só transação; nível 4 com escala 3 é erro de integridade.
- [x] Teste (UI): Configurações › Riscos troca para 5×5 → diálogo "N risco(s) avaliado(s) serão convertidos…" → confirmar → matriz 5×5 com 25 células, rótulos 5×5, filtro por célula e badge "Reavaliar"; formulário do risco aceita 1–5 e desmarcar "Reavaliar" confirma.
- [x] Implementar.

### Task 4 — Entregáveis: campos TAF/FAT e TAC/SAT
**Files:** `src/modules/scope/model/deliverable.ts`, `domain/acceptance.ts`, testes.
- [x] Teste: físico aceita os 5 status; `Aprovado`/`Aprovado com Ressalvas`/`Reprovado` sem data → erro; `Não Aplicável` com data → erro; documentação não tem os campos; tipo `Software de CLP/IHM` existe; `acceptanceIssues(d)` (D4).
- [x] Implementar.

### Task 5 — Formulário e tabela de entregáveis
**Files:** `src/modules/scope/ui/DeliverablesPage.tsx`, teste de UI.
- [x] Teste: campos de teste só na categoria física; tipo Painel/Sistema começa `Pendente`; trocar para documentação remove os campos (aviso); coluna "TAF / TAC" com o status em texto e indicador "Testes pendentes/reprovados" no entregável inconsistente.
- [x] Implementar.

### Task 6 — Alerta "entregue sem teste de aceitação"
**Files:** `src/analytics/alerts/deliverable-acceptance.ts`, `alerts/index.ts`, teste.
- [x] Teste: `Aceito pelo cliente` + TAC `Reprovado` → vermelho "ENT-009 aceito pelo cliente com TAC/SAT Reprovado"; `Concluído` + TAF `Pendente` → amarelo; `Concluído` + TAC `Pendente` → nada; `Não Aplicável` → nada; Escopo desligado → regra não roda.
- [x] Implementar.

### Task 7 — Governança: cláusula de multa por atraso
**Files:** `src/modules/governance/model/profile.ts`, `domain/penalty.ts`, testes.
- [x] Teste (schema): desativada aceita campos vazios; ativada exige % > 0, período e base; base contrato ou teto exigem valor do contrato; teto entre 0 e 100.
- [x] Teste (domínio `latePenalty`): diário 0,1% × 4 dias sobre R$ 1.500.000,00 = R$ 6.000,00; semanal 0,5% com 8 dias = 2 semanas; teto 10% limita o total; marco sem atraso = 0.
- [x] Implementar.

### Task 8 — Provisão derivada
**Files:** `src/analytics/penalties.ts`, `src/analytics/derive.ts` (`derived.penalty`), teste.
- [x] Teste: só marcos `Contratual`; prazo pela LB vigente (sem LB, data manual); atraso = real ou max(previsão, status) − prazo; base marco = Σ receitas vinculadas; base marco com Finanças desligado = n/a; cláusula desativada ou Cronograma desligado → `null`.
- [x] Implementar.

### Task 9 — Telas: Governança › Contrato, Resumo financeiro e Geral
**Files:** `src/modules/governance/ui/ContractPage.tsx`, `view.tsx`, `src/modules/finances/ui/SummaryPage.tsx`, `src/app/ui/GeralPage.tsx`, testes de UI.
- [x] Teste: formulário grava a cláusula; Resumo mostra o KPI "Multa por atraso (provisão)" e a tabela por marco (código, prazo, dias, multa); Geral mostra a provisão e os marcos que a geram; sem cláusula → "Cláusula de multa não configurada".
- [x] Implementar.

### Task 10 — Checksum SHA-256 na exportação
**Files:** `src/project/serialization.ts` (`canonicalJson`, `sha256Hex`, `withChecksum`, `verifyChecksum`), teste.
- [x] Teste: `withChecksum` acrescenta `checksumSha256` de 64 hex; mesmo conteúdo com chaves em outra ordem dá o mesmo hash; `verifyChecksum`: `ok` / `ausente` / `divergente`.
- [x] Implementar.

### Task 11 — Importação valida o checksum
**Files:** `src/project/serialization.ts` (`parseImportFile` assíncrono), `src/app/ui/DataMenu.tsx`, testes de UI.
- [x] Teste: exportação baixada contém checksum; importar o próprio arquivo → prévia com "Integridade verificada (SHA-256)"; arquivo alterado → "Importação recusada" com a mensagem de integridade e nada muda; arquivo antigo sem checksum → prévia com "sem checksum (exportação antiga)".
- [x] Implementar.

### Task 12 — Projeto de referência + E2E
**Files:** `src/test/demo-project.ts`, `src/test/demo-project.test.ts`, `e2e/support.ts`, `e2e/etapa3.spec.ts` (originalmente `src/app/demo/`; o Projeto Demo saiu do app depois — ver o alinhamento no topo).
- [x] Projeto de referência: painéis `Painel/Sistema` com TAF `Pendente`; `ENT-009 Software de CLP e IHM — release da célula piloto` (`Software de CLP/IHM`, `Aceito pelo cliente`, TAF `Aprovado com Ressalvas`, TAC `Reprovado`) → alerta; treinamento `Não Aplicável`; cláusula 0,1%/dia sobre R$ 1.500.000,00, teto 10% → provisão de R$ 12.000,00 pelo atraso de M-002 e M-005 (4 dias cada; o atraso se propaga pelo caminho crítico).
- [x] E2E: (a) 3×3 → 5×5 → 3×3 sem perda pela tela; (b) TAF/TAC no entregável e alerta no Geral; (c) multa no Resumo e no Geral; (d) exportar → importar com checksum; arquivo adulterado recusado; fixture antiga aceita.

### Task 13 — Documentação e bateria
- [x] Atualizar `SPEC.md` (§6.1, §6.2c, §6.5, §7, §8.4, §13 caso 27, §15) e `ARCHITECTURE.md` (§6.5 v3, §7 checksum).
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run e2e` — tudo verde.
