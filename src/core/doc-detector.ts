import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

export interface DetectedDoc {
  path: string;
  title: string;
  bytes: number;
  reason: 'known-root' | 'docs-dir' | 'adr-dir' | 'context-file';
}

const MAX_BYTES_PER_FILE = 50 * 1024;
const MAX_FILES = 15;
const MAX_TOTAL_BYTES = 256 * 1024;

const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'target',
  'vendor', 'coverage', '.next', 'out',
]);

const KNOWN_ROOTS: Array<{ rel: string; reason: DetectedDoc['reason'] }> = [
  { rel: 'README.md',               reason: 'known-root' },
  { rel: 'AGENTS.md',               reason: 'known-root' },
  { rel: 'CLAUDE.md',               reason: 'known-root' },
  { rel: 'CONTRIBUTING.md',         reason: 'known-root' },
  { rel: '.agent-os/context.md',    reason: 'context-file' },
];

function extractTitle(absPath: string, fallback: string): string {
  try {
    const text = readFileSync(absPath, 'utf-8');
    const m = text.match(/^#\s+(.+)$/m);
    if (m?.[1]) return m[1].trim();
  } catch { /* best-effort */ }
  return fallback;
}

function safeSize(absPath: string): number | null {
  try {
    return statSync(absPath).size;
  } catch {
    return null;
  }
}

function scanDir(
  dir: string,
  repoRoot: string,
  reason: DetectedDoc['reason'],
  maxDepth: number,
  skipDirNames: Set<string>,
  collector: DetectedDoc[],
  totals: { files: number; bytes: number },
): void {
  if (maxDepth < 0 || totals.files >= MAX_FILES || totals.bytes >= MAX_TOTAL_BYTES) return;
  let entries: import('node:fs').Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return;
  }
  // alphabetical deterministic order
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (totals.files >= MAX_FILES || totals.bytes >= MAX_TOTAL_BYTES) break;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) || skipDirNames.has(entry.name)) continue;
      scanDir(join(dir, entry.name), repoRoot, reason, maxDepth - 1, skipDirNames, collector, totals);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const absPath = join(dir, entry.name);
      const size = safeSize(absPath);
      if (size === null || size > MAX_BYTES_PER_FILE) continue;
      const rel = relative(repoRoot, absPath);
      // skip duplicates
      if (collector.some((d) => d.path === rel)) continue;
      const title = extractTitle(absPath, basename(entry.name));
      collector.push({ path: rel, title, bytes: size, reason });
      totals.files++;
      totals.bytes += size;
    }
  }
}

/**
 * Bounded, read-only doc detection.
 * Returns at most 15 files under 256KB total.
 * Never throws. Returns [] if no docs found.
 */
export function detectDocs(repoRoot: string): DetectedDoc[] {
  const docs: DetectedDoc[] = [];
  const totals = { files: 0, bytes: 0 };

  // Phase 1: known roots (deterministic order)
  for (const { rel, reason } of KNOWN_ROOTS) {
    if (totals.files >= MAX_FILES || totals.bytes >= MAX_TOTAL_BYTES) break;
    const absPath = join(repoRoot, rel);
    if (!existsSync(absPath)) continue;
    const size = safeSize(absPath);
    if (size === null || size > MAX_BYTES_PER_FILE) continue;
    const title = extractTitle(absPath, basename(rel));
    docs.push({ path: rel, title, bytes: size, reason });
    totals.files++;
    totals.bytes += size;
  }

  // Phase 2: docs/** depth 2, skip adr subdir here (handled in phase 3)
  const docsDir = join(repoRoot, 'docs');
  if (existsSync(docsDir)) {
    scanDir(docsDir, repoRoot, 'docs-dir', 1, new Set(['adr']), docs, totals);
  }

  // Phase 3: ADR directories depth 1
  for (const adrRel of ['docs/adr', 'adr']) {
    if (totals.files >= MAX_FILES || totals.bytes >= MAX_TOTAL_BYTES) break;
    const adrDir = join(repoRoot, adrRel);
    if (existsSync(adrDir)) {
      scanDir(adrDir, repoRoot, 'adr-dir', 0, new Set(), docs, totals);
    }
  }

  return docs;
}
