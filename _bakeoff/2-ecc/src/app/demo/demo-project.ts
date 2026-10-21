import { addDays, type IsoDate } from '@/shared/lib/dates';
import { applyChangeToBaseline, defineInitialBaseline } from '@/commands/baseline';
import { upsertEntity } from '@/commands/entities';
import { newProjectSnapshot, setStatusDate } from '@/commands/project';
import { runCommand, type Command, type CommandContext } from '@/commands/run';
import type { ProjectSnapshot } from '@/project/snapshot';

/**
 * Projeto de demonstração: contrato de engenharia e automação industrial — sistema de monitoramento contínuo
 * de emissões (CEMS) integrado ao SDCD de uma refinaria, nas fases Planejamento → Comissionamento.
 * Montado com os mesmos comandos da interface, para que toda regra de domínio valha também aqui.
 * As datas são relativas a hoje: a obra está sempre no dia 70, em suprimentos, com um atraso de fornecedor.
 */
const TODAY_INDEX = 70;

type Row = Record<string, unknown>;

export function buildDemoSnapshot(ctx: CommandContext): ProjectSnapshot {
  const start = addDays(ctx.today, -TODAY_INDEX);
  const day = (n: number): IsoDate => addDays(start, n);
  /** Contexto "no dia n", para que linhas de base e decisões tenham datas coerentes. */
  const at = (n: number): CommandContext => ({ ...ctx, now: `${day(n)}T12:00:00.000Z`, today: day(n) });

  const created = newProjectSnapshot(
    { name: 'CEMS — Refinaria Atlântica', code: 'CEMS-RA26', startDate: start },
    at(-5),
  );
  if (!created.ok) throw new Error(`Demonstração inválida: ${created.error.join('; ')}`);
  let s = created.value;
  const run = (cmd: Command, c: CommandContext = ctx) => {
    const r = runCommand(s, cmd, c);
    if (!r.ok) throw new Error(`Demonstração inválida: ${r.error.join('; ')}`);
    s = r.value.snapshot;
  };
  const put = (module: string, collection: string, value: Row, c?: CommandContext) => {
    const id = (value.id as string | undefined) ?? ctx.newId();
    run(upsertEntity(module, collection, { code: '', ...value, id }), c);
    return id;
  };
  const update = (module: string, collection: string, current: unknown, patch: Row, c?: CommandContext) =>
    run(upsertEntity(module, collection, { ...(current as Row & { id: string }), ...patch }), c);

  run(setStatusDate(start));

  // Partes interessadas
  const party = (value: Row) => put('stakeholders', 'parties', { contact: '', notes: '', ...value });
  const client = party({ kind: 'Organização', name: 'Refinaria Atlântica S.A.', roles: ['Cliente'], taxId: '', country: 'Brasil', internal: 'Externo' });
  const supplier = party({ kind: 'Organização', name: 'Analítica Instrumentos Ltda.', roles: ['Fornecedor'], taxId: '', country: 'Alemanha', internal: 'Externo' });
  party({ kind: 'Organização', name: 'Montagens Elétricas Sul', roles: ['Prestador de serviço'], taxId: '', country: 'Brasil', internal: 'Externo' });
  const person = (name: string, position: string, internal: 'Interno' | 'Externo', organizationId: string | null = null) =>
    party({ kind: 'Pessoa', name, position, internal, organizationId });
  const manager = person('Mariana Couto', 'Gerente de projeto', 'Interno');
  const sponsor = person('Ricardo Alves', 'Diretor de operações', 'Interno');
  const automation = person('Diego Ramos', 'Engenheiro de automação', 'Interno');
  const quality = person('Fernanda Lima', 'Coordenadora de qualidade', 'Interno');
  const clientEng = person('Paula Nogueira', 'Engenheira de processos', 'Externo', client);
  const supplierRep = person('Jonas Weber', 'Gerente de contas', 'Externo', supplier);

  // EAP — agrupadores e pacotes (término→início, dias corridos)
  const groupNode = (name: string, parentId: string | null = null) =>
    put('scope', 'wbs', {
      name, parentId, kind: 'Agrupador', duration: 0, predecessorIds: [], startNoEarlierThan: null,
      actualStart: null, actualFinish: null, percentComplete: 0, ownerId: null, phase: '',
    });
  const pkgNode = (parentId: string, name: string, duration: number, predecessorIds: string[], ownerId: string, phase: string) =>
    put('scope', 'wbs', {
      name, parentId, kind: 'Pacote de trabalho', duration, predecessorIds, startNoEarlierThan: null,
      actualStart: null, actualFinish: null, percentComplete: 0, ownerId, phase,
    });

  const gMgmt = groupNode('Planejamento');
  const kickoff = pkgNode(gMgmt, 'Kick-off e plano do projeto', 5, [], manager, 'Planejamento de Gestão');
  const pit = pkgNode(gMgmt, 'Plano de inspeção e testes (PIT)', 4, [kickoff], quality, 'Planejamento de Gestão');
  const gEng = groupNode('Engenharia');
  const basic = pkgNode(gEng, 'Engenharia básica', 15, [kickoff], automation, 'Planejamento de Engenharia');
  const spec = pkgNode(gEng, 'Especificação dos analisadores', 8, [basic], automation, 'Planejamento de Engenharia');
  const detail = pkgNode(gEng, 'Engenharia de detalhamento', 20, [basic], automation, 'Planejamento de Engenharia');
  const gSupply = groupNode('Suprimentos');
  const analyzers = pkgNode(gSupply, 'Analisadores importados', 45, [spec], manager, 'Diligenciamento');
  const shelter = pkgNode(gSupply, 'Shelter e painéis elétricos', 25, [detail], manager, 'Diligenciamento');
  const gTests = groupNode('Montagem');
  const integration = pkgNode(gTests, 'Integração no shelter', 15, [analyzers, shelter], automation, 'Execução');
  const taf = pkgNode(gTests, 'Teste de aceitação em fábrica (TAF/FAT)', 5, [integration, pit], quality, 'Testes');
  const assembly = pkgNode(gTests, 'Montagem e interligação em campo', 12, [taf], automation, 'Execução');
  const gField = groupNode('Comissionamento');
  const commissioning = pkgNode(gField, 'Comissionamento e teste de aceitação em campo (TAC/SAT)', 8, [assembly], automation, 'Validação');
  const training = pkgNode(gField, 'Treinamento de operadores', 3, [commissioning], quality, 'Serviços');
  const databook = pkgNode(gField, 'Data book e as built', 5, [commissioning], quality, 'Serviços');

  // Marcos
  const milestone = (name: string, type: string, predecessorIds: string[], phase: string, manualDate: IsoDate | null = null) =>
    put('schedule', 'milestones', { name, type, predecessorIds, phase, manualDate, actualDate: null, ownerId: manager });
  const mKickoff = milestone('Reunião de kick-off', 'Contratual', [], 'Planejamento de Gestão', day(0));
  const mEngineering = milestone('Engenharia aprovada pelo cliente', 'Contratual', [spec, detail], 'Planejamento de Engenharia');
  milestone('Chegada dos analisadores', 'Interno', [analyzers], 'Diligenciamento');
  const mTaf = milestone('TAF/FAT concluído', 'Teste (TAF/TAC/TAP/TDS)', [taf], 'Testes');
  milestone('Faturamento de 60% (pós-TAF)', 'Faturamento', [taf], 'Faturamento');
  const mTac = milestone('Aceite provisório (TAC/SAT)', 'Teste (TAF/TAC/TAP/TDS)', [commissioning], 'Validação');
  milestone('Encerramento do contrato', 'Contratual', [training, databook], 'Garantia');

  // Entregáveis
  const doc = (category: string, type: string, name: string, status: string, extra: Row = {}) =>
    put('scope', 'deliverables', {
      category, type, name, status, revision: '0', template: null, workPackageId: null, milestoneId: null,
      plannedDate: null, actualDate: null, ownerId: manager, clientApproval: false, ...extra,
    });
  const physical = (type: string, name: string, status: string, extra: Row = {}) =>
    put('scope', 'deliverables', {
      category: 'Entregável físico / serviço', type, name, status, workPackageId: null, milestoneId: null,
      plannedDate: null, actualDate: null, ownerId: automation, clientApproval: false, ...extra,
    });
  const ENG = 'Documentação de engenharia';
  const MGMT = 'Documentação de gerenciamento de projeto';
  doc(MGMT, 'Plano de projeto', 'Plano de gerenciamento do projeto', 'Aprovado', { revision: '1', workPackageId: kickoff, plannedDate: day(4), actualDate: day(4), clientApproval: true });
  doc(MGMT, 'Cronograma', 'Cronograma executivo', 'Aprovado', { revision: '2', workPackageId: kickoff, plannedDate: day(4), actualDate: day(5), clientApproval: true });
  const memorial = doc(ENG, 'Memorial descritivo', 'Memorial descritivo do sistema CEMS', 'Aprovado', { revision: '1', workPackageId: basic, plannedDate: day(19), actualDate: day(20), ownerId: automation, clientApproval: true });
  const specDoc = doc(ENG, 'Especificação técnica', 'Especificação técnica dos analisadores', 'Aprovado', { revision: '1', workPackageId: spec, plannedDate: day(27), actualDate: day(29), ownerId: automation, clientApproval: true });
  const pid = doc(ENG, 'Diagrama (P&ID, unifilar, elétrico)', 'P&ID e diagrama unifilar', 'Emitido ao cliente', { revision: 'B', workPackageId: detail, milestoneId: mEngineering, plannedDate: day(39), actualDate: day(42), ownerId: automation });
  doc(ENG, 'Folha de dados', 'Folhas de dados dos analisadores', 'Comentado', { revision: 'A', workPackageId: spec, plannedDate: day(60), ownerId: automation });
  doc(MGMT, 'Relatório de status', 'Relatório mensal de status nº 2', 'Emitido ao cliente', { plannedDate: day(63), actualDate: day(63) });
  doc(ENG, 'Relatório de teste (TAF/TAC/TAP/TDS)', 'Relatório do TAF/FAT', 'Não iniciado', { workPackageId: taf, milestoneId: mTaf, ownerId: quality });
  doc(ENG, 'Relatório de teste (TAF/TAC/TAP/TDS)', 'Relatório do TAC/SAT', 'Não iniciado', { workPackageId: commissioning, milestoneId: mTac, ownerId: quality });
  doc(ENG, 'Data book', 'Data book final', 'Não iniciado', { workPackageId: databook, ownerId: quality });
  const shelterUnit = physical('Painel/Sistema', 'Shelter de analisadores climatizado', 'Em execução', { workPackageId: integration });
  physical('Comissionamento', 'Comissionamento do CEMS', 'Não iniciado', { workPackageId: commissioning });
  const trainingDel = physical('Treinamento', 'Treinamento de 12 operadores', 'Não iniciado', { workPackageId: training, ownerId: quality });

  // Requisitos
  const req = (description: string, category: string, origin: string, priority: string, validationStatus: string, fulfillmentStatus: string, extra: Row = {}) =>
    put('scope', 'requirements', {
      description, category, origin, priority, validationStatus, fulfillmentStatus, acceptanceCriteria: '',
      ownerId: automation, lastValidation: validationStatus === 'Validado' ? day(15) : null, deliverableIds: [], ...extra,
    });
  req('Medir SO₂, NOx, CO, O₂ e material particulado de forma contínua', 'Funcional', 'Cliente', 'Alta', 'Validado', 'Em desenvolvimento', { acceptanceCriteria: 'Leituras estáveis por 72 h no TAC/SAT', deliverableIds: [specDoc, shelterUnit] });
  req('Atender à Resolução CONAMA 382/2006 e à licença de operação', 'Regulatório/Normativo', 'Normativo/Regulatório', 'Alta', 'Validado', 'Em desenvolvimento', { deliverableIds: [memorial] });
  req('Disponibilidade mínima de 95% no teste de disponibilidade (TDS)', 'Técnico', 'Cliente', 'Alta', 'Em validação', 'Não iniciado');
  req('Integração com o SDCD via Modbus TCP', 'Técnico', 'Cliente', 'Média', 'Validado', 'Atendido', { deliverableIds: [pid] });
  req('Documentação em português no padrão do cliente', 'Comercial/Contratual', 'Cliente', 'Média', 'Validado', 'Em desenvolvimento');
  req('Treinamento de operação para 12 operadores', 'Funcional', 'Cliente', 'Baixa', 'Não validado', 'Não iniciado', { deliverableIds: [trainingDel] });

  // Governança
  const g = (collection: string, value: Row) => put('governance', collection, value);
  g('norms', { standard: 'NR-10', type: 'NR', title: 'Segurança em instalações e serviços em eletricidade', notes: '' });
  g('norms', { standard: 'ISO 9001:2015', type: 'ISO', title: 'Sistemas de gestão da qualidade', notes: '' });
  g('norms', { standard: 'CONAMA 382/2006', type: 'Regulatório/Órgão', title: 'Limites de emissão para fontes fixas', notes: '' });
  g('norms', { standard: 'ABNT NBR 5410', type: 'ABNT/NBR', title: 'Instalações elétricas de baixa tensão', notes: '' });
  g('norms', { standard: 'PE-ENG-012', type: 'Padrão do cliente', title: 'Padrão de documentação de engenharia', notes: 'Revisão 4' });
  const meeting = (type: string, n: number, status: string, decisions: string, actions = '') =>
    g('meetings', { type, date: day(n), participantIds: [manager, automation, clientEng], decisions, actions, status });
  meeting('Revisão de fase', 0, 'Realizada', 'Escopo, cronograma e matriz de responsabilidades aprovados.');
  meeting('Comitê mensal', 30, 'Realizada', 'Aprovada a inclusão do analisador de O₂ redundante (MUD-001).');
  meeting('Status semanal', 56, 'Realizada', 'Fornecedor sinaliza atraso no embarque dos analisadores.', 'Diligenciar embarque com o fornecedor.');
  meeting('Comitê mensal', 60, 'Realizada', 'Avaliar replanejamento do TAF.', 'Emitir solicitação de mudança de prazo.');
  meeting('Status semanal', TODAY_INDEX + 7, 'Agendada', '');
  g('lessons', { title: 'Antecipar a compra de analisadores importados', type: 'Ponto de melhoria', category: 'Fornecedores/Aquisição', context: 'Prazo de importação e desembaraço consumiu a folga do caminho crítico.', recommendation: 'Emitir o pedido logo após a especificação preliminar.', date: day(58), ownerId: manager });
  g('lessons', { title: 'Revisar o P&ID em sessão conjunta com o cliente', type: 'Boa prática', category: 'Comunicação', context: 'Uma única sessão substituiu dois ciclos de comentários.', recommendation: 'Agendar revisões conjuntas para documentos críticos.', date: day(44), ownerId: automation });
  update('governance', 'profile', s.governance.profile, {
    charter: {
      clientId: client, sponsorId: sponsor, managerId: manager,
      objective: 'Fornecer e comissionar o sistema de monitoramento contínuo de emissões das caldeiras da unidade.',
      justification: 'Exigência da renovação da licença de operação.',
      currentPhase: 'Diligenciamento', status: 'Em execução', approvalDate: day(-3),
    },
    closure: { plannedDate: day(125), actualDate: null, pendingItems: '', closureTermSigned: false },
    documentTemplate: { template: 'Externo (cliente)', notes: 'Padrão PE-ENG-012 do cliente.' },
    procurementPolicy: {
      model: 'Cotação com ≥ 3 fornecedores', billing: 'Misto',
      criteria: ['Qualificação técnica', 'Prazo', 'Homologação do cliente'], approvalLimitCents: 15_000_000, notes: '',
    },
  });

  // Linha de base v1 e mudança aprovada que gera a v2
  run(defineInitialBaseline(), at(3));
  const cr = (value: Row, c?: CommandContext) =>
    put('scope', 'changeRequests', {
      description: '', justification: '', requesterId: null, categories: [], scopeImpact: '', affectedWorkPackageIds: [],
      affectedDeliverableIds: [], scheduleImpactDays: null, costImpactCents: null, impactLevel: null,
      status: 'Solicitada', approverId: null, decisionDate: null, implementerId: null, ...value,
    }, c);
  const redundancy = cr({
    title: 'Inclusão de analisador de O₂ redundante', description: 'Cliente solicitou redundância na medição de O₂.',
    justification: 'Exigência do órgão ambiental na renovação da licença.', requesterId: clientEng, requestDate: day(8),
    categories: ['Escopo', 'Custo'], scopeImpact: 'Um analisador adicional e revisão da especificação.',
    affectedWorkPackageIds: [spec], scheduleImpactDays: 2, costImpactCents: 8_500_000, impactLevel: 'Médio',
    status: 'Aprovada', approverId: sponsor, decisionDate: day(12), implementerId: automation,
  }, at(12));
  update('scope', 'wbs', s.scope.wbs[spec as never], { duration: 10 }, at(12));
  run(applyChangeToBaseline(redundancy), at(12));

  // Execução até hoje
  const progress = (id: string, patch: Row) => update('scope', 'wbs', s.scope.wbs[id as never], patch);
  const done = (id: string, from: number, to: number) => progress(id, { actualStart: day(from), actualFinish: day(to), percentComplete: 100 });
  done(kickoff, 0, 4);
  done(pit, 5, 9);
  done(basic, 5, 19);
  done(spec, 20, 29);
  done(detail, 20, 42);
  progress(analyzers, { actualStart: day(30), percentComplete: 62, duration: 49 });
  progress(shelter, { actualStart: day(43), percentComplete: 88 });
  update('schedule', 'milestones', s.schedule.milestones[mKickoff as never], { actualDate: day(0) });
  update('schedule', 'milestones', s.schedule.milestones[mEngineering as never], { actualDate: day(43) });

  cr({
    title: 'Prorrogação da entrega dos analisadores', description: 'Fornecedor informou atraso de 4 dias no embarque.',
    justification: 'Atraso na liberação de exportação na origem.', requesterId: supplierRep, requestDate: day(TODAY_INDEX - 20),
    categories: ['Cronograma'], affectedWorkPackageIds: [analyzers], scheduleImpactDays: 4, impactLevel: 'Médio', status: 'Em análise',
  });

  run(setStatusDate(null));
  return s;
}
