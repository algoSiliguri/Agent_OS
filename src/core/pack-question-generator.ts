import type { DetectedDoc } from './doc-detector';
import type {
  GrillCategory,
  NextQuestion,
  NextQuestionContext,
  QuestionGenerator,
} from '../ccp/commands/shared/question-generator';

const HARD_CAP = 12;

function docTitles(docs: DetectedDoc[]): string {
  return docs.map((d) => d.title).join(', ');
}

function buildSequence(detectedDocs: DetectedDoc[]): NextQuestion[] {
  const hasDocs = detectedDocs.length > 0;
  const titles = hasDocs ? docTitles(detectedDocs) : '';

  const base: NextQuestion[] = [
    {
      category: 'assumption',
      question: 'What does this idea ASSUME about the existing code or system that might be wrong?',
      whyItMatters: 'Wrong assumptions drive wasted work.',
    },
    {
      category: 'assumption',
      question: 'Which files or modules are MOST LIKELY to be touched by this change?',
      whyItMatters: 'Grounds scope before planning begins.',
    },
    {
      category: 'risk',
      question: 'What is the WORST that could happen if this ships and is wrong?',
      whyItMatters: 'Calibrates blast radius.',
    },
    {
      category: 'risk',
      question: 'What is the most likely FAILURE MODE during implementation?',
      whyItMatters: 'Lets the plan pre-empt predictable problems.',
    },
    {
      category: 'constraint',
      question: 'What MUST NOT change or break as part of this work?',
      whyItMatters: 'Sets hard boundaries before planning.',
    },
    {
      category: 'success_criterion',
      question: 'What is the exact signal that this is DONE — specific test, log, or output?',
      whyItMatters: 'Prevents "kind of works" from shipping.',
    },
    {
      category: 'success_criterion',
      question: 'What COMMAND will verify this is correct after implementation?',
      whyItMatters: 'Makes verification concrete and runnable.',
    },
  ];

  if (hasDocs) {
    base.push({
      category: 'evidence' as GrillCategory,
      question: `Detected docs: ${titles}. Does this change CONTRADICT or require updating any of them?`,
      whyItMatters: 'Prevents shipping work that conflicts with documented process or constraints.',
    });
  } else {
    base.push({
      category: 'evidence' as GrillCategory,
      question: 'What evidence (file, log, test, prior art) supports the chosen approach?',
      whyItMatters: 'Distinguishes grounded decisions from guesswork.',
    });
  }

  return base;
}

/**
 * Doc-grounded question generator.
 * Receives pre-computed DetectedDoc[] at construction — no IO inside next().
 * Terminates on "done" sentinel or when maxQuestions is reached.
 */
export class PackQuestionGenerator implements QuestionGenerator {
  private readonly sequence: NextQuestion[];
  private readonly max: number;

  constructor(detectedDocs: DetectedDoc[], maxQuestions: number) {
    this.max = Math.min(Math.max(1, maxQuestions), HARD_CAP);
    this.sequence = buildSequence(detectedDocs).slice(0, this.max);
  }

  async next(ctx: NextQuestionContext): Promise<NextQuestion | null> {
    const last = ctx.priorAnswers[ctx.priorAnswers.length - 1];
    if (last && last.answer.trim().toLowerCase() === 'done') return null;
    const idx = ctx.priorAnswers.length;
    if (idx >= this.sequence.length) return null;
    return this.sequence[idx] ?? null;
  }
}
