import { describe, expect, it } from 'vitest';
import { partyConstraints, partySchema, isValidCnpj } from './party';

const person = {
  id: 'p1',
  kind: 'Pessoa',
  code: 'PI-001',
  name: 'Ana',
  position: 'Gerente',
  organizationId: null,
  contact: '',
  internal: 'Interno',
  notes: '',
};
const org = {
  id: 'o1',
  kind: 'Organização',
  code: 'PI-002',
  name: 'Fornecedora X',
  roles: ['Fornecedor'],
  taxId: '',
  country: 'Brasil',
  contact: '',
  internal: 'Externo',
  notes: '',
};

describe('partySchema', () => {
  it('pessoa válida passa; nome vazio falha', () => {
    expect(partySchema.safeParse(person).success).toBe(true);
    expect(partySchema.safeParse({ ...person, name: '' }).success).toBe(false);
  });
  it('organização exige papel; pessoa não aceita papéis', () => {
    expect(partySchema.safeParse(org).success).toBe(true);
    expect(partySchema.safeParse({ ...org, roles: [] }).success).toBe(false);
    expect(partySchema.safeParse({ ...person, roles: ['Cliente'] }).success).toBe(false);
  });
  it('CNPJ opcional e validado', () => {
    expect(partySchema.safeParse({ ...org, taxId: '11222333000181' }).success).toBe(true);
    expect(partySchema.safeParse({ ...org, taxId: '11.222.333/0001-81' }).success).toBe(true);
    expect(partySchema.safeParse({ ...org, taxId: '11222333000180' }).success).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });
});

describe('constraints', () => {
  it('isSupplierOrganization', () => {
    expect(partyConstraints.isSupplierOrganization({ ...org, roles: ['Cliente'] })).toBe(
      'deve ser uma organização com papel Fornecedor ou Prestador de serviço',
    );
    expect(
      partyConstraints.isSupplierOrganization({ ...org, roles: ['Prestador de serviço'] }),
    ).toBeNull();
    expect(partyConstraints.isSupplierOrganization(person)).not.toBeNull();
  });
  it('isPerson / isOrganization / isClientOrganization', () => {
    expect(partyConstraints.isPerson(person)).toBeNull();
    expect(partyConstraints.isPerson(org)).toBe('deve ser uma pessoa');
    expect(partyConstraints.isOrganization(person)).toBe('deve ser uma organização');
    expect(partyConstraints.isClientOrganization(org)).toBe(
      'deve ser uma organização com papel Cliente',
    );
    expect(partyConstraints.isClientOrganization({ ...org, roles: ['Cliente'] })).toBeNull();
  });
});
