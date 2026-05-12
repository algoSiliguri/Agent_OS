import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { detectTestCommands } from '../../src/core/test-command-detector';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aos-det-'));
});

function touch(rel: string, content = ''): void {
  const abs = join(root, rel);
  mkdirSync(abs.substring(0, abs.lastIndexOf('/')), { recursive: true });
  writeFileSync(abs, content);
}

describe('detectTestCommands', () => {
  it('returns [] when no indicators found', () => {
    expect(detectTestCommands(root)).toEqual([]);
  });

  it('Cargo.toml → cargo test (high)', () => {
    touch('Cargo.toml', '[package]\nname = "my-lib"');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'cargo test' && r.source_file === 'Cargo.toml' && r.confidence === 'high')).toBe(true);
  });

  it('go.mod → go test ./... (high)', () => {
    touch('go.mod', 'module example.com/mymod\ngo 1.21');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'go test ./...' && r.source_file === 'go.mod')).toBe(true);
  });

  it('pom.xml → mvn test (high)', () => {
    touch('pom.xml', '<project/>');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'mvn test' && r.source_file === 'pom.xml')).toBe(true);
  });

  it('gradlew → ./gradlew test (high)', () => {
    touch('gradlew', '#!/bin/sh');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === './gradlew test' && r.source_file === 'gradlew' && r.confidence === 'high')).toBe(true);
  });

  it('build.gradle without gradlew → gradle test (low)', () => {
    touch('build.gradle', 'apply plugin: "java"');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'gradle test' && r.source_file === 'build.gradle' && r.confidence === 'low')).toBe(true);
  });

  it('gradlew takes precedence over build.gradle when both present', () => {
    touch('gradlew', '#!/bin/sh');
    touch('build.gradle', 'apply plugin: "java"');
    const cmds = detectTestCommands(root).map((r) => r.command);
    expect(cmds).toContain('./gradlew test');
    expect(cmds).not.toContain('gradle test');
  });

  it('pyproject.toml → pytest (high)', () => {
    touch('pyproject.toml', '[tool.pytest]\n');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'pytest' && r.source_file === 'pyproject.toml')).toBe(true);
  });

  it('pytest.ini → pytest (high)', () => {
    touch('pytest.ini', '[pytest]\n');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'pytest' && r.source_file === 'pytest.ini')).toBe(true);
  });

  it('package.json with scripts.test "vitest run" → vitest run (high)', () => {
    touch('package.json', JSON.stringify({ scripts: { test: 'vitest run' } }));
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'vitest run' && r.source_file === 'package.json' && r.confidence === 'high')).toBe(true);
  });

  it('package.json with default npm placeholder → no match', () => {
    touch('package.json', JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }));
    const results = detectTestCommands(root);
    expect(results.some((r) => r.source_file === 'package.json')).toBe(false);
  });

  it('package.json with no scripts.test → no match', () => {
    touch('package.json', JSON.stringify({ name: 'my-pkg' }));
    expect(detectTestCommands(root).some((r) => r.source_file === 'package.json')).toBe(false);
  });

  it('Makefile with root-level test target → make test (low)', () => {
    touch('Makefile', 'test:\n\tgo test ./...\n');
    const results = detectTestCommands(root);
    expect(results.some((r) => r.command === 'make test' && r.source_file === 'Makefile' && r.confidence === 'low')).toBe(true);
  });

  it('Makefile without test target → no match', () => {
    touch('Makefile', 'build:\n\tgo build ./...\n');
    expect(detectTestCommands(root).some((r) => r.source_file === 'Makefile')).toBe(false);
  });

  it('multiple indicators → returns all in priority order', () => {
    touch('Cargo.toml', '[package]');
    touch('package.json', JSON.stringify({ scripts: { test: 'vitest run' } }));
    const results = detectTestCommands(root);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0]!.source_file).toBe('Cargo.toml');
    const pkgIdx = results.findIndex((r) => r.source_file === 'package.json');
    expect(pkgIdx).toBeGreaterThan(0);
  });

  it('IO errors (invalid package.json) → [] with no throw', () => {
    touch('package.json', 'not valid json {{');
    expect(() => detectTestCommands(root)).not.toThrow();
    expect(detectTestCommands(root).some((r) => r.source_file === 'package.json')).toBe(false);
  });

  it('nested node_modules package.json ignored (root only)', () => {
    touch('package.json', JSON.stringify({ scripts: { test: 'jest' } }));
    touch('node_modules/lib/package.json', JSON.stringify({ scripts: { test: 'lib-test' } }));
    const cmds = detectTestCommands(root).map((r) => r.command);
    expect(cmds).toContain('jest');
    expect(cmds).not.toContain('lib-test');
  });

  it('never throws on missing or unreadable root', () => {
    expect(() => detectTestCommands('/nonexistent/path/xyz')).not.toThrow();
  });
});
