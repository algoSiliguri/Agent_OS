import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  type RenderInputs,
  renderProjectYaml,
} from '../../../../../src/ccp/commands/init/template';

const baseInputs = (): RenderInputs => ({
  projectId: 'my-project',
  domainType: 'general',
  runtimeVersion: '1.1.0',
  memoryNamespace: 'my-project',
  verificationProfile: 'production',
  criticalActions: [],
  workspaceRoot: '/abs/path',
});

describe('renderProjectYaml', () => {
  it('renders a parseable YAML document', () => {
    const out = renderProjectYaml(baseInputs());
    const doc = parseYaml(out) as Record<string, unknown>;
    expect(doc.project_id).toBe('my-project');
    expect(doc.domain_type).toBe('general');
    expect(doc.runtime_version).toBe('1.1.0');
    expect(doc.workspace).toEqual({ root: '/abs/path' });
  });

  it('renders empty critical_actions as []', () => {
    const doc = parseYaml(renderProjectYaml(baseInputs())) as Record<string, unknown>;
    expect(doc.critical_actions).toEqual([]);
  });

  it('renders non-empty critical_actions as a YAML list', () => {
    const out = renderProjectYaml({
      ...baseInputs(),
      criticalActions: ['trade_execute', 'global_memory_write'],
    });
    const doc = parseYaml(out) as Record<string, unknown>;
    expect(doc.critical_actions).toEqual(['trade_execute', 'global_memory_write']);
  });

  it('always renders memory_policy and trust_registry defaults', () => {
    const doc = parseYaml(renderProjectYaml(baseInputs())) as Record<string, unknown>;
    expect(doc.memory_policy).toEqual({ global_memory_read: true, global_memory_write: false });
    expect(doc.trust_registry).toEqual({
      pi_packages: [{ package: '@agnivadc/agent-os', trust: 'trusted' }],
    });
  });
});
