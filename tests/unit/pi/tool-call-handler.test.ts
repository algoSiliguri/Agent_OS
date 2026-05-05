// tests/unit/pi/tool-call-handler.test.ts
import { describe, expect, it } from 'vitest';
import { type ToolMetadata, ToolRegistry } from '../../../src/ccp/policy/tool-registry';
import type { ProjectConfig } from '../../../src/core/manifest';
import { handleToolCall } from '../../../src/pi/tool-call-handler';

const config: ProjectConfig = {
  project_id: 'p',
  domain_type: 'd',
  runtime_version: '0.1.0',
  memory_namespace: 'p',
  verification_profile: 'default',
  workspace: { root: '/repo' },
};

const writeFile: ToolMetadata = {
  tool_id: 'write_file',
  source: 'pi',
  trust_level: 'trusted',
  capability_type: 'WRITE_LOCAL',
  read_or_write: 'write',
  network_required: false,
  workspace_required: true,
  approval_tier: 2,
  audit_metadata: {},
  retry_policy: 'idempotent',
  idempotency_key_support: false,
};

describe('handleToolCall', () => {
  it('blocks unknown tools', async () => {
    const cache = new Map<string, boolean>();
    let blocked: string | null = null;
    await handleToolCall(
      {
        toolName: 'mystery',
        input: {},
        block: (r) => {
          blocked = r;
        },
      },
      { registry: new ToolRegistry(), cache, config, ui: makeNoopUi() },
    );
    expect(blocked).toContain('unknown tool');
  });

  it('passes Tier 1 without prompting', async () => {
    const registry = new ToolRegistry();
    registry.register({
      ...writeFile,
      tool_id: 'read_file',
      capability_type: 'READ_LOCAL',
      approval_tier: 1,
      read_or_write: 'read',
    });
    const cache = new Map<string, boolean>();
    let blocked = false;
    let prompted = false;
    await handleToolCall(
      {
        toolName: 'read_file',
        input: { path: '/repo/foo.ts' },
        block: () => {
          blocked = true;
        },
      },
      {
        registry,
        cache,
        config,
        ui: {
          ...makeNoopUi(),
          confirm: async () => {
            prompted = true;
            return true;
          },
        },
      },
    );
    expect(blocked).toBe(false);
    expect(prompted).toBe(false);
  });

  it('Tier 2 first call prompts and caches on approval', async () => {
    const registry = new ToolRegistry();
    registry.register(writeFile);
    const cache = new Map<string, boolean>();
    let prompts = 0;
    const ui = {
      ...makeNoopUi(),
      confirm: async () => {
        prompts++;
        return true;
      },
    };
    await handleToolCall(
      { toolName: 'write_file', input: { path: '/repo/foo.ts' }, block: () => {} },
      { registry, cache, config, ui },
    );
    await handleToolCall(
      { toolName: 'write_file', input: { path: '/repo/bar.ts' }, block: () => {} },
      { registry, cache, config, ui },
    );
    expect(prompts).toBe(1); // second call uses cache
  });

  it('Tier 4 blocks without prompting', async () => {
    const registry = new ToolRegistry();
    registry.register(writeFile);
    const cache = new Map<string, boolean>();
    let blocked: string | null = null;
    let prompted = false;
    const ui = {
      ...makeNoopUi(),
      confirm: async () => {
        prompted = true;
        return true;
      },
    };
    await handleToolCall(
      {
        toolName: 'write_file',
        input: { command: 'sudo rm -rf /' },
        block: (r) => {
          blocked = r;
        },
      },
      { registry, cache, config, ui },
    );
    expect(blocked).toContain('tier-4');
    expect(prompted).toBe(false);
  });
});

function makeNoopUi() {
  return {
    confirm: async () => true,
    input: async () => '',
    select: async () => '',
  };
}
