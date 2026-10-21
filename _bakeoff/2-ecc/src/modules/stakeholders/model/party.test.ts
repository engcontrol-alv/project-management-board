import { isValidCnpj, partySchema } from './party';
import { stakeholdersManifest } from '../manifest';

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
  name: 'ACME',
  roles: ['Cliente'],
  taxId: '',
  country: 'Brasil',
  contact: '',
  internal: 'Externo',
  notes: '',
};

describe('partySchema', () => {
  it('pessoa válida passa e nome vazio falha', () => {
    expect(partySchema.safeParse(person).success).toBe(true);
    expect(partySchema.safeParse({ ...person, name: '' }).success).toBe(false);
  });
  it('organização exige ao menos um papel', () => {
    expect(partySchema.safeParse(org).success).toBe(true);
    expect(partySchema.safeParse({ ...org, roles: [] }).success).toBe(false);
  });
  it('pessoa com campo de organização é rejeitada', () => {
    expect(partySchema.safeParse({ ...person, roles: ['Cliente'] }).success).toBe(false);
  });
  it('CNPJ opcional e validado', () => {
    expect(partySchema.safeParse({ ...org, taxId: '' }).success).toBe(true);
    expect(partySchema.safeParse({ ...org, taxId: '11222333000181' }).success).toBe(true);
    expect(partySchema.safeParse({ ...org, taxId: '11222333000180' }).success).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });
});

describe('constraints', () => {
  const c = stakeholdersManifest.constraints;
  it('isSupplierOrganization', () => {
    expect(c.isSupplierOrganization!(org)).toBe(
      'deve ser uma organização com papel Fornecedor ou Prestador de serviço',
    );
    expect(c.isSupplierOrganization!({ ...org, roles: ['Prestador de serviço'] })).toBeNull();
    expect(c.isSupplierOrganization!(person)).not.toBeNull();
  });
  it('isPerson, isOrganization, isClientOrganization', () => {
    expect(c.isPerson!(person)).toBeNull();
    expect(c.isPerson!(org)).toBe('deve ser uma pessoa');
    expect(c.isOrganization!(person)).toBe('deve ser uma organização');
    expect(c.isClientOrganization!(org)).toBeNull();
    expect(c.isClientOrganization!({ ...org, roles: ['Parceiro'] })).toBe(
      'deve ser uma organização com papel Cliente',
    );
  });
});
