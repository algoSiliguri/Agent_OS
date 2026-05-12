import { describe, expect, it } from 'vitest';
import { compareSemver } from '../../src/core/semver';

describe('compareSemver', () => {
  it('"1.10.0" > "1.2.0" (numeric not string comparison)', () => {
    expect(compareSemver('1.10.0', '1.2.0')).toBe(1);
  });

  it('"1.0.0" < "1.2.0"', () => {
    expect(compareSemver('1.0.0', '1.2.0')).toBe(-1);
  });

  it('"1.2.0" == "1.2.0"', () => {
    expect(compareSemver('1.2.0', '1.2.0')).toBe(0);
  });

  it('"banana" returns null (no crash)', () => {
    expect(compareSemver('banana', '1.2.0')).toBeNull();
  });

  it('"" returns null (no crash)', () => {
    expect(compareSemver('', '1.2.0')).toBeNull();
  });

  it('both unparsable returns null', () => {
    expect(compareSemver('banana', 'pear')).toBeNull();
  });

  it('"2.0.0" > "1.9.9"', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
  });

  it('"1.2.3" < "1.2.4"', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBe(-1);
  });
});
