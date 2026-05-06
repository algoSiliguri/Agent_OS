import { describe, expect, it } from 'vitest';
import {
  FALLBACK_VERSION,
  readExtensionVersion,
} from '../../../../../src/ccp/commands/init/version';

describe('readExtensionVersion', () => {
  it('reads version from the extension package.json', () => {
    expect(readExtensionVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('falls back to FALLBACK_VERSION when package.json is unreadable', () => {
    expect(readExtensionVersion('/nonexistent/path/package.json')).toBe(FALLBACK_VERSION);
  });
});
