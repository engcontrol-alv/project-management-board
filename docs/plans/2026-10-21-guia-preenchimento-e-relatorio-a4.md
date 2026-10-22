# Guia Rápido de Ordem de Preenchimento + Relatório Executivo A4 — Plano

**Data:** 2026-10-21 · **Camada:** app (`src/app/ui`, `src/app/report`) · **Design:** vercel-geist, bolinhas de status, nome "Finanças", campos nulos ocultos.

## Parte A — Guia de Preenchimento do Projeto (aba Geral)

### Decisões

- **A1. Onde vive.** Lógica pura em `src/app/ui/fill-guide.ts` (`fillGuideSteps(snapshot, enabled)`) e componente `src/app/ui/FillGuide.tsx`, renderizado na `GeralPage` logo abaixo do cabeçalho. Camada app: lê o snapshot inteiro sem violar as fronteiras dos módulos.
- **A2. Os 6 passos, em ordem:**

| # | Domínio | Concluído automaticamente quando… | Atalho |
|---|---|---|---|
| 1 | Governança | há uma data do projeto (aprovação ou encerramento previsto) **e** um dado do contrato (cliente ou valor do contrato) | Abrir Governança → `/projeto/governance/abertura-encerramento` |
| 2 | Escopo | há ao menos 1 pacote de trabalho na EAP **e** 1 entregável | Abrir Escopo → `/projeto/scope/eap` |
| 3 | Cronograma | há Linha de Base salva (necessária para PV e SPI) | Abrir Cronograma → `/projeto/schedule/marcos` |
| 4 | Finanças | há item de orçamento com valor orçado > 0 (gera o BAC) | Abrir Finanças → `/projeto/finances/orcamento` |
| 5 | Riscos | há ao menos 1 risco registrado | Abrir Riscos → `/projeto/risks/registro` |
| 6 | Rotina de atualização | — (rotina contínua, não tem "concluído") | Abrir EAP → e Abrir Finanças → |

- **A3. Módulos desligados** na Governança não aparecem no guia; o contador considera só os passos iniciais visíveis.
- **A4. Contador:** `N/M passos iniciais concluídos` (passos 1–5).
- **A5. Recolher/expandir:** "Ocultar guia" recolhe; o botão discreto "Guia de Preenchimento" reabre. Preferência por projeto em `localStorage` (`pmb.guia-preenchimento.<projectId>` = `aberto` | `oculto`), com `try/catch` (sem storage, vale o padrão). Sem preferência salva, o guia inicia aberto, ou recolhido quando todos os passos iniciais estão concluídos.
- **A6. Impressão:** o guia tem `.no-print` e nunca entra no `.executive-print-report` (o relatório não renderiza a `GeralPage`).

### Tasks (TDD)

- [x] T1. Testes unitários de `fillGuideSteps` (projeto vazio, projeto completo, módulo desligado) → vermelho → implementação → verde.
- [x] T2. Testes de componente na `GeralPage`: passos marcados, atalhos navegam, ocultar/reabrir persistindo no `localStorage`, recolhido por padrão com 5/5.
- [x] T3. CSS `.fill-guide` no tema vercel-geist.
- [x] T4. E2E: projeto novo → guia 0/5, atalho leva à aba, ocultar persiste após recarregar.

## Parte B — Emissor de Relatório Executivo A4

Já implementado no commit `56d4885` e alinhado na revisão R9–R11 de `2026-10-21-relatorio-executivo-a4.md` (compositor em portal, presets "Resumo de Diretoria (1-2 págs)" e "Relatório Técnico Completo", 7 seções, notas, módulos desligados desmarcados, carimbo sem metadados vazios, Finanças no Modo Essencial, `@page A4 portrait 12 mm`, `print-color-adjust: exact`, `break-inside: avoid`, `.no-print`).

- [x] T5. Teste: o relatório impresso nunca contém o Guia de Preenchimento.

## Parte C — Verificação

`npm test`, `npm run lint`, `npm run build`, `npm run e2e` com 0 erros. Commit somente após confirmação do usuário.
