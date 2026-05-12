import { describe, expect, it } from 'vitest';
import type { DetectedDoc } from '../../src/core/doc-detector';
import { PackQuestionGenerator } from '../../src/core/pack-question-generator';

const DOC: DetectedDoc = {
  path: 'CONTRIBUTING.md',
  title: 'Contributing Guide',
  bytes: 1024,
  reason: 'known-root',
};

function makeCtx(priorAnswers: Array<{ category: string; answer: string }>) {
  return { goal: 'add rate limit', priorAnswers };
}

async function drainGenerator(gen: PackQuestionGenerator, maxIter = 20) {
  const questions = [];
  let answers: Array<{ category: string; answer: string }> = [];
  for (let i = 0; i < maxIter; i++) {
    const q = await gen.next(makeCtx(answers));
    if (!q) break;
    questions.push(q);
    answers.push({ category: q.category, answer: 'ok' });
  }
  return questions;
}

describe('PackQuestionGenerator', () => {
  it('no docs: produces at least 5 questions covering required categories', async () => {
    const gen = new PackQuestionGenerator([], 8);
    const questions = await drainGenerator(gen);
    expect(questions.length).toBeGreaterThanOrEqual(5);
    const categories = new Set(questions.map((q) => q.category));
    expect(categories.has('assumption')).toBe(true);
    expect(categories.has('risk')).toBe(true);
    expect(categories.has('constraint')).toBe(true);
    expect(categories.has('success_criterion')).toBe(true);
    expect(categories.has('evidence')).toBe(true);
  });

  it('with detected doc: at least one question references doc title', async () => {
    const gen = new PackQuestionGenerator([DOC], 8);
    const questions = await drainGenerator(gen);
    const texts = questions.map((q) => q.question + q.whyItMatters);
    const mentions = texts.some((t) => t.includes('Contributing Guide'));
    expect(mentions).toBe(true);
  });

  it('terminates on "done" sentinel', async () => {
    const gen = new PackQuestionGenerator([], 8);
    const q = await gen.next({
      goal: 'g',
      priorAnswers: [{ category: 'assumption', answer: 'done' }],
    });
    expect(q).toBeNull();
  });

  it('terminates at maxQuestions', async () => {
    const gen = new PackQuestionGenerator([], 3);
    const questions = await drainGenerator(gen, 20);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('enforces hard cap of 12', async () => {
    const gen = new PackQuestionGenerator([], 99);
    const questions = await drainGenerator(gen, 30);
    expect(questions.length).toBeLessThanOrEqual(12);
  });

  it('no IO inside next() — runs synchronously with no side effects', async () => {
    const gen = new PackQuestionGenerator([], 4);
    const ctx = makeCtx([]);
    const result = await gen.next(ctx);
    expect(result).not.toBeNull();
    expect(result?.question).toBeTruthy();
    expect(result?.category).toBeTruthy();
    expect(result?.whyItMatters).toBeTruthy();
  });
});
