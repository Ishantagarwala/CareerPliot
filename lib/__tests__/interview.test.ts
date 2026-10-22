import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Mock interview: prompt input and model output.
 *
 * The scorecard is the only artefact a student keeps from a session, so the
 * normaliser must produce something readable from anything the model returns —
 * including an empty object. These tests cover the shapes seen in practice:
 * a 0–10 score, a score above 100, a wrapped object, prose instead of JSON,
 * and a dimension list that is longer than the UI can show.
 *
 * Run with:  npm run check:interview
 */

const {
  normalizeScorecard,
  normalizeInterviewerReply,
  normalizeScore,
  verdictForScore,
  buildOpeningQuestion,
  buildTurnPrompts,
  buildScorecardPrompts,
  clampQuestionCount,
  countAnsweredQuestions,
  isInterviewComplete,
  configFromSession,
} = await import('../interview.ts');

const config = {
  role: 'Backend Developer',
  interviewType: 'behavioral',
  difficulty: 'entry',
  maxQuestions: 6,
  company: 'Zoho',
};

test('an empty response still produces a readable report', () => {
  const card = normalizeScorecard({});
  assert.equal(card.overallScore, 60);
  assert.equal(card.verdict, 'Lean hire');
  assert.equal(card.dimensions.length, 4);
  assert.ok(card.summary.length > 0);
  assert.equal(card.strengths.length, 1);
  assert.equal(card.improvements.length, 1);
  assert.equal(card.practice.length, 1);
});

test('a 0–10 score is scaled rather than read as a failure', () => {
  assert.equal(normalizeScore(9, 60), 90);
  assert.equal(normalizeScore(7.5, 60), 75);
});

test('scores are clamped to 0–100', () => {
  assert.equal(normalizeScore(480, 60), 100);
  assert.equal(normalizeScore(-20, 60), 0);
  assert.equal(normalizeScore('82', 60), 82);
  assert.equal(normalizeScore(undefined, 33), 33);
  assert.equal(normalizeScore('abc', 33), 33);
});

test('verdict bands match the scoring guide', () => {
  assert.equal(verdictForScore(90), 'Strong hire');
  assert.equal(verdictForScore(75), 'Hire');
  assert.equal(verdictForScore(60), 'Lean hire');
  assert.equal(verdictForScore(45), 'Not yet ready');
  assert.equal(verdictForScore(10), 'Significant gaps');
});

test('dimensions are parsed, scaled and capped', () => {
  const card = normalizeScorecard({
    overallScore: 71,
    dimensions: [
      { name: 'Structure', score: 8, note: 'Clear ordering.' },
      { name: 'Specificity', score: 55, note: 'One example only.' },
      { name: 'Technical depth', score: 400 },
      { name: '', score: 90, note: 'no name' },
      ...Array.from({ length: 6 }, (_, index) => ({
        name: `Extra ${index}`,
        score: 50,
        note: '',
      })),
    ],
  });
  assert.equal(card.dimensions.length, 6);
  assert.equal(card.dimensions[0].score, 80);
  assert.equal(card.dimensions[1].score, 55);
  assert.equal(card.dimensions[2].score, 100);
});

test('list fields are trimmed, de-duplicated and bounded', () => {
  const card = normalizeScorecard({
    overallScore: 66,
    strengths: ['  Concrete example  ', 'concrete example', 'Good structure', ''],
    improvements: Array.from({ length: 9 }, (_, index) => `Improvement ${index}`),
    practice: 'not an array',
  });
  assert.deepEqual(card.strengths, ['Concrete example', 'Good structure']);
  assert.equal(card.improvements.length, 5);
  assert.equal(card.practice.length, 1);
});

test('a prose reply keeps its text as the next question', () => {
  const reply = normalizeInterviewerReply('Tell me more about the caching layer.');
  assert.equal(reply.acknowledgement, '');
  assert.equal(reply.question, 'Tell me more about the caching layer.');
});

test('a wrapped object is unwrapped', () => {
  const reply = normalizeInterviewerReply({
    response: { acknowledgement: 'Good detail there.', question: 'What broke first?' },
  });
  assert.equal(reply.acknowledgement, 'Good detail there.');
  assert.equal(reply.question, 'What broke first?');
});

test('a missing question falls back instead of rendering an empty turn', () => {
  const reply = normalizeInterviewerReply({ acknowledgement: 'Okay.' });
  assert.equal(reply.acknowledgement, 'Okay.');
  assert.ok(reply.question.length > 10);
});

test('the opening question names the role and company', () => {
  const question = buildOpeningQuestion(config);
  assert.match(question, /Backend Developer/);
  assert.match(question, /Zoho/);
});

test('turn prompts carry the transcript and the answer, delimited', () => {
  const prompts = buildTurnPrompts({
    config,
    turns: [
      { role: 'interviewer', content: 'Tell me about yourself.' },
      { role: 'candidate', content: 'I build APIs.' },
    ],
    answer: 'I led a migration.',
    asked: 2,
  });
  assert.match(prompts.system, /ONE question/);
  assert.match(prompts.user, /I build APIs/);
  assert.match(prompts.user, /<candidate_answer>\nI led a migration\./);
  assert.match(prompts.user, /2 of 6/);
});

test('scorecard prompt asks for the four dimensions and JSON only', () => {
  const prompts = buildScorecardPrompts({
    config,
    turns: [{ role: 'candidate', content: 'I build APIs.' }],
  });
  assert.match(prompts.system, /Structure, Specificity, Technical depth, Communication/);
  assert.match(prompts.system, /ONLY JSON/);
  assert.match(prompts.user, /I build APIs/);
});

test('question count is clamped to what the prompt and UI support', () => {
  assert.equal(clampQuestionCount(99), 12);
  assert.equal(clampQuestionCount(0), 3);
  assert.equal(clampQuestionCount('abc'), 6);
  assert.equal(clampQuestionCount(7.6), 8);
});

test('answered-question counting ignores interviewer turns', () => {
  const turns = [
    { role: 'interviewer', content: 'Q1' },
    { role: 'candidate', content: 'A1' },
    { role: 'interviewer', content: 'Q2' },
  ];
  assert.equal(countAnsweredQuestions(turns), 1);
  assert.equal(isInterviewComplete(turns, 1), true);
  assert.equal(isInterviewComplete(turns, 3), false);
});

test('configFromSession fills the gaps a stored document can have', () => {
  const built = configFromSession({
    role: 'Data Analyst',
    interviewType: 'technical',
    difficulty: 'mid',
    maxQuestions: 8,
    company: null,
    jobTitle: undefined,
  });
  assert.equal(built.role, 'Data Analyst');
  assert.equal(built.company, undefined);
  assert.equal(built.jobTitle, undefined);
  assert.equal(built.maxQuestions, 8);
});
