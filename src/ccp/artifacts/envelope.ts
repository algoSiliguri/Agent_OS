import { randomUUID } from 'node:crypto';
import { type Static, Type } from '@sinclair/typebox';

export const CURRENT_SCHEMA_VERSION = 1;
export const CURRENT_POLICY_VERSION = 'v1';
export const CURRENT_MANIFEST_VERSION = 'v1';

export const ValidatedUnder = Type.Object({
  schema_version: Type.Number(),
  policy_version: Type.String(),
  manifest_version: Type.String(),
});
export type ValidatedUnder = Static<typeof ValidatedUnder>;

export const ArtifactEnvelope = Type.Object({
  artifact_id: Type.String(),
  task_id: Type.String(),
  artifact_type: Type.String(),
  schema_version: Type.Number(),
  policy_version: Type.String(),
  manifest_version: Type.String(),
  created_at: Type.String(),
  validated_under: ValidatedUnder,
});
export type ArtifactEnvelope = Static<typeof ArtifactEnvelope>;

export function makeEnvelope(args: {
  taskId: string;
  artifactType: string;
  now?: Date;
}): ArtifactEnvelope {
  const ts = (args.now ?? new Date()).toISOString();
  return {
    artifact_id: randomUUID(),
    task_id: args.taskId,
    artifact_type: args.artifactType,
    schema_version: CURRENT_SCHEMA_VERSION,
    policy_version: CURRENT_POLICY_VERSION,
    manifest_version: CURRENT_MANIFEST_VERSION,
    created_at: ts,
    validated_under: {
      schema_version: CURRENT_SCHEMA_VERSION,
      policy_version: CURRENT_POLICY_VERSION,
      manifest_version: CURRENT_MANIFEST_VERSION,
    },
  };
}
