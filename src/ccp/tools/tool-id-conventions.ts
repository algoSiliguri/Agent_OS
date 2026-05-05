import type { ToolMetadata } from '../policy/tool-registry';

export type PiToolDefault = ToolMetadata;

export function piToolDefaults(): PiToolDefault[] {
  const base = (overrides: Partial<ToolMetadata>): ToolMetadata => ({
    tool_id: '',
    source: 'pi',
    trust_level: 'trusted',
    capability_type: 'READ_LOCAL',
    read_or_write: 'read',
    network_required: false,
    workspace_required: true,
    approval_tier: 1,
    audit_metadata: {},
    retry_policy: 'idempotent',
    idempotency_key_support: false,
    ...overrides,
  });
  return [
    base({
      tool_id: 'read_file',
      capability_type: 'READ_LOCAL',
      read_or_write: 'read',
      approval_tier: 1,
    }),
    base({
      tool_id: 'list_dir',
      capability_type: 'READ_LOCAL',
      read_or_write: 'read',
      approval_tier: 1,
    }),
    base({
      tool_id: 'search',
      capability_type: 'READ_LOCAL',
      read_or_write: 'read',
      approval_tier: 1,
    }),
    base({
      tool_id: 'show_diff',
      capability_type: 'READ_LOCAL',
      read_or_write: 'read',
      approval_tier: 1,
    }),
    base({
      tool_id: 'write_file',
      capability_type: 'WRITE_LOCAL',
      read_or_write: 'write',
      approval_tier: 2,
    }),
    base({
      tool_id: 'edit_file',
      capability_type: 'WRITE_LOCAL',
      read_or_write: 'write',
      approval_tier: 2,
    }),
    base({
      tool_id: 'delete_file',
      capability_type: 'WRITE_LOCAL',
      read_or_write: 'write',
      approval_tier: 3,
    }),
    base({
      tool_id: 'run_command',
      capability_type: 'EXECUTE_LOCAL',
      read_or_write: 'write',
      approval_tier: 2,
      retry_policy: 'manual_only',
    }),
    base({
      tool_id: 'http_get',
      capability_type: 'READ_NETWORK',
      read_or_write: 'read',
      network_required: true,
      workspace_required: false,
      approval_tier: 3,
    }),
    base({
      tool_id: 'http_post',
      capability_type: 'WRITE_NETWORK',
      read_or_write: 'write',
      network_required: true,
      workspace_required: false,
      approval_tier: 3,
    }),
    base({
      tool_id: 'browser_navigate',
      capability_type: 'BROWSER_READ',
      read_or_write: 'read',
      network_required: true,
      workspace_required: false,
      approval_tier: 2,
    }),
    base({
      tool_id: 'browser_click',
      capability_type: 'BROWSER_WRITE',
      read_or_write: 'write',
      network_required: true,
      workspace_required: false,
      approval_tier: 3,
    }),
    base({
      tool_id: 'brain_query',
      source: 'extension',
      capability_type: 'MEMORY_READ',
      read_or_write: 'read',
      approval_tier: 1,
      workspace_required: false,
    }),
    base({
      tool_id: 'brain_write',
      source: 'extension',
      capability_type: 'MEMORY_WRITE',
      read_or_write: 'write',
      approval_tier: 2,
      workspace_required: false,
    }),
  ];
}
