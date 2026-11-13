import { describe, it, expect } from 'vitest';
import { normalizeInstagram, INSTAGRAM_HANDLE_RE } from './instagram';

describe('normalizeInstagram', () => {
  it('quita la @ inicial y espacios', () => {
    expect(normalizeInstagram('  @drgon.cut ')).toBe('drgon.cut');
  });

  it('acepta una URL de perfil completa', () => {
    expect(normalizeInstagram('https://www.instagram.com/drgon.cut/')).toBe('drgon.cut');
    expect(normalizeInstagram('instagram.com/drgon.cut?igsh=abc')).toBe('drgon.cut');
  });

  it('vacío significa borrar el dato', () => {
    expect(normalizeInstagram('')).toBeNull();
    expect(normalizeInstagram('  @ ')).toBeNull();
  });

  it('undefined significa no tocar el dato', () => {
    expect(normalizeInstagram(undefined)).toBeUndefined();
  });
});

describe('INSTAGRAM_HANDLE_RE', () => {
  it('valida usuarios reales', () => {
    expect(INSTAGRAM_HANDLE_RE.test('drgon.cut')).toBe(true);
    expect(INSTAGRAM_HANDLE_RE.test('nico0.z_cut')).toBe(true);
  });

  it('rechaza caracteres inválidos o demasiado largos', () => {
    expect(INSTAGRAM_HANDLE_RE.test('con espacio')).toBe(false);
    expect(INSTAGRAM_HANDLE_RE.test('a'.repeat(31))).toBe(false);
  });
});
