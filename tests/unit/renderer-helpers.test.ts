import { describe, expect, it } from 'vitest';
import { renderPackBadge, renderProgressBar } from '../../src/core/renderer';

describe('renderPackBadge', () => {
  it('formats a current pack with checkmark', () => {
    const out = renderPackBadge('current', 'engineering-core', '1.0.0');
    expect(out).toMatch(/engineering-core@1\.0\.0/);
    expect(out).toMatch(/current/);
  });

  it('formats a stale pack with warning and bundled version', () => {
    const out = renderPackBadge('stale', 'engineering-core', '1.0.0', '1.1.0');
    expect(out).toMatch(/engineering-core@1\.0\.0/);
    expect(out).toMatch(/stale/);
    expect(out).toMatch(/1\.1\.0/);
  });

  it('formats a newer pack', () => {
    const out = renderPackBadge('newer', 'engineering-core', '1.2.0', '1.1.0');
    expect(out).toMatch(/newer/);
    expect(out).toMatch(/1\.1\.0/);
  });

  it('formats an unknown state', () => {
    const out = renderPackBadge('unknown', 'custom-pack', '0.5.0');
    expect(out).toMatch(/custom-pack@0\.5\.0/);
    expect(out).toMatch(/unknown/);
  });

  it('formats a modified-locally state', () => {
    const out = renderPackBadge('modified-locally', 'engineering-core', '1.0.0');
    expect(out).toMatch(/modified-locally/);
  });
});

describe('renderProgressBar', () => {
  it('renders 4/8 with filled and empty cells', () => {
    const out = renderProgressBar(4, 8);
    expect(out).toMatch(/4\/8/);
    // 8 cells default width; 4 filled
    expect(out).toMatch(/\[[#█]{4}[-░]{4}\]/);
  });

  it('renders 0/8 fully empty', () => {
    const out = renderProgressBar(0, 8);
    expect(out).toMatch(/\[[-░]{8}\]/);
  });

  it('renders 8/8 fully filled', () => {
    const out = renderProgressBar(8, 8);
    expect(out).toMatch(/\[[#█]{8}\]/);
  });

  it('clamps current above total', () => {
    const out = renderProgressBar(20, 8);
    expect(out).toMatch(/8\/8/);
  });

  it('clamps current below zero', () => {
    const out = renderProgressBar(-3, 8);
    expect(out).toMatch(/0\/8/);
  });

  it('respects custom width', () => {
    const out = renderProgressBar(1, 4, 4);
    expect(out).toMatch(/\[[#█]{1}[-░]{3}\]/);
  });
});
