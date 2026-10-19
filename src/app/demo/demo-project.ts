/**
 * Projeto de demonstração — carregado só por ação explícita na tela inicial.
 * Todos os nomes são fictícios. As datas são relativas a `today`, para que o cronograma,
 * a Curva S e os alertas apareçam "em andamento" em qualquer dia.
 */
import type {
  ChangeRequestId,
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
import type { Lesson, Meeting, Norm } from '@/modules/governance';
import type { ChangeRequest, Deliverable, Requirement, WbsNode } from '@/modules/scope';
import type { Milestone, ScheduleSettings } from '@/modules/schedule';
import type { Organization, Person } from '@/modules/stakeholders';
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
  const person = (pid: PartyId, code: string, name: string, position: string, org: PartyId | null, internal: 'Interno' | 'Externo'): Person => ({
    id: pid, kind: 'Pessoa', code, name, position, organizationId: org, contact: '', internal, notes: '',
  });
  const org = (pid: PartyId, code: string, name: string, roles: Organization['roles']): Organization => ({
    id: pid, kind: 'Organização', code, name, roles, taxId: '', country: 'Brasil', contact: '', internal: 'Externo', notes: '',
  });
  const parties = [
    org(client, 'PI-001', 'Bebidas Exemplo Indústria S.A.', ['Cliente']),
    org(supplier, 'PI-002', 'Painéis Elétricos Fictícios Ltda.', ['Fornecedor']),
    person(pm, 'PI-003', 'Carla Menezes', 'Gerente de projetos', null, 'Interno'),
    person(eng, 'PI-004', 'Rafael Duarte', 'Engenheiro de automação', null, 'Interno'),
    person(buyer, 'PI-005', 'Juliana Prado', 'Coordenadora de suprimentos', null, 'Interno'),
    person(sponsor, 'PI-006', 'Eduardo Lins', 'Diretor de operações', null, 'Interno'),
    person(clientRep, 'PI-007', 'Marcos Tavares', 'Gerente de engenharia da planta', client, 'Externo'),
  ];

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
  });
  d['ENT-008'] = id<DeliverableId>();
  deliverables.push({
    id: d['ENT-008'], code: 'ENT-008', name: 'Treinamento dos operadores e da manutenção', category: 'Entregável físico / serviço',
    type: 'Treinamento', status: 'Não iniciado', workPackageId: w['5.2']!, milestoneId: null,
    plannedDate: null, actualDate: null, ownerId: pm, clientApproval: false,
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

  let s: ProjectSnapshot = {
    ...base,
    project: {
      ...base.project,
      counters: { PI: 7, REQ: 5, ENT: 8, MUD: 2, M: 5, NRM: 5, REU: 3, LIC: 1 },
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
    stakeholders: { parties: byId(parties) },
    scope: { requirements: byId(requirements), wbs: byId(nodes), deliverables: byId(deliverables), changeRequests: byId(changeRequests) },
    schedule: { milestones: byId(milestones) },
    governance: {
      ...base.governance,
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
    { code: '3.1', actualStart: day(35), actualFinish: null, percentComplete: 65 },
  ];
  const wbs = { ...s.scope.wbs };
  for (const p of progress) {
    const n = wbs[w[p.code]!]!;
    wbs[n.id] = { ...n, actualStart: p.actualStart, actualFinish: p.actualFinish, percentComplete: p.percentComplete };
  }
  return { ...s, scope: { ...s.scope, wbs } };
}
