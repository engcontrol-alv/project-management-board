# Frente 2 — Relatório Executivo A4 Personalizável (`PrintableReport`) — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax. TDD: cada Task começa pelo teste que falha.

**Goal:** Trocar o "Imprimir A4" (que imprimia a aba aberta) por um compositor de Relatório Executivo A4: presets, seções marcáveis, notas da emissão, carimbo técnico e um container de impressão dedicado (`.executive-print-report`) que sai igual qualquer que seja a aba de fundo.

**Architecture:** Inalterada (ARCHITECTURE §3). O relatório consolida os 7 domínios, então mora na camada **app** (`src/app/report/`), a única que pode ler a lógica e as projeções de todos os módulos. Ele lê `AnalysisContext` (`snapshot`, `derived`, `config`) e `computeDashboard`, e **não grava nada**: é projeção, como o painel Geral. A seleção de seções e os presets são funções puras em `report-config.ts`.

**Tech Stack:** a mesma. **Nenhuma dependência nova.**

**Spec:** `SPEC.md` §6.1a (painel), §10 (impressão A4), §9 (indicadores e alertas). Indicadores de situação por bolinha (`RagDot`), sem texto de cor.

Caminhos e comandos relativos à raiz do app (`_bakeoff/3-ruflo`).

---

## Decisões (o pedido deixa lacunas)

| # | Ponto | Decisão adotada | Tasks |
|---|---|---|---|
| R1 | Onde mora o relatório | `src/app/report/` (camada app). A UI de um módulo não pode importar a lógica de outro (`eslint-plugin-boundaries`), e o relatório cruza todos. `ModuleView.reportSection` continua sem uso | 1–5 |
| R2 | Seleção inicial ao abrir | Preset **Resumo de Diretoria** (`overview`, `finances`, `risks`). Os alertas fazem parte de `overview` | 1, 2 |
| R3 | Módulos desligados | Seção desmarcada e **desabilitada**, com "(módulo desligado)". Os presets nunca as marcam. `overview` e `governance` estão sempre disponíveis (Governança é obrigatória). `resources_stakeholders` fica disponível se Recursos **ou** Partes Interessadas estiver ligado, e mostra só a parte ligada | 1, 2 |
| R4 | Curva S "vetorial" | SVG próprio (polylines PV/EV/AC com legenda), sem Recharts: o Recharts é lazy, mede o contêiner com `ResizeObserver` e anima, o que falha ou sai incompleto no momento do `window.print()`. Sem LB → mensagem | 4 |
| R5 | Fluxo de emissão | **Pré-visualizar** abre o relatório em tela cheia (página de 210 mm, barra `no-print` com "Imprimir" e "Fechar"). **Gerar e Imprimir A4** abre a mesma pré-visualização e chama `window.print()` depois de renderizar. O relatório é um portal no `body`; na impressão, `body:has(.executive-print-report) > #root` some e só o relatório sai | 3, 5 |
| R6 | Notas da emissão | Texto livre de até 600 caracteres, no topo do relatório. Fica só na sessão (não entra nos dados do projeto nem no JSON; sem mudança de schema) | 2, 3 |
| R7 | Carimbo técnico | Código, Projeto, Cliente, Gerente, Data de status, Data de emissão (hoje, pelo relógio do app), LB vigente e bolinha da situação geral | 3 |
| R8 | Conteúdo por seção | `overview`: resumo, situação dos domínios (bolinhas) e alertas ativos · `governance`: identidade do contrato, fases, cláusula de multa e mudanças · `scope`: pacotes de trabalho e entregáveis com TAF/TAC · `schedule`: marcos **contratuais** (LB, previsão, desvio, status) e caminho crítico · `finances`: EVM (BAC, PV, EV, AC, CPI, SPI, EAC), provisão de multa, orçado × comprometido × realizado e Curva S · `risks`: contagem por faixa, grade P×I e riscos abertos **Alto/Crítico** · `resources_stakeholders`: pico de carga por recurso, comunicações atrasadas/sem data e fornecedores com entrega atrasada | 4 |

## Tasks

### Task 1 — Configuração pura das seções (`report-config.ts`)
- [x] Teste: 7 seções na ordem; disponibilidade por módulos ligados; preset Diretoria = overview+finances+risks; Completo = todas as disponíveis; seções indisponíveis nunca são marcadas.
- [x] Implementar `REPORT_SECTIONS`, `availableSections(enabled)`, `presetSelection(preset, enabled)`.

### Task 2 — Compositor (modal)
- [x] Teste: "Imprimir A4" no cabeçalho abre o modal (portal no body); preset inicial Diretoria; marcar/desmarcar; preset Completo marca todas as disponíveis; módulo desligado desabilitado e desmarcado; notas digitadas; "Gerar" sem seção fica desabilitado.
- [x] Implementar `ReportComposer`.

### Task 3 — Container de impressão + carimbo
- [x] Teste: "Gerar e Imprimir A4" renderiza `.executive-print-report` fora do `#root`, com carimbo, notas e só as seções marcadas, e chama `window.print()` uma vez; "Pré-visualizar" não chama; "Fechar" remove; vale de qualquer aba.
- [x] Implementar `PrintableReport` e ligar no `ProjectLayout`.

### Task 4 — Conteúdo das seções
- [x] Teste: cada seção mostra seus dados (bolinhas sem texto de cor, TAF/TAC, marcos contratuais, EVM, provisão, Curva S SVG, riscos críticos, carga e comunicações).
- [x] Implementar `report-sections.tsx`.

### Task 5 — CSS de impressão
- [x] `@page { size: A4 portrait; margin: 12mm }`, `print-color-adjust: exact`, `break-inside: avoid` em cartões, SVG e linhas, `.no-print`/modais ocultos, `#root` oculto quando há relatório.
- [x] Teste: as regras estão na folha de estilo (teste do design system).

### Task 6 — E2E + bateria
- [x] E2E: importar o projeto de referência → abrir outra aba → "Imprimir A4" → preset → desmarcar uma seção → notas → "Gerar e Imprimir A4" → `window.print` chamado; mídia `print` mostra só o relatório com o carimbo; PDF A4 gerado.
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run e2e` — 0 erros, 0 avisos.
