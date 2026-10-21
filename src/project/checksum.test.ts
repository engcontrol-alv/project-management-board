import { describe, expect, it } from 'vitest';
import { aPackage } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import v2 from './__fixtures__/export-v2.json';
import { canonicalJson, parseImportFile, sha256Hex, toExport, verifyChecksum, withChecksum } from './serialization';

const snapshot = () => aSnapshot().withPackage(aPackage({ id: 'A', name: 'Diagramas' })).build();

describe('checksum SHA-256 do backup (D9)', () => {
  it('sha256Hex usa a Web Crypto API (vetor conhecido)', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('JSON canônico: chaves ordenadas em qualquer nível, arrays na ordem', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 0 }], c: 'x' } })).toBe('{"a":{"c":"x","d":[2,{"y":0,"z":1}]},"b":1}');
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('exportação recebe checksumSha256 (64 hex) sobre o arquivo sem o próprio campo', async () => {
    const file = await withChecksum(toExport(snapshot(), '2026-10-20T00:00:00.000Z'));
    expect(file.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    const { checksumSha256: _omit, ...payload } = file;
    expect(file.checksumSha256).toBe(await sha256Hex(canonicalJson(payload)));
  });

  it('verificação: ok, ausente (arquivo antigo) e divergente (adulterado)', async () => {
    const file = await withChecksum(toExport(snapshot(), 'n'));
    expect(await verifyChecksum(JSON.parse(JSON.stringify(file, null, 2)))).toBe('ok');
    expect(await verifyChecksum(structuredClone(v2))).toBe('ausente');
    const tampered = JSON.parse(JSON.stringify(file).replace('Diagramas', 'Diagramaz'));
    expect(await verifyChecksum(tampered)).toBe('divergente');
    // Reordenar chaves não é adulteração.
    const reordered = Object.fromEntries(Object.entries(file).reverse());
    expect(await verifyChecksum(reordered)).toBe('ok');
  });

  it('importação: íntegro → verificada; adulterado → recusado; antigo → aceito sem checksum', async () => {
    const file = await withChecksum(toExport(snapshot(), 'n'));
    const text = JSON.stringify(file, null, 2);
    const okFile = await parseImportFile(text);
    expect(okFile.ok && okFile.value.integrity).toBe('verificada');
    expect(okFile.ok && okFile.value.snapshot).toEqual(snapshot());

    const bad = await parseImportFile(text.replace('Diagramas', 'Diagramaz'));
    expect(bad.ok ? null : bad.error).toEqual({
      code: 'checksum',
      message: 'Integridade SHA-256 não confere: o arquivo foi alterado ou corrompido depois da exportação.',
    });

    const old = await parseImportFile(JSON.stringify(v2));
    expect(old.ok && old.value.integrity).toBe('ausente');
    expect((await parseImportFile('{')).ok).toBe(false);
  });
});
