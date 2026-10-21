import {
  DELIVERABLE_CATEGORIES,
  isDocument,
  type Deliverable,
  type DeliverableCategory,
  type DocTemplate,
} from '../model/deliverable';

export function effectiveTemplate(
  d: Deliverable,
  governanceTemplate: DocTemplate | null,
): DocTemplate | null {
  if (!isDocument(d)) return null;
  return d.template ?? governanceTemplate;
}

export type CategoryProgress = { done: number; total: number; percent: number | null };

const DONE = new Set(['Aprovado', 'Aceito pelo cliente']);

export function deliverableProgress(ds: Deliverable[]): Record<DeliverableCategory, CategoryProgress> {
  const out = Object.fromEntries(
    DELIVERABLE_CATEGORIES.map((c) => [c, { done: 0, total: 0, percent: null }]),
  ) as Record<DeliverableCategory, CategoryProgress>;
  for (const d of ds) {
    if (d.status === 'Cancelado') continue;
    const p = out[d.category];
    p.total += 1;
    if (DONE.has(d.status)) p.done += 1;
  }
  for (const p of Object.values(out)) p.percent = p.total > 0 ? (p.done / p.total) * 100 : null;
  return out;
}
