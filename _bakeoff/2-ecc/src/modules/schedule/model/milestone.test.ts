import { milestoneSchema } from './milestone';

const m = {
  id: 'm',
  code: 'M-001',
  name: 'Entrega',
  phase: 'Execução',
  type: 'Contratual',
  predecessorIds: [],
  manualDate: '2026-02-01',
  actualDate: null,
  ownerId: null,
};

describe('milestoneSchema', () => {
  it('exige data manual sem predecessores', () => {
    expect(milestoneSchema.safeParse(m).success).toBe(true);
    expect(milestoneSchema.safeParse({ ...m, manualDate: null }).success).toBe(false);
    expect(milestoneSchema.safeParse({ ...m, manualDate: null, predecessorIds: ['a'] }).success).toBe(true);
  });
});
