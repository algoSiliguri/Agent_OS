import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { detectDocs } from '../../src/core/doc-detector';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aos-doc-'));
});

function write(rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(abs.substring(0, abs.lastIndexOf('/')), { recursive: true });
  writeFileSync(abs, content);
}

describe('detectDocs', () => {
  it('returns [] when no docs exist', () => {
    expect(detectDocs(root)).toEqual([]);
  });

  it('returns known root docs that exist', () => {
    write('README.md', '# My Project\nContent.');
    write('CONTRIBUTING.md', '# Contributing\nGuidelines.');
    const docs = detectDocs(root);
    const paths = docs.map((d) => d.path);
    expect(paths).toContain('README.md');
    expect(paths).toContain('CONTRIBUTING.md');
  });

  it('skips known root docs that do not exist', () => {
    write('README.md', '# Present');
    const docs = detectDocs(root);
    expect(docs.map((d) => d.path)).not.toContain('AGENTS.md');
    expect(docs.map((d) => d.path)).not.toContain('CLAUDE.md');
  });

  it('extracts H1 title from markdown', () => {
    write('README.md', '# My Great Project\nSome content.');
    const doc = detectDocs(root).find((d) => d.path === 'README.md');
    expect(doc?.title).toBe('My Great Project');
  });

  it('falls back to basename when no H1 found', () => {
    write('README.md', 'No heading here.');
    const doc = detectDocs(root).find((d) => d.path === 'README.md');
    expect(doc?.title).toBe('README.md');
  });

  it('skips files over 50KB', () => {
    const bigContent = 'x'.repeat(51 * 1024);
    write('README.md', bigContent);
    const docs = detectDocs(root);
    expect(docs.find((d) => d.path === 'README.md')).toBeUndefined();
  });

  it('skips node_modules even if it contains markdown', () => {
    write('README.md', '# Root');
    write('node_modules/some-lib/README.md', '# Lib docs');
    const paths = detectDocs(root).map((d) => d.path);
    expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
    expect(paths).toContain('README.md');
  });

  it('skips other excluded dirs', () => {
    write('README.md', '# Root');
    for (const dir of ['dist', 'build', '.git', 'coverage']) {
      write(`${dir}/README.md`, `# ${dir}`);
    }
    const paths = detectDocs(root).map((d) => d.path);
    expect(paths).toEqual(['README.md']);
  });

  it('returns at most 15 files', () => {
    write('README.md', '# Root');
    mkdirSync(join(root, 'docs'), { recursive: true });
    for (let i = 0; i < 20; i++) {
      write(`docs/doc-${String(i).padStart(2, '0')}.md`, `# Doc ${i}`);
    }
    const docs = detectDocs(root);
    expect(docs.length).toBeLessThanOrEqual(15);
  });

  it('respects context-file reason for .agent-os/context.md', () => {
    write('.agent-os/context.md', '# Context\nProject notes.');
    const doc = detectDocs(root).find((d) => d.path === '.agent-os/context.md');
    expect(doc?.reason).toBe('context-file');
  });

  it('returns docs-dir reason for files inside docs/', () => {
    write('docs/architecture.md', '# Architecture');
    const doc = detectDocs(root).find((d) => d.path === 'docs/architecture.md');
    expect(doc?.reason).toBe('docs-dir');
  });

  it('returns adr-dir reason for files inside docs/adr/', () => {
    write('docs/adr/001-use-pi.md', '# Use Pi');
    const doc = detectDocs(root).find((d) => d.path === 'docs/adr/001-use-pi.md');
    expect(doc?.reason).toBe('adr-dir');
  });

  it('is deterministic across calls', () => {
    write('README.md', '# Root');
    write('docs/a.md', '# A');
    write('docs/b.md', '# B');
    const first = detectDocs(root).map((d) => d.path);
    const second = detectDocs(root).map((d) => d.path);
    expect(first).toEqual(second);
  });

  it('does not throw when dirs are missing', () => {
    // No docs dir, no adr dir — just call and expect no throw
    expect(() => detectDocs(root)).not.toThrow();
  });
});
