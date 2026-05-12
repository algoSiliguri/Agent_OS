import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { PackPlanDrafter } from '../../src/core/pack-plan-drafter';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aos-ppd-'));
});

const BASE_INPUT = {
  goal: 'add rate limiting',
  assumptions: [],
  risks: [],
  constraints: [],
  successCriteria: [],
};

describe('PackPlanDrafter', () => {
  it('detected profile with Cargo.toml → verification contains cargo test', async () => {
    writeFileSync(join(root, 'Cargo.toml'), '[package]\nname = "mylib"');
    const drafter = new PackPlanDrafter({ verification_profile: 'detected' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.verification.some((v) => v.command === 'cargo test')).toBe(true);
  });

  it('detected profile with no indicators → verification []', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'detected' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.verification).toEqual([]);
  });

  it('none profile → verification [] regardless of project files', async () => {
    writeFileSync(join(root, 'Cargo.toml'), '[package]');
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.verification).toEqual([]);
  });

  it('step commands always []', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.commands).toEqual([]);
  });

  it('expected_files always []', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.expected_files).toEqual([]);
  });

  it('step title includes "manual implementation required"', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps[0]!.title.toLowerCase()).toContain('manual implementation required');
  });

  it('detectedCommands returned on DraftedPlan for UX', async () => {
    writeFileSync(join(root, 'go.mod'), 'module example.com\ngo 1.21');
    const drafter = new PackPlanDrafter({ verification_profile: 'detected' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(Array.isArray(plan.detectedCommands)).toBe(true);
    expect(plan.detectedCommands!.some((d) => d.command === 'go test ./...')).toBe(true);
  });

  it('none profile detectedCommands is empty array', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.detectedCommands).toEqual([]);
  });

  it('risk_tier reflects input risks', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const highRisk = await drafter.draft({
      ...BASE_INPUT,
      workspaceRoot: root,
      risks: [
        { id: 'R-1', risk: 'r1' },
        { id: 'R-2', risk: 'r2' },
        { id: 'R-3', risk: 'r3' },
      ],
    });
    expect(highRisk.steps[0]!.risk_tier).toBe('high');
    const lowRisk = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(lowRisk.steps[0]!.risk_tier).toBe('low');
  });

  it('produces exactly one step', async () => {
    const drafter = new PackPlanDrafter({ verification_profile: 'none' });
    const plan = await drafter.draft({ ...BASE_INPUT, workspaceRoot: root });
    expect(plan.steps).toHaveLength(1);
  });
});
