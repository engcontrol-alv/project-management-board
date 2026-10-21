# SPEC — Project Management Board (V1) — Consolidada

> Especificação funcional da V1. O "como construir" está em [ARCHITECTURE-FINAL.md](ARCHITECTURE-FINAL.md); o primeiro plano de implementação em [PLAN-ETAPA-1.md](PLAN-ETAPA-1.md).
> Consolida três propostas: **SP** (Superpowers + Karpathy), **ECC** (Everything Claude Code) e **RF** (Ruflo). A origem de cada regra aparece entre colchetes quando ajuda a rastrear: `[SP]`, `[ECC]`, `[RF]`, `[final]` (decisão desta consolidação).
> Itens marcados **[decisão do arquiteto]** foram escolhidos na consolidação sem decisão explícita do usuário e podem ser revistos (lista em §16).

## 1. Propósito

Painel executivo para gerenciar **um projeto** de engenharia/industrial (fases de Conceituação a Garantia, testes TAF/TAC/TAP/TDS, importação de componentes, múltiplas moedas), organizado nos **7 domínios de desempenho do PMBOK 8**: Governança, Escopo, Cronograma, Finanças, Riscos, Recursos e Partes Interessadas.

O protótipo atual (React 18 + Recharts, arquivo único, ~17 cadastros em `localStorage`) valida a estética e o vocabulário, mas:
- liga registros por **texto livre** (`projeto`, `responsavel`, `dependencias`), então um atraso não chega a Finanças nem à Governança;
- guarda números, datas e dinheiro como texto;
- marca caminho crítico à mão e não calcula EVM;
- tem cadastros fora dos 7 domínios (Processos, Pontos de Integração).

A V1 conecta os módulos **por ID**, calcula cronograma, avanço físico e valor agregado a partir dos **pacotes de trabalho**, e deriva os indicadores de Governança por funções puras.

## 2. Metas, não-metas e anti-metas

### 2.1 Metas da V1
1. Os 7 módulos, com Governança obrigatória e os demais ligáveis/configuráveis por projeto.
2. Caminho crítico, Curva S, SPI e CPI **calculados** (nunca digitados).
3. Linha de base versionada, que só muda por **mudança aprovada**.
4. Dados apenas no navegador (IndexedDB), com exportar/importar JSON e "apagar tudo".
5. Exemplos de preenchimento que orientam sem nunca virar dado.
6. Relatório imprimível com seleção de módulos.

### 2.2 Não-metas da V1 (fora agora; a arquitetura não pode impedir)
- Portfólio (vários projetos, consolidação, sobrealocação entre projetos). `[SP][RF]` — ECC colocava na V1; adiado.
- Multiusuário, login, perfis (responsável, analista, auditor, cliente).
- Backend, API, sincronização entre dispositivos.
- Dependências além de Término→Início, lags, calendários de dias úteis, nivelamento de recursos.
- Gates de fase e Status Reports com KPIs congelados `[ECC][RF]` — o relatório imprimível cobre a necessidade na V1.
- Criptografia do arquivo exportado, exportação Excel, histórico de auditoria campo a campo `[RF]`.
- Importador do `localStorage` do protótipo e catálogo dos 19 riscos do relatório original `[ECC]`.
- Cotação automática de moedas; gerador de PDF próprio (usa impressão do navegador).

### 2.3 Anti-metas (se acontecer, a V1 falhou mesmo "funcionando")
- Dado real/sensível embutido no código ou carregado sem ação do usuário.
- Dado de exemplo misturado a dado real — em lista, KPI, gráfico, relatório ou exportação.
- Um módulo alterando dados de outro automaticamente.
- Linha de base alterada sem mudança aprovada.
- Dados saindo do navegador sem ação explícita do usuário (sem rede, sem CDN).
- **Processos**: nenhuma tela, rota, entidade, campo ou vínculo. Removido completamente.
- Complexidade de MS Project/Primavera na V1.

## 3. Usuário e contexto

- **Um usuário**, sem login, navegador desktop (gerente de projeto/PMO). Responsivo é desejável; desktop é o alvo.
- Interface em **pt-BR**; datas `DD/MM/AAAA`; números e moeda no padrão pt-BR.

## 4. Conceitos

| Conceito | Definição |
|---|---|
| **Projeto** | Unidade com os 7 módulos, configuração e linhas de base. **Um por navegador** na V1. |
| **Módulo** | Um dos 7 domínios. Governança é obrigatória. |
| **Registro** | Linha de um cadastro, com **ID interno estável** (UUID) e **código legível** (`MUD-003`). |
| **Código** | Sequencial por tipo, **nunca reutilizado**, mesmo após exclusão `[RF]`. |
| **Plano atual** | Durações, datas e valores editáveis no dia a dia. |
| **Linha de base (LB)** | Fotografia congelada do plano (v1, v2…), referência para PV, SPI e desvios. |
| **Solicitação de mudança (MUD)** | Registro em **Governança** (seção Mudanças) com impacto em escopo, prazo e custo; única forma de criar LB v2+. |
| **Exemplo** | Registro ilustrativo exibido na UI; nunca salvo, contado ou exportado. |
| **Data de status** | Data de corte dos cálculos. Padrão: hoje; editável no projeto. |
| **n/a** | Indicador sem base de cálculo (divisão por zero, módulo desligado, sem LB). Nunca `NaN`/`Infinity`. |

## 5. Dados, privacidade e exemplos

1. A aplicação **não traz dados reais**. Num navegador limpo, a tela inicial oferece **Criar projeto** ou **Importar projeto**; nada é gravado no IndexedDB até uma dessas ações `[SP]`.
2. Dados reais entram só por digitação ou importação.
3. Gravação automática no IndexedDB a cada alteração confirmada (formulário salvo).
4. Aviso permanente: "Seus dados ficam apenas neste navegador. Exporte regularmente."
5. Ações explícitas:
   - **Exportar** (`.json`).
   - **Importar** `.json`: validado (formato, versão, esquema, integridade). Inválido é recusado com mensagem específica e **nada muda**. Com projeto existente, mostra prévia (nome, contagens) e pede confirmação de substituição, sugerindo exportar antes.
   - **Apagar dados locais**: exige digitar `APAGAR`; deixa o IndexedDB vazio.
6. **Exemplos** `[SP]`:
   - Cadastro vazio mostra 1–3 exemplos com selo "Exemplo" e estilo esmaecido, explicando cada campo.
   - "Usar como modelo" abre o formulário de **novo** registro com os valores do exemplo (ID novo, vínculos vazios); ao salvar vira dado real.
   - Exemplos são genéricos e fictícios, escritos para a V1 — não reaproveitam o relatório do protótipo.
   - Com ao menos um registro real, os exemplos somem ("Ver exemplos" reabre).

## 6. Os 7 módulos

Convenções: "→ X" é vínculo por ID a um registro do módulo X. Todo campo **Responsável** aponta para uma **pessoa** do cadastro de Partes Interessadas (§6.7). Enumerações são fixas na V1, salvo onde indicado "lista configurável".

### 6.1 Governança (obrigatória)

Tela inicial do projeto. Contém painel, definições do projeto e quatro registros simplificados. **Não contém**: não conformidades, processos, pontos de integração, gates, status reports.

**a) Painel executivo**
- RAG geral (§9) e por módulo ativo, cada um com motivo textual (nunca só cor).
- KPIs: % físico, SPI físico, SPI e CPI monetários, EAC, marcos atrasados (total e críticos), riscos por faixa, mudanças pendentes, **orçado × comprometido × realizado**.
- Alertas derivados (§9.2), cada um com atalho para o registro de origem ou para "Abrir solicitação de mudança".
- Resumo das definições: normas aplicáveis, template de documentação, modalidade/faturamento da estratégia de aquisições.

**b) Abertura do projeto (ficha)** — registro único `[SP][ECC]`
- Nome, código (até 12 caracteres), data de início, cliente (→ organização com papel Cliente), patrocinador (→ pessoa), gerente (→ pessoa), objetivo, justificativa, fase atual (lista configurável), status (`Em iniciação`, `Em execução`, `Em encerramento`, `Encerrado`, `Suspenso`), data de aprovação da abertura.

**c) Encerramento** — registro único
- Data prevista, data real, pendências contratuais/financeiras (texto), termo de encerramento assinado (sim/não), lições registradas (**derivado**: existe ≥ 1 lição).
- Status `Encerrado` na ficha exige termo assinado, data real e pendências vazias `[RF]`. Com o projeto `Encerrado`, toda a aplicação fica **somente leitura**; "Reabrir projeto" volta a `Em execução` `[RF]`.

**d) Qualidade — Normas aplicáveis** (apenas a lista de normas)
- Código (ex.: `ISO 9001:2015`, `NBR 5410`, `NR-10`), tipo (`ISO`, `ABNT/NBR`, `NR`, `IEC`, `Padrão do cliente`, `Regulatório/Órgão`, `Outra`), título, observação.
- Sem não conformidades, ações corretivas ou auditorias.

**e) Documentos — Template de documentação** (apenas o indicador)
- `Interno` ou `Externo (cliente)`; observação opcional (ex.: nome do padrão do cliente).
- Valor padrão herdado pelos entregáveis de documentação (§6.2c), que podem sobrescrevê-lo `[ECC]`.

**f) Estratégia de aquisições** (apenas a política; os itens contratados ficam em Finanças)
- Modalidade (`Compra direta`, `Cotação com ≥ 3 fornecedores`, `Concorrência`, `Contrato-quadro`, `Fornecedor indicado pelo cliente`, `Outra`).
- Faturamento (`Direto ao cliente`, `Próprio/Revenda`, `Misto`).
- Critérios de seleção (múltipla: `Preço`, `Prazo`, `Qualificação técnica`, `Homologação do cliente`, `Nacional/Importado`, `Histórico`).
- Alçada de aprovação (valor, opcional) e observações.
- Com faturamento `Direto ao cliente`, Finanças sinaliza que as contratações **não compõem receita própria** `[ECC]`.

**g) Reuniões** (simplificado)
- Código, tipo (`Status semanal`, `Comitê mensal`, `Revisão de fase`, `Outra`), data, participantes (→ partes interessadas, múltiplo), decisões (texto), ações geradas (texto), status (`Agendada`, `Realizada`, `Cancelada`).
- `Realizada` exige data ≤ hoje `[RF]`.

**g2) Contrato — multa por atraso** (opcional, Etapa 3)
- Cláusula: aplicar (sim/não), % por período, período (`Diário`, `Semanal` = semana ou fração), base (`Valor do contrato` informado na cláusula, ou `Valor do marco` = Σ receitas não canceladas vinculadas ao marco, exige Finanças), teto em % do valor do contrato (opcional), texto da cláusula.
- Vale para marcos do tipo `Contratual`; regra de cálculo em §8.6. A provisão aparece no Resumo de Finanças e na aba Geral.

**h) Lições aprendidas** (simplificado)
- Código, título, tipo (`Ponto de melhoria`, `Boa prática`), categoria (`Técnica`, `Metodologia`, `Comercial/Cliente`, `Fornecedores/Aquisição`, `Equipe/Pessoas`, `Comunicação`, `Outro`), contexto, recomendação, data, responsável.
- Sem vínculo com processos.

### 6.2 Escopo

**a) Requisitos** `[SP][ECC][RF]` (mantidos: alimentam o RAG de Escopo)
- Código, descrição, categoria (`Funcional`, `Técnico`, `Regulatório/Normativo`, `Comercial/Contratual`, `Qualidade`, `Outro`), origem (`Cliente`, `Comercial`, `Normativo/Regulatório`, `Interno`, `Outro`), prioridade (`Alta`, `Média`, `Baixa`), status de validação (`Não validado`, `Em validação`, `Validado`), status de atendimento (`Não iniciado`, `Em desenvolvimento`, `Atendido`, `Não atendido (gap)`), critério de aceite, responsável, data da última validação, entregáveis que atendem (→ entregáveis, múltiplo).
- `Validado` exige data da última validação.
- Situação derivada, nesta ordem: `Não atendido (gap)` → **Gap crítico**; `Validado` + `Atendido` → **Concluído**; `Não validado` → **Não validado**; demais → **Pendente**.

**b) EAP / WBS** — base de todos os cálculos de prazo e valor agregado `[SP]`
- Código hierárquico (`1`, `1.2`, `1.2.3`), até 4 níveis, nome, pai (→ agrupador), tipo:
  - **Agrupador**: só organiza; datas e % são agregados dos filhos.
  - **Pacote de trabalho** (folha): duração planejada (dias corridos, inteiro ≥ 0), predecessores (→ outros pacotes, Término→Início, sem lag), "não começar antes de" (opcional), início real, término real, % físico (0–100), responsável, fase.
- Datas planejadas **não são digitadas**: são calculadas (§8.1).
- Consistência `[RF]`: término real exige início real e não pode ser anterior a ele; **% = 100 ⇔ término real preenchido**; agrupador não tem predecessores nem duração.
- Predecessor que cria ciclo é recusado com mensagem; predecessor precisa ser pacote de trabalho.
- Excluir agrupador com filhos ou pacote usado como predecessor é bloqueado, listando onde é usado.

**c) Lista de entregáveis** — categorizada `[ECC][SP]`
- Código, nome, **categoria** (obrigatória) e **tipo** dependente da categoria:

| Categoria | Tipos |
|---|---|
| **Documentação de engenharia** (prevista) | Memorial descritivo, Memorial de cálculo, Diagrama (P&ID, unifilar, elétrico), Desenho técnico, Especificação técnica, Folha de dados, Manual de operação/manutenção, Relatório de teste (TAF/TAC/TAP/TDS), Data book, Outro |
| **Documentação de gerenciamento de projeto** | Cronograma, Plano de projeto, Ata de reunião, Relatório de status, Relatório de medição, Termo de abertura, Termo de encerramento, Outro |
| **Entregável físico / serviço** | Equipamento, Painel/Sistema, Software de CLP/IHM, Instalação/Montagem, Comissionamento, Treinamento, Serviço de campo, Outro |

- Pacote de trabalho que o produz (→ EAP, opcional), marco associado (→ Cronograma, opcional), requisitos atendidos (vista reversa de §6.2a), data prevista, data real, responsável, exige aprovação do cliente (sim/não).
- Só documentações: revisão (`0`, `A`, `B`…) e **template** (`Interno`/`Externo (cliente)`, padrão = Governança §6.1e, sobrescrevível).
- Status por categoria `[ECC]`:
  - Documentações: `Não iniciado`, `Em elaboração`, `Em revisão interna`, `Emitido ao cliente`, `Comentado`, `Aprovado`, `Cancelado`.
  - Físico/Serviço: `Não iniciado`, `Em execução`, `Concluído`, `Aceito pelo cliente`, `Cancelado`.
- Só físicos/serviços: **TAF/FAT** (Teste de Aceitação em Fábrica) e **TAC/SAT** (Teste de Aceitação em Campo), cada um com status (`Não Aplicável`, `Pendente`, `Aprovado`, `Aprovado com Ressalvas`, `Reprovado`) e data. Executado (`Aprovado`, `Aprovado com Ressalvas`, `Reprovado`) exige data; `Pendente` aceita a data prevista; `Não Aplicável` não tem data. `Equipamento`, `Painel/Sistema` e `Software de CLP/IHM` começam `Pendente`; os demais tipos, `Não Aplicável` (Etapa 3).
- Coerência dos testes: `Aceito pelo cliente` exige TAF e TAC aprovados (ou com ressalvas); `Concluído` (entregue) exige o TAF — o TAC acontece em campo depois. Incoerência gera alerta (§9.2).
- Trocar a categoria de um entregável limpa tipo, revisão, template, status e testes incompatíveis (o formulário avisa).
- Indicador derivado: % entregues por categoria (`Aprovado`/`Aceito pelo cliente` ÷ total não cancelado).

**d) Controle de mudanças** — em **Governança › Mudanças** (movido do Escopo; dados versão 4) `[ECC][final]`
- Código, título, descrição, justificativa, solicitante (→ PI), data da solicitação, categorias afetadas (múltipla: `Escopo`, `Cronograma`, `Custo`, `Qualidade`, `Contratual`, `Técnica`), impacto em escopo (texto + pacotes e entregáveis afetados), **impacto em prazo (dias, inteiro; negativo = antecipação)**, **impacto em custo (valor em moeda base; negativo = economia)** `[RF]`, nível (`Baixo`, `Médio`, `Alto`), status, aprovador (→ PI), data da decisão, responsável pela implementação.
- Máquina de estados `[RF]`:
  - `Solicitada` → `Em análise` | `Cancelada`
  - `Em análise` → `Aprovada` | `Rejeitada` | `Cancelada`
  - `Aprovada` → `Implementada` | `Cancelada`
  - `Rejeitada`, `Implementada`, `Cancelada` são finais.
- `Aprovada` e `Rejeitada` exigem aprovador e data da decisão.
- `Implementada` só por "Aplicar à linha de base" (§7.3) quando já existe LB; antes da LB inicial, `Aprovada → Implementada` é manual (não há LB a revisar).
- A mudança registra o impacto; quem ajusta o plano atual (durações, valores) é o usuário, nos formulários.

### 6.3 Cronograma (exige Escopo)

**a) Marcos**
- Código, nome, fase, tipo (`Interno`, `Contratual`, `Faturamento`, `Teste (TAF/TAC/TAP/TDS)`, `Outro`), predecessores (→ pacotes; o marco ocorre quando todos terminam), data manual (obrigatória se não houver predecessores), data real, responsável.
- Previsão = maior término dos predecessores; sem predecessores = data manual. Data na LB vem da LB vigente.
- Situação derivada: `Concluído` (tem data real), `No prazo`, `Atenção` (0 < desvio ≤ tolerância, padrão 5 dias), `Atrasado` (desvio > tolerância, ou previsão vencida sem data real).
- **Crítico: derivado** — algum predecessor no caminho crítico. Nunca marcado à mão.

**b) Gantt** — somente leitura
- Linhas = EAP (agrupadores recolhíveis) + marcos (losango). Barra do plano atual sobre barra cinza da LB; críticos em destaque; linha vertical na data de status; escala semana/mês.

**c) Curva S**
- Com Finanças ativo e BAC > 0: PV × EV × AC acumulados (moeda base), por semana.
- Sem Finanças: % físico planejado (LB) × % físico realizado, ponderados por duração.
- Sem LB: mensagem "Defina a linha de base para ver a Curva S."

**d) Caminho crítico** — lista de pacotes críticos com folga total.

### 6.4 Finanças

Valores em centavos na moeda do item; totais sempre na **moeda base** do projeto.

**a) Linhas de orçamento** (custos e receitas que não são contratações)
- Código, descrição, tipo (`Custo`, `Receita`), natureza (`CAPEX`, `OPEX`), categoria (`Mão de obra`, `Logística`, `Marco contratual/Faturamento`, `Contingência`, `Outro`), moeda, taxa para a moeda base (obrigatória se moeda ≠ base), valor orçado, valor realizado, data prevista, data real, status (`Planejado`, `Em andamento`, `Realizado`, `Em disputa`, `Cancelado`), pacote (→ EAP, opcional), marco (→ Cronograma, opcional — receitas de faturamento), parte interessada relacionada (→ PI, opcional), responsável.
- `Realizado` exige valor e data reais. "Atrasado" é **derivado** (data prevista vencida e status `Planejado`/`Em andamento`) `[RF]`.

**b) Contratações (aquisições)** — entidade própria `[ECC][final]`
- Código, descrição, **tipo** (`Produto`, `Serviço`), natureza (`CAPEX`, `OPEX`), **fornecedor (→ Parte Interessada do tipo Organização com papel `Fornecedor` ou `Prestador de serviço` — obrigatório)**, origem (`Nacional`, `Importado` + país), moeda + taxa, pacote (→ EAP, opcional), marco que depende da entrega (→ Cronograma, opcional), criticidade (`Alta`, `Média`, `Baixa`), responsável.
- **Três valores**: **orçado** (previsto), **comprometido** (pedido/contrato emitido), **realizado** (faturado/pago).
- **Status da contratação**: `A solicitar`, `Em cotação`, `Pedido emitido`, `Contratado`, `Cancelado`.
- **Status da entrega**: `Não iniciado`, `Em produção`, `Em trânsito`, `Em desembaraço aduaneiro`, `Recebido`, `Serviço em execução`, `Serviço concluído`.
- Datas: solicitação, prazo de entrega previsto, data de recebimento/conclusão (`Recebido`/`Serviço concluído` exige a data).
- Regras: comprometido > 0 exige status `Pedido emitido` ou `Contratado`; contratação `Cancelada` sai do orçado e do comprometido, mas o realizado (já pago) continua contando.
- Contratações e linhas de orçamento são **somadas sem vínculo entre si** — não há "contratação consome linha de orçamento", para não contar o mesmo custo duas vezes **[decisão do arquiteto]**.

**c) Resumo orçado × comprometido × realizado** — por natureza (CAPEX/OPEX), por categoria e total; **saldo livre** = Σ por item de custo de `orçado − max(comprometido, realizado)` (linhas de orçamento não têm comprometido: usa só o realizado). Saldo negativo aparece em vermelho.

**d) Fluxo de caixa** — **derivado** (sem cadastro próprio): previsto × realizado por mês, custos e receitas separados, a partir das datas das linhas e contratações.

**e) Contingência** — soma das linhas de categoria `Contingência`, consumo (realizado) e saldo; comparada à soma do valor monetário esperado dos riscos abertos (§6.5) `[ECC]`.

**f) Valor agregado (EVM)** — BAC, PV, EV, AC, SPI, CPI, CV, SV, EAC, ETC, VAC (§8.2). Mostra "% do custo orçado não vinculado a pacotes" (entra nos totais, fica fora do EVM).

### 6.5 Riscos
- Código (`R-001`), título, ameaça/oportunidade, categoria (lista configurável), descrição, causa raiz, probabilidade (nível), impacto (nível), exposição (derivada, §8.4), tipo de resposta (ameaças: `Evitar`, `Mitigar`, `Transferir`, `Aceitar`, `Escalar`; oportunidades: `Explorar`, `Melhorar`, `Compartilhar`, `Aceitar`, `Escalar`), ação de resposta, responsável, status (`Identificado`, `Em monitoramento`, `Em mitigação`, `Materializado`, `Encerrado`), data da próxima revisão, observações.
- Quantitativos opcionais `[ECC][RF]`: probabilidade (%), impacto em custo, impacto em prazo (dias) → valor esperado = prob.% × impacto.
- Vínculos opcionais: pacotes, entregáveis, marcos, contratações, partes interessadas.
- `Em mitigação` exige tipo de resposta e ação. Risco sem probabilidade ou impacto = "Não avaliado", fora da matriz.
- Mudar o tamanho da matriz (3×3 ↔ 5×5) com riscos avaliados exige confirmação; os riscos ficam "Reavaliar" `[RF]`. **Sem perda de dados (Etapa 3, decisão do usuário):** os níveis são convertidos (3→5: 1→1, 2→3, 3→5; 5→3: 1–2→1, 3→2, 4–5→3, o que preserva a faixa dos 9 pares 3×3) e a avaliação anterior fica guardada; voltar à escala original antes de reavaliar restaura os níveis exatos. Desmarcar "Reavaliar" (ou mudar P/I) confirma a avaliação.
- Telas: registro; matriz P × I (clique filtra); exposição por categoria.

### 6.6 Recursos
- **Recurso**: nome, tipo (`Pessoa interna`, `Pessoa terceirizada`, `Equipe`, `Equipamento`), função, competência e nível, capacidade (% de dedicação, padrão 100), custo por dia (opcional, moeda base), pessoa (→ PI, para pessoas), organização (→ PI organização, para terceirizados).
- **Alocação**: recurso, pacote (→ EAP, opcional), %, início, término, status (`Planejada`, `Ativa`, `Encerrada`). Término ≥ início.
- Capacidade × demanda por semana (soma das alocações que cruzam a semana); acima da capacidade = sobrealocado.
- Custo estimado (custo/dia × dias × %) é **informativo** — não cria linha de orçamento.

### 6.7 Partes Interessadas

**Cadastro básico de pessoas e organizações** — sempre disponível, mesmo com o módulo desligado (todos os campos "Responsável", cliente e fornecedor dependem dele) `[SP]`.
- Tipo: `Pessoa` ou `Organização` (união discriminada).
- Pessoa: nome, cargo, organização (→ organização, opcional), contato.
- Organização: nome/razão social, **papéis** (múltiplo, ≥ 1: `Cliente`, `Fornecedor`, `Prestador de serviço`, `Parceiro`, `Órgão regulador/certificador`, `Concessionária`, `Outro`), CNPJ (opcional, validado), país, contato.
- Ambos: interno/externo.

**Análise (módulo ligado)**
- Interesses/expectativas, poder (`Alto`/`Baixo`), interesse (`Alto`/`Baixo`), postura atual e desejada (`Apoiador`, `Neutro`, `Opositor`), estratégia de engajamento, responsável pelo relacionamento.
- Quadrante derivado: `Gerenciar de perto` (alto/alto), `Manter satisfeito` (poder alto), `Manter informado` (interesse alto), `Monitorar`. Lacuna de engajamento = postura atual ≠ desejada.
- **Plano de comunicação**: informação, destinatários (→ PI, múltiplo), canal, frequência, responsável, próxima data (vencida = "Atrasada").

**Integração com Finanças** (projeção, nunca cópia) `[ECC]`
- A ficha de uma organização fornecedora mostra suas contratações e os totais **orçado / comprometido / realizado**, atrasos de entrega e riscos vinculados.
- A matriz Poder × Interesse destaca fornecedores com comprometido acima de um limite configurável; alerta se estiverem em `Monitorar` ou sem plano de comunicação.
- Uma parte interessada referenciada não pode ser excluída; remover o papel `Fornecedor`/`Prestador de serviço` de uma organização com contratações é bloqueado.

## 7. Integração entre módulos

### 7.1 Princípios
1. Vínculos sempre por **ID**, nunca por texto.
2. **Nenhum módulo grava em outro.** Indicadores e alertas são **projeções derivadas** por funções puras.
3. Excluir registro referenciado é **bloqueado**, com a lista de onde é usado.
4. Módulo desligado: dados e vínculos preservados, ocultos na UI; indicadores dependentes = "n/a" com motivo ("Finanças desligado"); RAG geral ignora "n/a".
5. A **única** gravação que atravessa áreas é a criação de linha de base, sempre por ação explícita do usuário (§7.3).

### 7.2 Mapa de vínculos

| Origem.campo | → Destino | Card. | Obrig. |
|---|---|---|---|
| Pessoa.organização | Organização | N:1 | não |
| Ficha.cliente / patrocinador / gerente | Organização (Cliente) / Pessoa / Pessoa | N:1 | não |
| Reunião.participantes | PI | N:N | não |
| Lição.responsável, todo "responsável" | Pessoa | N:1 | não |
| Requisito.entregáveis | Entregável | N:N | não |
| EAP.pai | EAP (agrupador) | N:1 | não |
| EAP.predecessores | EAP (pacote) | N:N | não |
| Entregável.pacote / marco | EAP (pacote) / Marco | N:1 | não |
| Mudança.pacotes / entregáveis afetados | EAP / Entregável | N:N | não |
| Mudança.solicitante / aprovador / implementador | Pessoa | N:1 | não |
| Marco.predecessores | EAP (pacote) | N:N | não |
| Linha de orçamento.pacote / marco / PI | EAP / Marco / PI | N:1 | não |
| **Contratação.fornecedor** | **Organização (Fornecedor ou Prestador)** | N:1 | **sim** |
| Contratação.pacote / marco | EAP / Marco | N:1 | não |
| Risco.pacotes / entregáveis / marcos / contratações / PI | vários | N:N | não |
| Recurso.pessoa / organização | Pessoa / Organização | N:1 | não |
| Alocação.recurso / pacote | Recurso / EAP | N:1 | sim / não |
| Linha de base.mudança | Mudança | N:1 | não (v1) |

### 7.3 Linha de base
- **LB v1**: botão "Definir linha de base" quando o plano está pronto (sem mudança). Até lá, PV, SPI e desvios = "n/a".
- **Conteúdo**: datas e durações dos pacotes, datas previstas dos marcos, valores orçados das linhas de orçamento e das contratações, lista de entregáveis (código, nome, data prevista), data de término do projeto.
- **LB v2+**: só por "Aplicar à linha de base" numa mudança `Aprovada`. Fotografa o plano atual como nova versão vinculada à mudança e marca a mudança `Implementada` — **numa única transação**.
- Append-only; versões anteriores consultáveis somente leitura. Gantt e Curva S usam a vigente.
- Item criado depois da LB vigente aparece como "fora da linha de base" (PV = 0 para ele) `[RF]`.
- Pacote excluído depois da LB: continua no PV da LB (o trabalho estava planejado) e gera alerta "Pacote da linha de base excluído sem mudança" **[decisão do arquiteto]**.

### 7.4 Exemplo canônico: atraso
Um pacote crítico termina depois do previsto:
1. **Escopo/Cronograma** recalculam datas; o marco dependente fica `Atrasado`; o SPI físico cai.
2. **Finanças** não altera valores; itens ligados ao pacote/marco aparecem "em risco de deslocamento" no fluxo de caixa; contratação crítica cuja entrega prevista é posterior ao marco gera alerta.
3. **Riscos** vinculados são destacados.
4. **Governança** atualiza o RAG e mostra o alerta com atalho "Abrir solicitação de mudança" (em Escopo).

## 8. Regras de cálculo (simples de propósito)

Todas são funções puras, testadas, que recebem a data de status por parâmetro (nunca leem o relógio).

### 8.1 Cronograma (CPM) `[SP]`
- Entrada: pacotes (duração, predecessores TI sem lag, "não começar antes de", datas reais, %), data de início do projeto, data de status.
- Datas em dias corridos, **término inclusivo**: pacote de 5 dias que começa segunda termina sexta; o sucessor começa sábado. Duração 0: término = início; sucessor começa no mesmo dia.
- Passo à frente: `início = max(início do projeto, não-antes-de, dia seguinte ao maior término dos predecessores)`; `término = início + duração − 1`.
- Passo para trás a partir do maior término; folga total = término tarde − término cedo; **crítico = folga 0**.
- Progresso real:
  - Início real substitui o início calculado; término real substitui o término.
  - Pacote **iniciado** e não concluído cuja previsão de término já passou da data de status: término = data de status + ⌈duração × (1 − %)⌉.
  - Pacote **não iniciado** cujo início calculado ficou antes da data de status: é empurrado para começar na data de status.
- Ciclo → resultado de erro com os pacotes do ciclo; nenhuma data é exibida.

### 8.2 Valor agregado
- **BAC do pacote** = Σ orçado (moeda base) das linhas de **custo** e contratações não canceladas vinculadas ao pacote.
- **PV** (na data de status) = BAC distribuído **linearmente** entre início e término **da LB**.
- **EV** = % físico × BAC. **AC** = Σ realizado dos itens de custo vinculados.
- Projeto = soma dos pacotes. `SPI = EV/PV`, `CPI = EV/AC`, `CV = EV−AC`, `SV = EV−PV`, `EAC = BAC/CPI`, `ETC = EAC−AC`, `VAC = BAC−EAC`.
- Divisão por zero → "n/a". Receitas não entram.

### 8.3 % físico e SPI físico
- % físico do projeto: com Finanças e BAC > 0 → `EV/BAC`; senão média do % dos pacotes ponderada pela duração (pacotes de duração 0 não pesam).
- `SPI físico = % físico realizado / % físico planejado na data de status` (planejado linear na LB). Calculado pelo Cronograma, sem depender de Finanças; é o SPI do RAG de Cronograma. O SPI monetário aparece em Finanças.

### 8.4 Exposição ao risco
- Matriz padrão 3×3, configurável para 5×5. Pontuação = nível de probabilidade × nível de impacto.
- Faixas 3×3: 1–2 `Baixo`, 3–4 `Moderado`, 6 `Alto`, 9 `Crítico`. 5×5: 1–4 `Baixo`, 5–9 `Moderado`, 10–16 `Alto`, 20–25 `Crítico`. Limites configuráveis.

### 8.5 Moedas e dinheiro
- Armazenado em inteiros de centavos + código da moeda; taxa decimal informada no item; conversão para a base com arredondamento half-even no fim.
- Entrada aceita "R$", separador de milhar e vírgula decimal; normaliza para centavos `[RF]`.

### 8.6 Multa contratual por atraso (Etapa 3)
- Marcos do tipo `Contratual`. Prazo = data do marco na LB vigente; sem LB, a data manual; sem nenhuma, fora do cálculo.
- Dias de atraso = (data real, se concluído; senão o maior entre previsão e data de status) − prazo, quando > 0. É uma **provisão** (atraso real ou previsto), projeção derivada, nunca gravada.
- Multa do marco = base × % × períodos (dias, ou ⌈dias/7⌉ no semanal), half-even nos centavos. Total limitado pelo teto (% do valor do contrato). Base `Valor do marco` com Finanças desligado = "n/a".

## 9. RAG e alertas

### 9.1 RAG
Cada módulo ativo produz um status; o geral é **o pior** entre eles, ignorando "n/a" (todos "n/a" → geral "n/a").

| Módulo | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Cronograma | SPI físico ≥ 0,95 e nenhum marco crítico atrasado | SPI físico ≥ 0,85 ou marco não crítico atrasado | SPI físico < 0,85 ou marco crítico atrasado |
| Finanças | CPI ≥ 0,95 e comprometido ≤ orçado | CPI ≥ 0,85 ou comprometido > orçado | CPI < 0,85 ou contingência consumida > 100% |
| Riscos | nenhum aberto `Alto`/`Crítico` | algum `Alto` aberto | algum `Crítico` aberto ou `Materializado` |
| Escopo | nenhum requisito com gap | `Não validado` de prioridade Alta, ou gap de prioridade não Alta | gap de prioridade Alta |
| Recursos | nenhuma sobrealocação | sobrealocação ≤ 120% | sobrealocação > 120% |
| Partes Interessadas | — | `Gerenciar de perto` sem plano de comunicação | `Gerenciar de perto` com postura `Opositor` |
| Governança | — | mudança `Solicitada`/`Em análise` há mais de 15 dias | — |

Limites configuráveis por projeto. Sem dados suficientes, o módulo é "n/a" (ex.: Escopo sem requisitos).

### 9.2 Alertas derivados (sem gravação)
| Condição | Alerta | Atalho |
|---|---|---|
| Marco com desvio > 0 em relação à LB | "Marco M-004 previsto 12 dias após a linha de base — considerar solicitação de mudança" | Abrir mudança |
| Mudança parada > N dias | "Mudança MUD-002 aguardando decisão há 18 dias" | Abrir mudança |
| Contratação com entrega prevista após a data do marco que depende dela | "Entrega de CTR-005 ameaça o marco M-003" | Abrir contratação |
| Contratação com comprometido > orçado | "CTR-005 comprometido acima do orçado" | Abrir contratação |
| Valor esperado dos riscos abertos > saldo de contingência | "Reserva de contingência insuficiente" | Abrir Riscos |
| Fornecedor em `Gerenciar de perto` + `Opositor` com contratação crítica | "Fornecedor crítico desengajado" | Abrir PI |
| Entregável de documentação com data prevista vencida e não aprovado | "ENT-010 vencido sem aprovação" | Abrir entregável |
| Pacote da LB excluído | "Pacote da linha de base excluído sem mudança" | Abrir mudança |
| Entregável físico `Aceito pelo cliente` com TAF ou TAC `Pendente`/`Reprovado`, ou `Concluído` com TAF `Pendente`/`Reprovado` | "ENT-009 aceito pelo cliente com TAC/SAT Reprovado" (Reprovado = vermelho; Pendente = amarelo) | Abrir entregável |

Regra que depende de módulo desligado não roda.

## 10. Configuração

### 10.1 Por projeto
- Módulos ligados/desligados (Governança sempre ligado). Desligar não apaga dados.
- Dependências:
  - **Cronograma exige Escopo**: ligar Cronograma liga Escopo; desligar Escopo desliga Cronograma, com aviso.
  - **Finanças sem Cronograma**: orçamento, contratações, fluxo de caixa e contingência funcionam; PV, SPI monetário e Curva S monetária = "n/a"; CPI continua se houver itens vinculados a pacotes.
  - **Contratações não exigem o módulo Partes Interessadas ligado**: o cadastro básico de organizações está sempre disponível `[SP]` (ECC exigia o módulo ligado).
- Parâmetros (validados por esquema; valor inválido volta ao padrão com aviso, sem quebrar `[ECC]`):
  - Governança: limites do RAG, dias para mudança parada (15).
  - Cronograma: fases (Conceituação, Análise, Planejamento de Gestão, Planejamento de Engenharia, Execução, Diligenciamento, Testes, Validação, Serviços, Faturamento, Pagamento, Expedição, Garantia), tolerância de "Atenção" (5 dias), SPI verde ≥ 0,95 / amarelo ≥ 0,85.
  - Finanças: moeda base (BRL), moedas aceitas (BRL, USD, EUR).
  - Riscos: escala 3×3/5×5, faixas, categorias.
  - Partes Interessadas: limite de comprometido para destacar fornecedor.
  - Recursos: limite de sobrealocação para vermelho (120%).
- Fase em uso por algum registro não pode ser excluída da lista sem reatribuição `[RF]`.

### 10.2 Configuração inicial
Novo projeto: todos os módulos ligados, valores padrão acima.

## 11. Relatório imprimível
- O usuário escolhe os módulos (ligados ou com dados) e a data de status.
- Por módulo: KPIs, gráficos principais e tabelas resumidas. Cabeçalho com nome, código, data de status e versão da LB.
- Impressão pelo navegador; A4 retrato com quebra de página entre módulos.

## 12. Identidade visual
Herdada do protótipo: fundo `#f5f7fa`, azul petróleo `#3f6d8f`, IBM Plex Mono (empacotada, sem CDN) para indicadores, códigos e métricas; paleta vermelho/âmbar/dourado/verde/azul/cinza com versões `-soft` para selos. Gráficos em Recharts; Gantt em SVG próprio. RAG sempre com texto, nunca só cor.

## 13. Casos de borda consolidados

| # | Caso | Comportamento | Origem |
|---|---|---|---|
| 1 | Navegador limpo | Tela inicial; IndexedDB não é criado até criar/importar | SP |
| 2 | IndexedDB indisponível ou bloqueado | Tela "Este navegador não permite salvar dados. Use uma janela normal ou outro navegador."; importação para leitura não é oferecida | final |
| 3 | Falha ao gravar (cota) | Transação desfeita, formulário continua aberto com "Não foi possível salvar. Exporte seus dados." | SP |
| 4 | Importar arquivo não-JSON, truncado ou de outro app | Recusa com mensagem específica; nada muda | SP |
| 5 | Importar versão de dados mais nova que a aplicação | "Arquivo gerado por uma versão mais nova (vN; suportada até vM)"; nada muda | SP/RF |
| 6 | Importar com vínculo órfão | **Recusa** listando até 10 problemas (RF removia os vínculos; a consolidação prefere não perder dados em silêncio) | SP |
| 7 | Dados locais corrompidos ao abrir | Tela de recuperação: lista erros, "Exportar dados brutos", "Apagar dados locais" | SP |
| 8 | Ciclo na EAP | Formulário recusa; cálculos mostram erro com os pacotes do ciclo | SP |
| 9 | Pacote não iniciado com início no passado | Reprojetado para a data de status | SP |
| 10 | Pacote atrasado em andamento | Término = status + restante proporcional ao % | SP |
| 11 | Sem pacotes / sem LB / status antes do início | "n/a" e estados vazios, nunca `NaN`/`Infinity` | SP/RF |
| 12 | Pacotes só de duração 0 | % físico = n/a | SP |
| 13 | Excluir registro referenciado | Bloqueado com lista "usado em" | SP |
| 14 | Excluir agrupador com filhos / predecessor de outro | Bloqueado (pai e predecessor contam como vínculo) | SP |
| 15 | Remover papel Fornecedor de organização com contratações | Bloqueado | ECC |
| 16 | Contratação sem fornecedor ou apontando para pessoa | Não salva, mensagem clara | ECC |
| 17 | Comprometido > orçado | Alerta e RAG Finanças amarelo | ECC |
| 18 | Contratação cancelada já paga | Sai de orçado/comprometido; realizado continua | final |
| 19 | Moeda ≠ base sem taxa | Não salva | SP |
| 20 | Faturamento "Direto ao cliente" | Contratações sinalizadas como fora da receita própria | ECC |
| 21 | Mudança com impacto negativo | Aceito (economia/antecipação) | RF |
| 22 | Transição de status de mudança inválida | Opção não aparece; comando recusa | RF |
| 23 | Mudança aprovada antes da LB v1 | Implementada manualmente, sem rebaseline | final |
| 24 | Código de registro excluído | Nunca reutilizado | RF |
| 25 | % = 100 sem término real (ou o contrário) | Validação bloqueia | RF |
| 26 | Troca de categoria do entregável | Campos incompatíveis limpos com aviso | final |
| 27 | Mudar tamanho da matriz de risco | Confirmação; níveis convertidos, riscos ficam "Reavaliar"; voltar à escala restaura | RF |
| 28 | Orçamento = 0 / BAC = 0 | Percentuais e índices "n/a"; desvios só em valor | RF |
| 29 | Item financeiro sem data | Fora do fluxo de caixa, listado em "itens sem data" | RF |
| 30 | Projeto encerrado | Somente leitura; alertas ocultos; "Reabrir" disponível | RF |
| 31 | Settings inválidos no projeto | Volta ao padrão com aviso | ECC |
| 32 | Duas abas abertas | Gravações vão para o mesmo IndexedDB; a outra aba atualiza ao vivo (consulta reativa); conflito de edição simultânea não é tratado na V1 | final |
| 33 | Virada do dia com a aplicação aberta | Data de status "hoje" recalcula na próxima interação | RF |
| 34 | Valor digitado com "R$" e milhar | Normalizado para centavos | RF |
| 35 | Importar arquivo com `checksumSha256` que não confere | Recusa: "Integridade SHA-256 não confere: o arquivo foi alterado ou corrompido depois da exportação."; nada muda. Arquivo sem checksum (exportação antiga) é aceito | Etapa 3 |

## 14. Critérios de aceite da V1
1. Navegador limpo mostra "Criar ou importar projeto" e não cria banco IndexedDB.
2. Exportar e reimportar produz dados idênticos (round-trip).
3. JSON inválido (sintaxe, formato, versão, integridade) é recusado sem alterar nada.
4. Para redes de pacotes conhecidas, datas, folgas e caminho crítico batem com o cálculo manual (casos de teste no repositório).
5. Atrasar um pacote crítico deixa o marco dependente `Atrasado`, o RAG de Cronograma vermelho e a Governança com alerta — sem alterar dados de Finanças.
6. A LB não muda ao editar pacotes; muda apenas por "Aplicar à linha de base" numa mudança `Aprovada`, gerando nova versão; a anterior continua consultável.
7. Desligar Finanças oculta o módulo, CPI vira "n/a", e religar mostra os dados intactos.
8. Contratação sem fornecedor (ou com pessoa como fornecedor) não salva; o fornecedor mostra orçado/comprometido/realizado na sua ficha em Partes Interessadas.
9. O relatório imprime só os módulos selecionados.
10. "Apagar dados locais" deixa o IndexedDB vazio.
11. Governança mostra normas aplicáveis, template de documentação e estratégia de aquisições; não há nenhuma tela, rota ou entidade de Processos.
12. Criar um entregável exige uma das 3 categorias; documentações herdam o template da Governança.

## 15. Entrega em etapas

| Etapa | Conteúdo | Critérios §14 |
|---|---|---|
| 1 | Núcleo (persistência, export/import, apagar, exemplos, configuração de módulos, cadastro básico de pessoas/organizações) + **Escopo** (requisitos, EAP, entregáveis, mudanças) + **Cronograma** + **Governança** (painel, abertura/encerramento, normas, template, estratégia de aquisições, reuniões, lições) + linha de base | 1, 2, 3, 4, 5 (sem Finanças), 6, 10, 11, 12 |
| 2 | **Finanças** (linhas de orçamento, contratações, resumo, fluxo de caixa, contingência, EVM, Curva S monetária) + **Partes Interessadas** completo (análise, comunicação, painel de fornecedor) + **Riscos** (matriz 3×3) + **Recursos** (custo homem-hora, carga semanal) — antecipados da Etapa 3 por decisão do usuário (plano da Etapa 2, D1) | 5, 7, 8 + RAG de Riscos e Recursos |
| 3 | Frente 1 — Engenharia Industrial e fechamento do SPEC: escala 5×5 com "Reavaliar" sem perda de dados (caso 27), TAF/FAT e TAC/SAT nos entregáveis físicos, multa contratual por atraso (§6.1g2, §8.6), checksum SHA-256 no backup JSON (caso 35) — plano `docs/plans/2026-10-21-etapa-3-industrial.md` | 2, 3 (com checksum) |
| 4 | **Relatório** imprimível | 9 |

## 16. Decisões da consolidação e questões em aberto

**Decisões do usuário (esta consolidação):** Processos removido; Qualidade = só normas; Documentos = só indicador de template em Governança + Lista de Entregáveis categorizada em Escopo; Aquisições = política em Governança + contratações em Finanças com orçado/comprometido/realizado e fornecedor por ID; Mudanças em Escopo (depois movidas para Governança, controle integrado de mudanças); Abertura/Encerramento, Reuniões e Lições simplificados em Governança.

**[decisão do arquiteto]** — revisáveis:
1. Requisitos mantidos em Escopo (todas as propostas tinham; alimentam o RAG de Escopo).
2. Contratação é entidade própria, sem vínculo com linha de orçamento (evita dupla contagem).
3. Importação com vínculo órfão é recusada (não "limpa" em silêncio).
4. Gates de fase, Status Reports, histórico de auditoria, criptografia e Excel ficam fora da V1.
5. Pacote da LB excluído continua no PV da LB e gera alerta.
6. IndexedDB indisponível bloqueia o uso em vez de oferecer modo só-memória.

**Questões em aberto (não bloqueiam a Etapa 1):**
1. Limites padrão de RAG (0,95 / 0,85 / 15 dias / 120%) — validar com a prática da área.
2. Calendário de dias úteis: necessário antes do portfólio?
3. Linha de orçamento precisa de "comprometido" (ex.: mão de obra contratada por medição)?
