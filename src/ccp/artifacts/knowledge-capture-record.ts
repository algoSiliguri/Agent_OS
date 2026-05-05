import { type Static, Type } from '@sinclair/typebox';
import { ArtifactEnvelope } from './envelope';

const Scope = Type.Union([
  Type.Literal('session'),
  Type.Literal('project'),
  Type.Literal('global'),
]);

export const CaptureType = Type.Union([
  Type.Literal('decision'),
  Type.Literal('convention'),
  Type.Literal('command'),
  Type.Literal('warning'),
  Type.Literal('pattern'),
  Type.Literal('failure'),
  Type.Literal('architecture'),
]);
export type CaptureType = Static<typeof CaptureType>;

const Approval = Type.Union([
  Type.Literal('pending'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
]);

const CaptureItem = Type.Object({
  id: Type.String(),
  scope: Scope,
  type: CaptureType,
  text: Type.String(),
  evidence: Type.String(),
  approval: Approval,
});

export const KnowledgeCaptureRecord = Type.Composite([
  ArtifactEnvelope,
  Type.Object({
    artifact_type: Type.Literal('KnowledgeCaptureRecord'),
    items: Type.Array(CaptureItem),
  }),
]);
export type KnowledgeCaptureRecord = Static<typeof KnowledgeCaptureRecord>;
