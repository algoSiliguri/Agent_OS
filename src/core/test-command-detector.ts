import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DetectedTestCommand {
  command: string;
  source_file: string;
  confidence: 'high' | 'low';
}

function fileExists(repoRoot: string, name: string): boolean {
  try {
    return existsSync(join(repoRoot, name));
  } catch {
    return false;
  }
}

function maybePkgTestScript(repoRoot: string): string | null {
  const path = join(repoRoot, 'package.json');
  try {
    const raw = readFileSync(path, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const scripts = pkg.scripts as Record<string, unknown> | undefined;
    if (!scripts) return null;
    const test = scripts.test;
    if (typeof test !== 'string' || !test.trim()) return null;
    // reject default npm-init placeholder
    if (/echo\s+["']?Error: no test specified["']?\s*&&\s*exit 1/.test(test)) return null;
    return test.trim();
  } catch {
    return null;
  }
}

function hasMakeTestTarget(repoRoot: string): boolean {
  try {
    const text = readFileSync(join(repoRoot, 'Makefile'), 'utf-8');
    return /^test\s*:/m.test(text);
  } catch {
    return false;
  }
}

/**
 * Bounded, read-only, root-level test command detection.
 * Returns candidates in deterministic priority order.
 * Never throws.
 */
export function detectTestCommands(repoRoot: string): DetectedTestCommand[] {
  const results: DetectedTestCommand[] = [];

  if (fileExists(repoRoot, 'Cargo.toml'))
    results.push({ command: 'cargo test', source_file: 'Cargo.toml', confidence: 'high' });

  if (fileExists(repoRoot, 'go.mod'))
    results.push({ command: 'go test ./...', source_file: 'go.mod', confidence: 'high' });

  if (fileExists(repoRoot, 'pom.xml'))
    results.push({ command: 'mvn test', source_file: 'pom.xml', confidence: 'high' });

  if (fileExists(repoRoot, 'gradlew')) {
    results.push({ command: './gradlew test', source_file: 'gradlew', confidence: 'high' });
  } else if (fileExists(repoRoot, 'build.gradle')) {
    results.push({ command: 'gradle test', source_file: 'build.gradle', confidence: 'low' });
  }

  if (fileExists(repoRoot, 'pyproject.toml'))
    results.push({ command: 'pytest', source_file: 'pyproject.toml', confidence: 'high' });

  if (fileExists(repoRoot, 'pytest.ini'))
    results.push({ command: 'pytest', source_file: 'pytest.ini', confidence: 'high' });

  const pkgTest = maybePkgTestScript(repoRoot);
  if (pkgTest !== null)
    results.push({ command: pkgTest, source_file: 'package.json', confidence: 'high' });

  if (fileExists(repoRoot, 'Makefile') && hasMakeTestTarget(repoRoot))
    results.push({ command: 'make test', source_file: 'Makefile', confidence: 'low' });

  return results;
}
