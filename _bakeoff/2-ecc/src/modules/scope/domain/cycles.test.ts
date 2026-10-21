import { findCycle } from './cycles';

describe('findCycle', () => {
  it('rede acíclica → null', () => {
    expect(
      findCycle({ A: { predecessorIds: [] }, B: { predecessorIds: ['A'] }, C: { predecessorIds: ['B'] } }),
    ).toBeNull();
  });
  it('A↔B → caminho com A e B', () => {
    const cycle = findCycle({ A: { predecessorIds: ['B'] }, B: { predecessorIds: ['A'] }, C: { predecessorIds: [] } });
    expect(cycle).toEqual(expect.arrayContaining(['A', 'B']));
    expect(cycle).not.toContain('C');
  });
  it('ignora predecessor inexistente', () => {
    expect(findCycle({ A: { predecessorIds: ['X'] } })).toBeNull();
  });
});
