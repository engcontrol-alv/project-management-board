import { governanceRag, isReadOnly, staleChangeRequests } from './governance';
import { emptyProfile } from '../model/profile';

describe('staleChangeRequests', () => {
  const crs = [
    { id: 1, status: 'Solicitada', requestDate: '2026-01-01' },
    { id: 2, status: 'Aprovada', requestDate: '2025-01-01' },
    { id: 3, status: 'Em análise', requestDate: '2025-06-01' },
  ];
  it('pendentes há mais de N dias', () => {
    expect(staleChangeRequests(crs, '2026-01-17', 15).map((c) => c.id)).toEqual([1, 3]);
    expect(staleChangeRequests(crs, '2026-01-16', 15).map((c) => c.id)).toEqual([3]);
  });
});

describe('governanceRag', () => {
  it('verde sem paradas, amarelo com alguma', () => {
    expect(governanceRag(0).rag).toBe('verde');
    expect(governanceRag(1).rag).toBe('amarelo');
  });
});

describe('isReadOnly', () => {
  it('somente leitura quando Encerrado', () => {
    const p = emptyProfile('p' as never);
    expect(isReadOnly(p)).toBe(false);
    expect(isReadOnly({ ...p, charter: { ...p.charter, status: 'Encerrado' } })).toBe(true);
  });
});
