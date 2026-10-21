import {
  DELIVERABLE_CATEGORIES,
  type Deliverable,
  type DeliverableCategory,
  type DocTemplate,
} from '../model/deliverable';

export function effectiveTemplate(d: Deliverable, governanceTemplate: DocTemplate | null): DocTemplate | null {
  if (d.category === 'Entregável físico / serviço') return null;
  return d.template ?? governanceTemplate;
}

export type CategoryProgress = { done: number; total: number; percent: number | null };

export function isDeliverableDone(d: Pick<Deliverable, 'status'>): boolean {
  return d.status === 'Aprovado' || d.status === 'Aceito pelo cliente';
}

export function deliverableProgress(ds: Deliverable[]): Record<DeliverableCategory, CategoryProgress> {
  const out = Object.fromEntries(
    DELIVERABLE_CATEGORIES.map((c) => [c, { done: 0, total: 0, percent: null as number | null }]),
  ) as Record<DeliverableCategory, CategoryProgress>;
  for (const d of ds) {
    if (d.status === 'Cancelado') continue;
    const p = out[d.category];
    p.total += 1;
    if (isDeliverableDone(d)) p.done += 1;
  }
  for (const p of Object.values(out)) p.percent = p.total ? (p.done / p.total) * 100 : null;
  return out;
}
