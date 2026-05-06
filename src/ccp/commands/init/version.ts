import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FALLBACK_VERSION = '1.1.0';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function readExtensionVersion(packageJsonPath?: string): string {
  const path = packageJsonPath ?? join(__dirname, '..', '..', '..', '..', 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' && pkg.version.length > 0
      ? pkg.version
      : FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}
