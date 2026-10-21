import type { Rag } from '@/core/indicators';
import type { Deliverable, TestStatus } from '../model/deliverable';

/** Tipos industriais que passam por TAF/FAT e TAC/SAT por padrão (D3). */
const TESTED_TYPES = new Set(['Equipamento', 'Painel/Sistema', 'Software de CLP/IHM']);

export function defaultTestStatus(type: string): TestStatus {
  return TESTED_TYPES.has(type) ? 'Pendente' : 'Não Aplicável';
}

export type AcceptanceIssue = { test: 'TAF/FAT' | 'TAC/SAT'; status: TestStatus; severity: Extract<Rag, 'amarelo' | 'vermelho'> };

const OPEN: Partial<Record<TestStatus, AcceptanceIssue['severity']>> = { Pendente: 'amarelo', Reprovado: 'vermelho' };

/**
 * Testes de aceitação incoerentes com o status (D4): `Aceito pelo cliente` exige TAF e TAC aprovados;
 * `Concluído` (entregue) exige o TAF — o TAC acontece em campo, depois da entrega. `Não Aplicável` nunca conta.
 */
export function acceptanceIssues(d: Deliverable): AcceptanceIssue[] {
  if (d.category !== 'Entregável físico / serviço') return [];
  const checks: [AcceptanceIssue['test'], TestStatus][] = [];
  if (d.status === 'Concluído' || d.status === 'Aceito pelo cliente') checks.push(['TAF/FAT', d.fatStatus]);
  if (d.status === 'Aceito pelo cliente') checks.push(['TAC/SAT', d.satStatus]);
  return checks.flatMap(([test, status]) => {
    const severity = OPEN[status];
    return severity ? [{ test, status, severity }] : [];
  });
}
