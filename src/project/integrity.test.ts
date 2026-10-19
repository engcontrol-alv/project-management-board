import { describe, expect, it } from 'vitest';
import {
  aChangeRequest,
  aDocument,
  aGroup,
  aMilestone,
  anOrganization,
  aPackage,
  aPerson,
  aRequirement,
} from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { findIntegrityErrors, whereUsed } from './integrity';
import { exportFileName, parseImportText, toExport } from './serialization';

const X = aPerson({ id: 'X' as never });

describe('whereUsed', () => {
  it('pessoa usada por requisito e pelo perfil', () => {
    const s = aSnapshot()
      .withParty(X)
      .withRequirement(aRequirement({ ownerId: X.id }))
      .withProfile((p) => ({ ...p, charter: { ...p.charter, managerId: X.id } }))
      .build();
    const used = whereUsed(s, X.id);
    expect(used.map((u) => u.collection).sort()).toEqual(['profile', 'requirements']);
  });
  it('pai e predecessor contam como vínculo', () => {
    const s = aSnapshot()
      .withPackage(
        aGroup({ id: 'G', code: '1' }),
        aPackage({ id: 'A', code: '1.1', parentId: 'G' }),
        aPackage({ id: 'B', code: '1.2', parentId: 'G', predecessorIds: ['A'] }),
      )
      .build();
    expect(whereUsed(s, 'G').map((u) => u.id)).toContain('A');
    expect(whereUsed(s, 'A').map((u) => u.id)).toEqual(['B']);
  });
});

describe('findIntegrityErrors', () => {
  it('snapshot consistente', () => {
    const s = aSnapshot()
      .withParty(X)
      .withRequirement(aRequirement({ ownerId: X.id }))
      .withPackage(aPackage({ id: 'A' }))
      .withMilestone(aMilestone({ predecessorIds: ['A' as never] }))
      .build();
    expect(findIntegrityErrors(s)).toEqual([]);
  });
  it('vínculo órfão', () => {
    const s = aSnapshot().withRequirement(aRequirement({ ownerId: 'nada' as never })).build();
    expect(findIntegrityErrors(s)).toEqual(['REQ-001 Requisito teste: responsável aponta para um registro inexistente']);
  });
  it('predecessor agrupador, ciclo, solicitante organização e cliente sem papel', () => {
    const org = anOrganization({ id: 'O' as never, roles: ['Fornecedor'] });
    const s = aSnapshot()
      .withParty(org)
      .withPackage(
        aGroup({ id: 'G', code: '1' }),
        aPackage({ id: 'A', code: '2', predecessorIds: ['G'] }),
        aPackage({ id: 'B', code: '3', predecessorIds: ['C'] }),
        aPackage({ id: 'C', code: '4', predecessorIds: ['B'] }),
      )
      .withChangeRequest(aChangeRequest({ requesterId: org.id }))
      .withProfile((p) => ({ ...p, charter: { ...p.charter, clientId: org.id } }))
      .build();
    const errors = findIntegrityErrors(s);
    expect(errors).toContain('2 Pacote A: predecessor deve ser um pacote de trabalho');
    expect(errors.some((e) => e.startsWith('A EAP tem dependência circular'))).toBe(true);
    expect(errors).toContain('MUD-001 Mudança teste: solicitante deve ser uma pessoa');
    expect(errors).toContain('Ficha do projeto: cliente deve ser uma organização com papel Cliente');
  });
});

describe('export/import', () => {
  const full = () =>
    aSnapshot()
      .withParty(X, anOrganization())
      .withPackage(aGroup({ id: 'G', code: '1' }), aPackage({ id: 'A', code: '1.1', parentId: 'G', duration: 5 }))
      .withDeliverable(aDocument({ workPackageId: 'A' as never }))
      .withMilestone(aMilestone({ predecessorIds: ['A' as never] }))
      .withProject({ counters: { PI: 2, ENT: 1, M: 1 } })
      .build();

  it('round-trip idêntico', () => {
    const s = full();
    const r = parseImportText(JSON.stringify(toExport(s, '2026-10-17T10:00:00Z')));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshot).toEqual(s);
      expect(r.value.summary.name).toBe('Projeto Teste');
      expect(r.value.summary.counts['EAP']).toBe(2);
    }
  });

  it('Review Focus 3: mensagens específicas', () => {
    const msg = (text: string) => {
      const r = parseImportText(text);
      return r.ok ? null : r.error;
    };
    expect(msg('{"a":')?.message).toBe('O arquivo não é um JSON válido.');
    expect(msg('{"x":1}')?.message).toBe('O arquivo não é uma exportação do Project Management Board.');
    const file = toExport(full(), 'now');
    expect(msg(JSON.stringify({ ...file, schemaVersion: 2 }))?.message).toBe(
      'O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados 2; suportada até 1).',
    );
    const orphans = Array.from({ length: 12 }, (_, i) =>
      aRequirement({ id: `r${i}` as never, code: `REQ-${i}`, ownerId: 'nada' as never }),
    );
    const bad = msg(JSON.stringify({ ...file, data: { ...file.data, scope_requirements: orphans } }));
    expect(bad?.code).toBe('invalid');
    expect(bad?.message.startsWith('O arquivo contém dados inválidos:')).toBe(true);
    expect(bad?.message.split('\n').filter((l) => l.includes('aponta para'))).toHaveLength(10);
    expect(msg(JSON.stringify({ ...file, data: { ...file.data, processos: [] } }))?.code).toBe('invalid');
  });

  it('nome do arquivo de exportação', () => {
    const s = aSnapshot().withProject({ info: { name: 'x', code: 'OBRA 12/A', startDate: '2026-01-05' } }).build();
    expect(exportFileName(s, '2026-10-17')).toBe('pmb-obra-12-a-2026-10-17.json');
  });
});
