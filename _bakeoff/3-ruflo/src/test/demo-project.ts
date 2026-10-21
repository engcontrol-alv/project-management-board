/**
 * Projeto de referência para testes (unitários e E2E): o app não tem mais "Projeto demo" —
 * só projetos criados pelo usuário ou importados via JSON; os E2E importam este como arquivo.
 * Todos os nomes são fictícios. As datas são relativas a `today`, para que o cronograma,
 * a Curva S e os alertas apareçam "em andamento" em qualquer dia.
 */
import type {
  AllocationId,
  BudgetLineId,
  ChangeRequestId,
  CommunicationId,
  ProcurementId,
  ResourceId,
  RiskId,
  DeliverableId,
  LessonId,
  MeetingId,
  MilestoneId,
  NormId,
  PartyId,
  RequirementId,
  WorkPackageId,
} from '@/core/ids';
import { addDays, type IsoDate } from '@/shared/lib/dates';
import type { ChangeRequest, Lesson, Meeting, Norm } from '@/modules/governance';
import type { Deliverable, Requirement, WbsNode } from '@/modules/scope';
import type { Milestone, ScheduleSettings } from '@/modules/schedule';
import type { Communication, Organization, Person, StakeholderAnalysis } from '@/modules/stakeholders';
import type { BudgetLine, Procurement } from '@/modules/finances';
import type { Risk } from '@/modules/risks';
import type { Allocation, Resource } from '@/modules/resources';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import { newProjectSnapshot } from '@/commands/project';
import type { CommandContext } from '@/commands/run';
import type { ProjectSnapshot } from '@/project/snapshot';

/** Dias desde o início do projeto até a data de status. */
const ELAPSED = 50;

const PHASES = ['Planejamento', 'Engenharia', 'Suprimentos', 'Montagem', 'Comissionamento'] as const;

const scheduleSettings = (s: ProjectSnapshot) => s.project.config.modules.schedule?.settings as ScheduleSettings;

const byId =<T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map((i) => [i.id, i])) as Record<T['id'], T>;

export function buildDemoSnapshot(ctx: CommandContext): ProjectSnapshot {
  const start = addDays(ctx.today, -ELAPSED);
  const day = (n: number): IsoDate => addDays(start, n);
  const id = <T extends string>() => ctx.newId() as T;

  const base = newProjectSnapshot(
    { name: 'Demonstração — Automação da Linha de Envase 3', code: 'DEMO-AUT03', startDate: start },
    ctx,
  );

  // ─── Pessoas e organizações ───
  const client = id<PartyId>();
  const supplier = id<PartyId>();
  const pm = id<PartyId>();
  const eng = id<PartyId>();
  const buyer = id<PartyId>();
  const sponsor = id<PartyId>();
  const clientRep = id<PartyId>();
  const integrator = id<PartyId>();
  const distributor = id<PartyId>();
  const person = (pid: PartyId, code: string, name: string, position: string, org: PartyId | null, internal: 'Interno' | 'Externo'): Person => ({
    id: pid, kind: 'Pessoa', code, name, position, organizationId: org, contact: '', internal, notes: '', analysis: null,
  });
  const org = (pid: PartyId, code: string, name: string, roles: Organization['roles']): Organization => ({
    id: pid, kind: 'Organização', code, name, roles, taxId: '', country: 'Brasil', contact: '', internal: 'Externo', notes: '', analysis: null,
  });
  const parties = [
    org(client, 'PI-001', 'Bebidas Exemplo Indústria S.A.', ['Cliente']),
    org(supplier, 'PI-002', 'Painéis Elétricos Fictícios Ltda.', ['Fornecedor']),
    person(pm, 'PI-003', 'Carla Menezes', 'Gerente de projetos', null, 'Interno'),
    person(eng, 'PI-004', 'Rafael Duarte', 'Engenheiro de automação', null, 'Interno'),
    person(buyer, 'PI-005', 'Juliana Prado', 'Coordenadora de suprimentos', null, 'Interno'),
    person(sponsor, 'PI-006', 'Eduardo Lins', 'Diretor de operações', null, 'Interno'),
    person(clientRep, 'PI-007', 'Marcos Tavares', 'Gerente de engenharia da planta', client, 'Externo'),
    org(integrator, 'PI-008', 'Integradora SCADA e Montagens Exemplo Ltda.', ['Prestador de serviço']),
    org(distributor, 'PI-009', 'Distribuidora de Automação Fictícia Ltda.', ['Fornecedor']),
  ];
  // Análise Poder × Interesse e engajamento (módulo Partes Interessadas).
  const analysis = (a: Partial<StakeholderAnalysis>): StakeholderAnalysis => ({
    interests: '', power: 'Alto', interest: 'Alto', currentPosture: 'Apoiador', desiredPosture: 'Apoiador',
    engagementStrategy: '', relationshipOwnerId: pm, ...a,
  });
  const analyses: Record<string, StakeholderAnalysis> = {
    [client]: analysis({ interests: 'OEE da linha e rastreabilidade de lotes', engagementStrategy: 'Comitê mensal e relatório semanal' }),
    [supplier]: analysis({
      interests: 'Prazo de fabricação dos painéis', currentPosture: 'Neutro',
      engagementStrategy: 'Diligenciamento quinzenal na fábrica', relationshipOwnerId: buyer,
    }),
    [sponsor]: analysis({ interests: 'Retorno do investimento e prazo da partida' }),
    [clientRep]: analysis({
      interests: 'Aprovação técnica da engenharia', currentPosture: 'Neutro',
      engagementStrategy: 'Revisões técnicas antes de cada emissão',
    }),
    [integrator]: analysis({ power: 'Baixo', interests: 'Escopo do software CLP/SCADA', relationshipOwnerId: eng }),
    [distributor]: analysis({
      interest: 'Baixo', currentPosture: 'Neutro', interests: 'Pedido do CLP importado',
      engagementStrategy: 'Acompanhar a importação', relationshipOwnerId: buyer,
    }),
  };
  for (const p of parties) p.analysis = analyses[p.id] ?? null;

  // ─── EAP (plano original; o progresso real é aplicado depois da LB) ───
  const w: Record<string, WorkPackageId> = {};
  const wp = (code: string, name: string, o: Partial<WbsNode> = {}): WbsNode => {
    w[code] = w[code] ?? id<WorkPackageId>();
    const parentCode = code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : null;
    return {
      id: w[code]!,
      code,
      name,
      parentId: parentCode ? (w[parentCode] ?? null) : null,
      kind: 'Pacote de trabalho',
      duration: 1,
      predecessorIds: [],
      startNoEarlierThan: null,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
      ownerId: null,
      phase: '',
      ...o,
    };
  };
  const group = (code: string, name: string) => wp(code, name, { kind: 'Agrupador', duration: 0, phase: name });
  const pre = (...codes: string[]) => codes.map((c) => w[c]!);
  const nodes: WbsNode[] = [];
  nodes.push(group('1', 'Planejamento'));
  nodes.push(wp('1.1', 'Kick-off e plano de projeto', { duration: 5, ownerId: pm, phase: 'Planejamento' }));
  nodes.push(wp('1.2', 'Cronograma executivo e EAP', { duration: 4, predecessorIds: pre('1.1'), ownerId: pm, phase: 'Planejamento' }));
  nodes.push(group('2', 'Engenharia'));
  nodes.push(wp('2.1', 'Levantamento de campo e lista de I/O', { duration: 8, predecessorIds: pre('1.1'), ownerId: eng, phase: 'Engenharia' }));
  nodes.push(wp('2.2', 'Arquitetura de controle e rede industrial', { duration: 12, predecessorIds: pre('2.1'), ownerId: eng, phase: 'Engenharia' }));
  nodes.push(wp('2.3', 'Diagramas elétricos e de interligação', { duration: 15, predecessorIds: pre('2.2'), ownerId: eng, phase: 'Engenharia' }));
  nodes.push(wp('2.4', 'Especificação de CLP, remotas e instrumentos', { duration: 10, predecessorIds: pre('2.2'), ownerId: eng, phase: 'Engenharia' }));
  nodes.push(wp('2.5', 'Aprovação da engenharia pelo cliente', { duration: 10, predecessorIds: pre('2.3', '2.4'), ownerId: pm, phase: 'Engenharia' }));
  nodes.push(group('3', 'Suprimentos'));
  nodes.push(wp('3.1', 'Compra de CLP, remotas e instrumentos', { duration: 20, predecessorIds: pre('2.4'), ownerId: buyer, phase: 'Suprimentos' }));
  nodes.push(wp('3.2', 'Fabricação dos painéis e software de CLP/SCADA', { duration: 35, predecessorIds: pre('2.5'), ownerId: buyer, phase: 'Suprimentos' }));
  nodes.push(wp('3.3', 'Inspeção de fabricação dos painéis', { duration: 5, predecessorIds: pre('3.2'), ownerId: eng, phase: 'Suprimentos' }));
  nodes.push(wp('3.4', 'TAF/FAT — teste de aceitação em fábrica', { duration: 5, predecessorIds: pre('3.3'), ownerId: eng, phase: 'Suprimentos' }));
  nodes.push(group('4', 'Montagem'));
  nodes.push(wp('4.1', 'Montagem dos painéis e lançamento de cabos', { duration: 25, predecessorIds: pre('3.4', '3.1'), ownerId: eng, phase: 'Montagem' }));
  nodes.push(wp('4.2', 'Testes de malha e interligação', { duration: 6, predecessorIds: pre('4.1'), ownerId: eng, phase: 'Montagem' }));
  nodes.push(group('5', 'Comissionamento'));
  nodes.push(wp('5.1', 'TAC/SAT — teste de aceitação em campo', { duration: 8, predecessorIds: pre('4.2'), ownerId: eng, phase: 'Comissionamento' }));
  nodes.push(wp('5.2', 'Partida assistida e treinamento da operação', { duration: 3, predecessorIds: pre('5.1'), ownerId: pm, phase: 'Comissionamento' }));
  nodes.push(wp('5.3', 'Data book e as built', { duration: 7, predecessorIds: pre('5.1'), ownerId: eng, phase: 'Comissionamento' }));

  // ─── Marcos ───
  const m = (code: string, name: string, type: Milestone['type'], phase: string, o: Partial<Milestone>): Milestone => ({
    id: id<MilestoneId>(), code, name, phase, type, predecessorIds: [], manualDate: null, actualDate: null, ownerId: pm, ...o,
  });
  const milestones = [
    m('M-001', 'Assinatura do contrato', 'Contratual', 'Planejamento', { manualDate: day(0), actualDate: day(0) }),
    m('M-002', 'Engenharia aprovada pelo cliente', 'Contratual', 'Engenharia', { predecessorIds: pre('2.5') }),
    m('M-003', 'Faturamento de 30% — engenharia', 'Faturamento', 'Engenharia', { predecessorIds: pre('2.5') }),
    m('M-004', 'TAF/FAT aprovado pelo cliente', 'Teste (TAF/TAC/TAP/TDS)', 'Suprimentos', { predecessorIds: pre('3.4') }),
    m('M-005', 'TAC/SAT aprovado e partida da linha', 'Contratual', 'Comissionamento', { predecessorIds: pre('5.1') }),
  ];

  // ─── Entregáveis ───
  const d: Record<string, DeliverableId> = {};
  const doc = (code: string, name: string, category: 'Documentação de engenharia' | 'Documentação de gerenciamento de projeto', type: string, status: string, o: Record<string, unknown> = {}): Deliverable => {
    d[code] = id<DeliverableId>();
    return {
      id: d[code], code, name, category, type, revision: '0', template: null, status,
      workPackageId: null, milestoneId: null, plannedDate: null, actualDate: null, ownerId: eng, clientApproval: true, ...o,
    } as Deliverable;
  };
  const deliverables: Deliverable[] = [
    doc('ENT-001', 'Plano de projeto', 'Documentação de gerenciamento de projeto', 'Plano de projeto', 'Aprovado', {
      workPackageId: w['1.1'], plannedDate: day(5), actualDate: day(5), ownerId: pm, revision: 'A', template: 'Interno',
    }),
    doc('ENT-002', 'Memorial descritivo da arquitetura de automação', 'Documentação de engenharia', 'Memorial descritivo', 'Aprovado', {
      workPackageId: w['2.2'], plannedDate: day(25), actualDate: day(27), revision: 'B',
    }),
    doc('ENT-003', 'Lista de I/O e folhas de dados dos instrumentos', 'Documentação de engenharia', 'Folha de dados', 'Emitido ao cliente', {
      workPackageId: w['2.4'], plannedDate: day(35), revision: 'A',
    }),
    doc('ENT-004', 'Diagramas elétricos e de interligação dos painéis', 'Documentação de engenharia', 'Diagrama (P&ID, unifilar, elétrico)', 'Em revisão interna', {
      workPackageId: w['2.3'], plannedDate: day(ELAPSED + 4),
    }),
    doc('ENT-005', 'Protocolo e relatório de TAF/FAT', 'Documentação de engenharia', 'Relatório de teste (TAF/TAC/TAP/TDS)', 'Não iniciado', {
      workPackageId: w['3.4'],
    }),
    doc('ENT-006', 'Protocolo e relatório de TAC/SAT', 'Documentação de engenharia', 'Relatório de teste (TAF/TAC/TAP/TDS)', 'Não iniciado', {
      workPackageId: w['5.1'],
    }),
  ];
  d['ENT-007'] = id<DeliverableId>();
  deliverables.push({
    id: d['ENT-007'], code: 'ENT-007', name: 'Painéis de automação (CLP e remotas de I/O)', category: 'Entregável físico / serviço',
    type: 'Painel/Sistema', status: 'Não iniciado', workPackageId: w['3.2']!, milestoneId: null,
    plannedDate: null, actualDate: null, ownerId: buyer, clientApproval: true,
    // TAF/FAT previsto para a semana do pacote 3.4; o TAC/SAT acontece em campo, depois da montagem.
    fatStatus: 'Pendente', fatDate: day(100), satStatus: 'Pendente', satDate: null,
  });
  d['ENT-008'] = id<DeliverableId>();
  deliverables.push({
    id: d['ENT-008'], code: 'ENT-008', name: 'Treinamento dos operadores e da manutenção', category: 'Entregável físico / serviço',
    type: 'Treinamento', status: 'Não iniciado', workPackageId: w['5.2']!, milestoneId: null,
    plannedDate: null, actualDate: null, ownerId: pm, clientApproval: false,
    fatStatus: 'Não Aplicável', fatDate: null, satStatus: 'Não Aplicável', satDate: null,
  });
  // Release piloto do software: aceito pelo cliente, mas o TAC/SAT na célula piloto foi reprovado → alerta.
  d['ENT-009'] = id<DeliverableId>();
  deliverables.push({
    id: d['ENT-009'], code: 'ENT-009', name: 'Software de CLP e IHM — release da célula piloto', category: 'Entregável físico / serviço',
    type: 'Software de CLP/IHM', status: 'Aceito pelo cliente', workPackageId: w['2.2']!, milestoneId: null,
    plannedDate: day(40), actualDate: day(46), ownerId: eng, clientApproval: true,
    fatStatus: 'Aprovado com Ressalvas', fatDate: day(38), satStatus: 'Reprovado', satDate: day(47),
  });

  // ─── Requisitos ───
  const req = (code: string, description: string, o: Partial<Requirement>): Requirement => ({
    id: id<RequirementId>(), code, description, category: 'Técnico', origin: 'Cliente', priority: 'Média',
    validationStatus: 'Não validado', fulfillmentStatus: 'Não iniciado', acceptanceCriteria: '', ownerId: eng,
    lastValidation: null, deliverableIds: [], ...o,
  });
  const requirements = [
    req('REQ-001', 'CLP redundante com remotas de I/O em rede PROFINET para a linha de envase', {
      priority: 'Alta', validationStatus: 'Validado', lastValidation: day(20), fulfillmentStatus: 'Em desenvolvimento',
      acceptanceCriteria: 'Comutação sem perda de processo comprovada no TAF/FAT.', deliverableIds: [d['ENT-004']!, d['ENT-005']!],
    }),
    req('REQ-002', 'Painéis com proteções de segurança de máquinas conforme NR-12', {
      priority: 'Alta', validationStatus: 'Validado', lastValidation: day(20), fulfillmentStatus: 'Em desenvolvimento',
      category: 'Regulatório/Normativo', origin: 'Normativo/Regulatório', deliverableIds: [d['ENT-007']!, d['ENT-005']!],
    }),
    req('REQ-003', 'Lista de I/O aprovada pelo cliente antes da fabricação', {
      priority: 'Média', validationStatus: 'Em validação', fulfillmentStatus: 'Atendido', deliverableIds: [d['ENT-003']!],
    }),
    req('REQ-004', 'Integração do SCADA ao MES da planta (OPC UA)', {
      priority: 'Média', validationStatus: 'Validado', lastValidation: day(30), fulfillmentStatus: 'Não atendido (gap)',
      acceptanceCriteria: 'Tags de produção e alarmes publicados no MES e verificados no TAC/SAT.', deliverableIds: [d['ENT-006']!],
    }),
    req('REQ-005', 'Treinamento de 16 horas para operação e manutenção', {
      priority: 'Baixa', origin: 'Comercial', category: 'Comercial/Contratual', validationStatus: 'Validado',
      lastValidation: day(10), fulfillmentStatus: 'Não iniciado', deliverableIds: [d['ENT-008']!],
    }),
  ];

  // ─── Governança ───
  const norms: Norm[] = [
    { id: id<NormId>(), code: 'NRM-001', standard: 'NR-10', type: 'NR', title: 'Segurança em instalações e serviços em eletricidade', notes: '' },
    { id: id<NormId>(), code: 'NRM-002', standard: 'NR-12', type: 'NR', title: 'Segurança no trabalho em máquinas e equipamentos', notes: '' },
    { id: id<NormId>(), code: 'NRM-003', standard: 'IEC 61131-3', type: 'IEC', title: 'Controladores programáveis — linguagens de programação', notes: '' },
    { id: id<NormId>(), code: 'NRM-004', standard: 'IEC 62443', type: 'IEC', title: 'Segurança cibernética de sistemas de automação industrial', notes: '' },
    { id: id<NormId>(), code: 'NRM-005', standard: 'ISO 9001:2015', type: 'ISO', title: 'Sistemas de gestão da qualidade', notes: '' },
  ];
  const meetings: Meeting[] = [
    { id: id<MeetingId>(), code: 'REU-001', type: 'Outra', date: day(0), participantIds: [pm, eng, sponsor, clientRep], decisions: 'Plano de projeto e marcos contratuais aprovados.', actions: 'Emitir o cronograma executivo em 5 dias.', status: 'Realizada' },
    { id: id<MeetingId>(), code: 'REU-002', type: 'Status semanal', date: day(ELAPSED - 1), participantIds: [pm, eng, buyer], decisions: 'Priorizar a revisão dos diagramas de interligação.', actions: 'Reemitir a lista de I/O após os comentários do cliente.', status: 'Realizada' },
    { id: id<MeetingId>(), code: 'REU-003', type: 'Revisão de fase', date: day(ELAPSED + 7), participantIds: [pm, sponsor, clientRep], decisions: '', actions: '', status: 'Agendada' },
  ];
  const lessons: Lesson[] = [
    {
      id: id<LessonId>(), code: 'LIC-001', title: 'Congelar a lista de I/O com o cliente antes do detalhamento dos diagramas',
      type: 'Ponto de melhoria', category: 'Técnica',
      context: 'Inclusão tardia de pontos de I/O pelo cliente atrasou os diagramas de interligação.',
      recommendation: 'Fazer uma revisão formal da lista de I/O ao final do levantamento de campo.',
      date: day(ELAPSED - 5), ownerId: eng,
    },
  ];

  const changeRequests: ChangeRequest[] = [
    {
      id: id<ChangeRequestId>(), code: 'MUD-001', title: 'Inclusão de inspeção por visão na rotuladora',
      description: 'Cliente solicitou câmera de inspeção de rótulos integrada ao CLP da linha.',
      justification: 'Redução de refugo exigida pela auditoria de qualidade do cliente.',
      requesterId: clientRep, requestDate: day(18), categories: ['Escopo', 'Cronograma', 'Custo'],
      scopeImpact: 'Novos pontos de I/O, revisão dos diagramas e das telas SCADA.', affectedWorkPackageIds: pre('2.3', '4.1'),
      affectedDeliverableIds: [d['ENT-004']!], scheduleImpactDays: 12, costImpactCents: 48000000, impactLevel: 'Alto',
      status: 'Em análise', approverId: null, decisionDate: null, implementerId: eng,
    },
    {
      id: id<ChangeRequestId>(), code: 'MUD-002', title: 'Troca dos inversores por modelo homologado',
      description: 'Substituir os inversores de frequência por modelo da lista de homologação do cliente.',
      justification: 'Exigência de padronização de sobressalentes do cliente.', requesterId: clientRep, requestDate: day(40),
      categories: ['Técnica', 'Custo'], scopeImpact: 'Atualização da especificação técnica.',
      affectedWorkPackageIds: pre('2.4'), affectedDeliverableIds: [], scheduleImpactDays: 0, costImpactCents: -1500000,
      impactLevel: 'Baixo', status: 'Aprovada', approverId: sponsor, decisionDate: day(45), implementerId: buyer,
    },
  ];

  // ─── Finanças: linhas de orçamento (custos e receitas) e contratações ligadas a fornecedores ───
  const [, , m3, m4, m5] = milestones.map((x) => x.id);
  const line = (code: string, description: string, o: Partial<BudgetLine>): BudgetLine => ({
    id: id<BudgetLineId>(), code, description, kind: 'Custo', nature: 'OPEX', category: 'Mão de obra', currency: 'BRL',
    rate: null, budgetedCents: 0, actualCents: 0, plannedDate: null, actualDate: null, status: 'Planejado',
    workPackageId: null, milestoneId: null, partyId: null, ownerId: pm, ...o,
  });
  const billing = { kind: 'Receita', category: 'Marco contratual/Faturamento', partyId: client } as const;
  const budgetLines = [
    line('ORC-001', 'Gestão do projeto e planejamento', {
      workPackageId: w['1.1'], budgetedCents: 3_000_000, actualCents: 3_000_000, plannedDate: day(8), actualDate: day(8), status: 'Realizado',
    }),
    line('ORC-002', 'Engenharia de arquitetura de controle', {
      workPackageId: w['2.2'], budgetedCents: 6_000_000, actualCents: 7_400_000, plannedDate: day(24), actualDate: day(25),
      status: 'Realizado', ownerId: eng,
    }),
    line('ORC-003', 'Projeto dos diagramas elétricos e de interligação', {
      workPackageId: w['2.3'], budgetedCents: 7_500_000, actualCents: 9_800_000, plannedDate: day(39), actualDate: day(45),
      status: 'Em andamento', ownerId: eng,
    }),
    line('ORC-004', 'Logística e transporte dos painéis', { category: 'Logística', workPackageId: w['4.1'], budgetedCents: 2_800_000, plannedDate: day(96) }),
    line('ORC-005', 'Comissionamento e partida assistida', { workPackageId: w['5.1'], budgetedCents: 5_500_000, plannedDate: day(130) }),
    line('ORC-006', 'Reserva de contingência (8%)', {
      category: 'Contingência', budgetedCents: 9_000_000, actualCents: 1_200_000, actualDate: day(46), status: 'Em andamento',
    }),
    line('ORC-007', 'Faturamento de 30% — engenharia aprovada', { ...billing, milestoneId: m3, budgetedCents: 45_000_000, plannedDate: day(60) }),
    line('ORC-008', 'Faturamento de 40% — TAF/FAT aprovado', { ...billing, milestoneId: m4, budgetedCents: 60_000_000, plannedDate: day(100) }),
    line('ORC-009', 'Faturamento de 30% — partida da linha', { ...billing, milestoneId: m5, budgetedCents: 45_000_000, plannedDate: day(140) }),
  ];
  const c: Record<string, ProcurementId> = {};
  const proc = (code: string, description: string, supplierId: PartyId, o: Partial<Procurement>): Procurement => {
    c[code] = id<ProcurementId>();
    return {
      id: c[code]!, code, description, type: 'Produto', nature: 'CAPEX', supplierId, origin: 'Nacional', country: '',
      currency: 'BRL', rate: null, workPackageId: null, milestoneId: null, criticality: 'Média', ownerId: buyer,
      budgetedCents: 0, committedCents: 0, actualCents: 0, contractStatus: 'A solicitar', deliveryStatus: 'Não iniciado',
      requestDate: null, dueDate: null, completionDate: null, ...o,
    };
  };
  const procurements = [
    // Entrega prevista depois do TAF/FAT: o painel avisa que ela ameaça o marco M-004.
    proc('CTR-001', 'CLP redundante e remotas de I/O PROFINET', distributor, {
      origin: 'Importado', country: 'Alemanha', currency: 'EUR', rate: 6.2, criticality: 'Alta', workPackageId: w['3.1'],
      milestoneId: m4, budgetedCents: 18_000_000, committedCents: 18_000_000, actualCents: 9_000_000,
      contractStatus: 'Pedido emitido', deliveryStatus: 'Em produção', requestDate: day(35), dueDate: day(102),
    }),
    // Comprometido acima do orçado: aditivo da inspeção por visão (MUD-001) ainda em análise.
    proc('CTR-002', 'Fabricação dos painéis de automação', supplier, {
      criticality: 'Alta', workPackageId: w['3.2'], milestoneId: m4, budgetedCents: 42_000_000, committedCents: 44_500_000,
      contractStatus: 'Contratado', requestDate: day(40), dueDate: day(88),
    }),
    proc('CTR-003', 'Instrumentos de campo (transmissores e válvulas)', distributor, {
      workPackageId: w['3.1'], budgetedCents: 9_500_000, committedCents: 9_200_000, actualCents: 9_200_000,
      contractStatus: 'Pedido emitido', deliveryStatus: 'Recebido', requestDate: day(36), dueDate: day(48), completionDate: day(48),
    }),
    proc('CTR-004', 'Desenvolvimento do software de CLP e telas SCADA', integrator, {
      type: 'Serviço', criticality: 'Alta', workPackageId: w['3.2'], budgetedCents: 16_000_000, committedCents: 16_000_000,
      contractStatus: 'Contratado', requestDate: day(38), dueDate: day(88),
    }),
    proc('CTR-005', 'Licenças do SCADA e servidor de históricos', integrator, {
      origin: 'Importado', country: 'Estados Unidos', currency: 'USD', rate: 5.4, workPackageId: w['2.4'],
      budgetedCents: 2_500_000, committedCents: 2_500_000, actualCents: 2_500_000, contractStatus: 'Contratado',
      deliveryStatus: 'Recebido', requestDate: day(28), dueDate: day(40), completionDate: day(40),
    }),
    proc('CTR-006', 'Montagem eletromecânica e lançamento de cabos', integrator, {
      type: 'Serviço', workPackageId: w['4.1'], budgetedCents: 32_000_000, contractStatus: 'Em cotação', dueDate: day(119),
    }),
  ];

  // ─── Riscos (matriz 3×3) ligados a pacotes, marcos, contratações e partes interessadas ───
  const risk = (code: string, title: string, o: Partial<Risk>): Risk => ({
    id: id<RiskId>(), code, title, nature: 'Ameaça', category: 'Técnico', description: '', rootCause: '', probability: 2,
    impact: 2, responseType: null, responseAction: '', ownerId: eng, status: 'Identificado', nextReview: day(ELAPSED + 7),
    notes: '', probabilityPct: null, costImpactCents: null, scheduleImpactDays: null, workPackageIds: [], milestoneIds: [],
    deliverableIds: [], procurementIds: [], partyIds: [], reassess: null, ...o,
  });
  const risks = [
    risk('R-001', 'Atraso na importação do CLP redundante', {
      category: 'Fornecedor/Aquisição', probability: 3, impact: 3, status: 'Em mitigação', responseType: 'Mitigar',
      responseAction: 'Pedido antecipado e diligenciamento semanal com o distribuidor', ownerId: buyer,
      rootCause: 'Prazo de fabricação do fabricante e desembaraço aduaneiro', probabilityPct: 40, costImpactCents: 25_000_000,
      scheduleImpactDays: 20, workPackageIds: [w['3.1']!], milestoneIds: [m4!], procurementIds: [c['CTR-001']!],
      partyIds: [distributor],
    }),
    risk('R-002', 'Falha de comunicação PROFINET no TAF/FAT', {
      probability: 2, impact: 3, workPackageIds: [w['3.4']!], deliverableIds: [d['ENT-005']!],
      procurementIds: [c['CTR-002']!, c['CTR-004']!], probabilityPct: 25, costImpactCents: 6_000_000, scheduleImpactDays: 7,
    }),
    risk('R-003', 'Nova alteração da lista de I/O pelo cliente', {
      category: 'Cliente/Contratual', probability: 3, impact: 2, status: 'Em monitoramento', workPackageIds: [w['2.3']!],
      partyIds: [client, clientRep],
    }),
    risk('R-004', 'Não conformidade NR-12 nas proteções dos painéis', {
      category: 'Segurança/SSMA', probability: 1, impact: 3, responseType: 'Evitar',
      responseAction: 'Revisão de projeto com especialista em NR-12', partyIds: [supplier], workPackageIds: [w['3.2']!],
    }),
    risk('R-005', 'Indisponibilidade do técnico de comissionamento', {
      category: 'Cronograma', probability: 1, impact: 2, workPackageIds: [w['5.1']!], ownerId: pm,
    }),
    risk('R-006', 'Antecipar a montagem com a liberação parcial da área', {
      nature: 'Oportunidade', category: 'Cronograma', probability: 2, impact: 2, responseType: 'Explorar',
      responseAction: 'Negociar com o cliente a liberação do mezanino', workPackageIds: [w['4.1']!], ownerId: pm,
    }),
    risk('R-007', 'Variação cambial do euro na compra do CLP', {
      category: 'Custo', probability: 2, impact: 2, status: 'Encerrado', responseType: 'Transferir',
      responseAction: 'Câmbio travado no fechamento do pedido', procurementIds: [c['CTR-001']!], ownerId: buyer,
    }),
  ];

  // ─── Recursos: custo homem-hora e alocações nos pacotes (sobrecarga na semana do TAF/FAT) ───
  const rc: Record<string, ResourceId> = {};
  const res = (code: string, name: string, o: Partial<Resource>): Resource => {
    rc[code] = id<ResourceId>();
    return {
      id: rc[code]!, code, name, type: 'Pessoa interna', role: '', skill: '', skillLevel: null, capacityPct: 100,
      hourlyRateCents: null, personId: null, organizationId: null, ...o,
    };
  };
  const resources = [
    res('REC-001', 'Engenheiro de automação sênior', {
      role: 'Engenharia de automação', skill: 'CLP/SCADA', skillLevel: 'Sênior', hourlyRateCents: 18_000, personId: eng,
    }),
    res('REC-002', 'Projetista elétrico', { role: 'Projeto elétrico', skill: 'Diagramas e interligação', skillLevel: 'Pleno', hourlyRateCents: 11_000 }),
    res('REC-003', 'Programador CLP/SCADA', {
      type: 'Pessoa terceirizada', role: 'Software de automação', skill: 'IEC 61131-3', skillLevel: 'Sênior',
      hourlyRateCents: 16_000, organizationId: integrator,
    }),
    res('REC-004', 'Equipe de montagem elétrica', { type: 'Equipe', role: 'Montagem', hourlyRateCents: 42_000, organizationId: integrator }),
    res('REC-005', 'Técnico de comissionamento', { role: 'Comissionamento', skill: 'Testes de malha', skillLevel: 'Pleno', hourlyRateCents: 12_000 }),
    res('REC-006', 'Caminhão munck', { type: 'Equipamento', role: 'Movimentação de painéis', hourlyRateCents: 35_000 }),
  ];
  const alloc = (code: string, rCode: string, wCode: string, pct: number, from: number, to: number, status: Allocation['status']): Allocation => ({
    id: id<AllocationId>(), code, resourceId: rc[rCode]!, workPackageId: w[wCode]!, pct, start: day(from), finish: day(to), status,
  });
  const allocations = [
    alloc('ALO-001', 'REC-001', '2.2', 100, 13, 24, 'Encerrada'),
    alloc('ALO-002', 'REC-001', '2.3', 60, 25, 43, 'Encerrada'),
    alloc('ALO-003', 'REC-001', '2.5', 50, 44, 55, 'Ativa'),
    alloc('ALO-004', 'REC-001', '3.4', 70, 94, 98, 'Planejada'),
    alloc('ALO-005', 'REC-001', '3.3', 50, 90, 96, 'Planejada'),
    alloc('ALO-006', 'REC-002', '2.3', 100, 25, 43, 'Encerrada'),
    alloc('ALO-007', 'REC-003', '3.2', 80, 54, 88, 'Planejada'),
    alloc('ALO-008', 'REC-004', '4.1', 100, 95, 119, 'Planejada'),
    alloc('ALO-009', 'REC-005', '5.1', 100, 126, 133, 'Planejada'),
    alloc('ALO-010', 'REC-006', '4.1', 50, 95, 99, 'Planejada'),
  ];

  // ─── Plano de comunicação (uma comunicação vencida) ───
  const com = (code: string, information: string, o: Partial<Communication>): Communication => ({
    id: id<CommunicationId>(), code, information, recipientIds: [], channel: 'E-mail', frequency: 'Semanal', ownerId: pm,
    nextDate: null, ...o,
  });
  const communications = [
    com('COM-001', 'Relatório semanal de avanço físico e financeiro', {
      recipientIds: [sponsor, clientRep, integrator], channel: 'Relatório', nextDate: day(ELAPSED + 2),
    }),
    com('COM-002', 'Comitê mensal do projeto', {
      recipientIds: [sponsor, clientRep, client], channel: 'Reunião', frequency: 'Mensal', nextDate: day(ELAPSED + 7),
    }),
    com('COM-003', 'Diligenciamento da fabricação dos painéis', {
      recipientIds: [supplier], channel: 'Reunião', frequency: 'Quinzenal', ownerId: buyer, nextDate: day(ELAPSED + 5),
    }),
    com('COM-004', 'Reemissão da lista de I/O ao cliente', {
      recipientIds: [client, clientRep], frequency: 'Única', ownerId: eng, nextDate: day(ELAPSED - 4),
    }),
  ];

  let s: ProjectSnapshot = {
    ...base,
    project: {
      ...base.project,
      counters: { PI: 9, REQ: 5, ENT: 9, MUD: 2, M: 5, NRM: 5, REU: 3, LIC: 1, ORC: 9, CTR: 6, R: 7, REC: 6, ALO: 10, COM: 4 },
      // Fases de um contrato de engenharia e automação industrial.
      config: {
        modules: {
          ...base.project.config.modules,
          schedule: {
            enabled: true,
            settings: { ...scheduleSettings(base), phases: [...PHASES] },
          },
        },
      },
    },
    stakeholders: { parties: byId(parties), communications: byId(communications) },
    finances: { budgetLines: byId(budgetLines), procurements: byId(procurements) },
    risks: { risks: byId(risks) },
    resources: { resources: byId(resources), allocations: byId(allocations) },
    scope: { requirements: byId(requirements), wbs: byId(nodes), deliverables: byId(deliverables) },
    schedule: { milestones: byId(milestones) },
    governance: {
      ...base.governance,
      changeRequests: byId(changeRequests),
      profile: {
        ...base.governance.profile,
        charter: {
          clientId: client, sponsorId: sponsor, managerId: pm,
          objective: 'Automatizar a linha de envase 3 com CLP redundante, painéis de automação e SCADA integrado ao MES.',
          justification: 'Elevar a eficiência (OEE) e a rastreabilidade da linha exigidas pelo cliente.',
          currentPhase: 'Engenharia', status: 'Em execução', approvalDate: day(-5),
        },
        closure: { plannedDate: day(150), actualDate: null, pendingItems: '', closureTermSigned: false },
        documentTemplate: { template: 'Externo (cliente)', notes: 'Padrão de documentação técnica do cliente, rev. 3' },
        procurementPolicy: {
          model: 'Cotação com ≥ 3 fornecedores', billing: 'Misto', criteria: ['Preço', 'Prazo', 'Homologação do cliente'],
          approvalLimitCents: 25000000, notes: 'Itens acima da alçada vão ao comitê mensal.',
        },
        // Contrato de R$ 1.500.000,00 (= as três receitas de faturamento): 0,1% ao dia por marco contratual atrasado, teto de 10%.
        latePenalty: {
          enabled: true, ratePct: 0.1, period: 'Diário', base: 'Valor do contrato', contractValueCents: 150_000_000, capPct: 10,
          notes: 'Cláusula 12.3: multa moratória de 0,1% do valor do contrato por dia de atraso nos marcos contratuais, limitada a 10%.',
        },
      },
      norms: byId(norms),
      meetings: byId(meetings),
      lessons: byId(lessons),
    },
  };

  // Linha de base v1 = fotografia do plano no início do projeto.
  const baseline = snapshotBaseline(s, deriveProject(s, start), { id: ctx.newId(), now: `${start}T12:00:00.000Z`, changeRequestId: null });
  s = { ...s, baselines: [baseline] };

  // Progresso real até hoje: os diagramas de interligação (2.3) terminaram 4 dias depois do previsto.
  const done = (code: string, from: number, to: number) => ({ code, actualStart: day(from), actualFinish: day(to), percentComplete: 100 });
  const progress = [
    done('1.1', 0, 4),
    done('1.2', 5, 8),
    done('2.1', 5, 12),
    done('2.2', 13, 24),
    done('2.3', 25, 43),
    done('2.4', 25, 34),
    { code: '2.5', actualStart: day(44), actualFinish: null, percentComplete: 50 },
    { code: '3.1', actualStart: day(35), actualFinish: null, percentComplete: 50 },
  ];
  const wbs = { ...s.scope.wbs };
  for (const p of progress) {
    const n = wbs[w[p.code]!]!;
    wbs[n.id] = { ...n, actualStart: p.actualStart, actualFinish: p.actualFinish, percentComplete: p.percentComplete };
  }
  return { ...s, scope: { ...s.scope, wbs } };
}
