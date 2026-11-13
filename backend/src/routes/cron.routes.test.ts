import { describe, it, expect } from 'vitest';
import { isCronAuthorized } from './cron.routes';

describe('isCronAuthorized', () => {
  it('acepta el header Bearer con el secreto correcto', () => {
    expect(isCronAuthorized('Bearer s3cret', 's3cret')).toBe(true);
  });

  it('rechaza secreto incorrecto o header ausente', () => {
    expect(isCronAuthorized('Bearer otro', 's3cret')).toBe(false);
    expect(isCronAuthorized(undefined, 's3cret')).toBe(false);
  });

  it('sin CRON_SECRET configurado nunca autoriza', () => {
    expect(isCronAuthorized('Bearer ', '')).toBe(false);
    expect(isCronAuthorized('Bearer undefined', undefined)).toBe(false);
  });
});
