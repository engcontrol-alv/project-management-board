import { SCHEMA_VERSION, UnsupportedVersionError, migrateExport } from './migrations';

describe('migrateExport', () => {
  it('versão mais nova lança UnsupportedVersionError', () => {
    expect(SCHEMA_VERSION).toBe(1);
    try {
      migrateExport({ schemaVersion: 2 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedVersionError);
      expect((e as UnsupportedVersionError).found).toBe(2);
    }
  });
  it('v1 devolve o mesmo objeto', () => {
    const raw = { schemaVersion: 1 };
    expect(migrateExport(raw)).toBe(raw);
  });
});
