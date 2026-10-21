import { describe, expect, it } from 'vitest';
import { aBudgetLine, anAllocation, aPackage, aPerson, aProcurement, aResource, aRisk, aSupplier } from '@/test/factories';
import { aContext, aSnapshot } from '@/test/builders';
import type { ProjectSnapshot } from '@/project/snapshot';
import { removeEntity, upsertEntity } from './entities';
import { updateModuleSettings } from './project';
import { runCommand, type Command } from './run';

const run = (s: ProjectSnapshot, cmd: Command) => runCommand(s, cmd, aContext());
const errorsOf = (r: ReturnType<typeof run>) => (r.ok ? [] : r.error);

describe('comandos da etapa 2', () => {
  it('códigos CTR sequenciais e nunca reutilizados', () => {
    let s = aSnapshot().withParty(aSupplier()).build();
    for (let i = 0; i < 3; i++) {
      const r = run(s, upsertEntity('finances', 'procurements', aProcurement({ id: `c${i}` as never, code: '' })));
      if (!r.ok) throw new Error(r.error.join('\n'));
      s = r.value.snapshot;
    }
    expect(Object.values(s.finances.procurements).map((p) => p.code).sort()).toEqual(['CTR-001', 'CTR-002', 'CTR-003']);
    const removed = run(s, removeEntity('finances', 'procurements', 'c2'));
    if (!removed.ok) throw new Error(removed.error.join('\n'));
    const again = run(removed.value.snapshot, upsertEntity('finances', 'procurements', aProcurement({ id: 'c9' as never, code: '' })));
    expect(again.ok && again.value.snapshot.finances.procurements['c9' as never]?.code).toBe('CTR-004');
  });

  it('Review Focus 4 / caso 16: contratação sem fornecedor ou com pessoa não salva', () => {
    const s = aSnapshot().withParty(aSupplier(), aPerson({ id: 'p9' as never })).build();
    expect(errorsOf(run(s, upsertEntity('finances', 'procurements', aProcurement({ code: '', supplierId: null }))))).toEqual([
      'CTR-001 Painéis de automação: fornecedor é obrigatório',
    ]);
    expect(errorsOf(run(s, upsertEntity('finances', 'procurements', aProcurement({ code: '', supplierId: 'p9' as never })))).join()).toContain(
      'fornecedor deve ser uma organização com papel Fornecedor ou Prestador de serviço',
    );
  });

  it('caso 15: remover o papel Fornecedor de organização com contratação é bloqueado', () => {
    const s = aSnapshot().withParty(aSupplier()).withProcurement(aProcurement()).build();
    const r = run(s, upsertEntity('stakeholders', 'parties', aSupplier({ roles: ['Cliente'] })));
    expect(errorsOf(r)).toEqual([
      'CTR-001 Painéis de automação: fornecedor deve ser uma organização com papel Fornecedor ou Prestador de serviço',
    ]);
  });

  it('caso 19: moeda diferente da base exige taxa; moeda fora da lista é recusada', () => {
    const s = aSnapshot().build();
    expect(errorsOf(run(s, upsertEntity('finances', 'budgetLines', aBudgetLine({ code: '', currency: 'USD' }))))).toEqual([
      'ORC-001: informe a taxa para BRL',
    ]);
    expect(run(s, upsertEntity('finances', 'budgetLines', aBudgetLine({ code: '', currency: 'USD', rate: 5.1 }))).ok).toBe(true);
    expect(errorsOf(run(s, upsertEntity('finances', 'budgetLines', aBudgetLine({ code: '', currency: 'JPY', rate: 0.03 }))))).toEqual([
      'ORC-001: moeda JPY não aceita neste projeto',
    ]);
  });

  it('trocar a moeda base com item sem taxa é recusado', () => {
    const s = aSnapshot().withBudgetLine(aBudgetLine()).build();
    const r = run(s, updateModuleSettings('finances', { baseCurrency: 'USD', currencies: ['BRL', 'USD'], cpiGreenMin: 0.95, cpiYellowMin: 0.85 }));
    expect(errorsOf(r)).toEqual(['ORC-001: informe a taxa para USD']);
  });

  it('categoria de risco: fora da lista recusada; remover categoria em uso bloqueado', () => {
    const s = aSnapshot().withRisk(aRisk()).build();
    expect(errorsOf(run(s, upsertEntity('risks', 'risks', aRisk({ id: 'r2' as never, code: '', category: 'Astrologia' }))))).toEqual([
      'R-001: categoria "Astrologia" não está na lista de categorias de risco',
    ]);
    const r = run(s, updateModuleSettings('risks', { scale: 3, bands: { low: 2, moderate: 4, high: 6 }, categories: ['Técnico'] }));
    expect(errorsOf(r)).toEqual(['Categoria "Fornecedor/Aquisição" está em uso e não pode ser removida.']);
  });

  it('excluir pacote usado por alocação é bloqueado', () => {
    const s = aSnapshot()
      .withPackage(aPackage({ id: 'A', code: '1' }))
      .withResource(aResource())
      .withAllocation(anAllocation({ workPackageId: 'A' as never }))
      .build();
    expect(errorsOf(run(s, removeEntity('scope', 'wbs', 'A'))).join()).toContain('Não é possível excluir: usado em ALO-001');
  });

  it('projeto encerrado recusa escrever riscos', () => {
    const s = aSnapshot().withProfile((p) => ({ ...p, charter: { ...p.charter, status: 'Encerrado' } })).build();
    expect(errorsOf(run(s, upsertEntity('risks', 'risks', aRisk({ code: '' }))))).toEqual(['Projeto encerrado: somente leitura.']);
  });
});
