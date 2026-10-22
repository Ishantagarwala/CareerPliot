import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Spaced-repetition scheduler.
 *
 * These assertions are the contract between what the review buttons promise
 * ("Good · 3d") and what the card is actually scheduled for. The scheduler is
 * the one piece here where a quiet error compounds: an interval that grows from
 * zero, or an ease floor that is not enforced, makes a card due forever and the
 * deck useless.
 *
 * Run with:  npm run check:srs
 */

const {
  scheduleCard,
  previewRatings,
  formatDelay,
  isDue,
  normalizeSchedulableCard,
  MIN_EASE,
  MAX_INTERVAL_DAYS,
  RELEARN_DELAY_MS,
} = await import('../srs.ts');

const NOW = new Date('2026-01-01T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const freshCard = {
  state: 'new',
  intervalDays: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
};

const dayAfter = (days) => new Date(NOW.getTime() + days * DAY).toISOString();

test('a new card answered "good" is due tomorrow', () => {
  const next = scheduleCard(freshCard, 'good', NOW);
  assert.equal(next.state, 'review');
  assert.equal(next.intervalDays, 1);
  assert.equal(next.reps, 1);
  assert.equal(next.lapses, 0);
  assert.equal(next.ease, 2.5);
  assert.equal(next.dueAt.toISOString(), dayAfter(1));
});

test('a new card answered "easy" skips ahead three days', () => {
  const next = scheduleCard(freshCard, 'easy', NOW);
  assert.equal(next.intervalDays, 3);
  assert.equal(next.ease, 2.65);
  assert.equal(next.dueAt.toISOString(), dayAfter(3));
});

test('a new card answered "hard" waits a day and loses ease', () => {
  const next = scheduleCard(freshCard, 'hard', NOW);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.ease, 2.35);
  assert.equal(next.dueAt.toISOString(), dayAfter(1));
});

test('"again" relearns in ten minutes and counts a lapse', () => {
  const next = scheduleCard({ ...freshCard, reps: 3, intervalDays: 12 }, 'again', NOW);
  assert.equal(next.state, 'relearning');
  assert.equal(next.intervalDays, 0);
  assert.equal(next.reps, 0);
  assert.equal(next.lapses, 1);
  assert.equal(next.ease, 2.3);
  assert.equal(next.dueAt.getTime(), NOW.getTime() + RELEARN_DELAY_MS);
});

test('ease never falls below the floor', () => {
  const next = scheduleCard(
    { state: 'relearning', intervalDays: 0, ease: MIN_EASE, reps: 0, lapses: 4 },
    'again',
    NOW
  );
  assert.equal(next.ease, MIN_EASE);
});

test('a reviewed card grows by its ease factor', () => {
  const next = scheduleCard(
    { state: 'review', intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 },
    'good',
    NOW
  );
  assert.equal(next.intervalDays, 3);
  assert.equal(next.reps, 2);
  assert.equal(next.dueAt.toISOString(), dayAfter(3));
});

test('"easy" applies both the ease bonus and the easy multiplier', () => {
  const next = scheduleCard(
    { state: 'review', intervalDays: 10, ease: 2.5, reps: 3, lapses: 0 },
    'easy',
    NOW
  );
  // 10 * 2.65 * 1.3 = 34.45
  assert.equal(next.intervalDays, 34);
});

test('intervals are capped rather than growing without bound', () => {
  const next = scheduleCard(
    { state: 'review', intervalDays: 300, ease: 3.0, reps: 9, lapses: 0 },
    'easy',
    NOW
  );
  assert.equal(next.intervalDays, MAX_INTERVAL_DAYS);
});

test('a lapsed card restarts at one day, not interval × ease', () => {
  const lapsed = scheduleCard({ ...freshCard, reps: 5, intervalDays: 20 }, 'again', NOW);
  const recovered = scheduleCard(lapsed, 'good', NOW);
  assert.equal(recovered.intervalDays, 1);
  assert.equal(recovered.state, 'review');
  assert.equal(recovered.dueAt.toISOString(), dayAfter(1));
});

test('corrupt stored cards are repaired before scheduling', () => {
  const repaired = normalizeSchedulableCard({ intervalDays: -4, ease: 0, reps: -2, lapses: NaN });
  assert.equal(repaired.intervalDays, 0);
  assert.equal(repaired.ease, 2.5);
  assert.equal(repaired.reps, 0);
  assert.equal(repaired.lapses, 0);
  assert.equal(repaired.state, 'new');
});

test('previewRatings matches the real schedule', () => {
  const preview = previewRatings(freshCard, NOW);
  assert.equal(preview.again, '10m');
  assert.equal(preview.hard, '1d');
  assert.equal(preview.good, '1d');
  assert.equal(preview.easy, '3d');
});

test('formatDelay is coarse and readable', () => {
  assert.equal(formatDelay(0), 'now');
  assert.equal(formatDelay(-5000), 'now');
  assert.equal(formatDelay(10 * 60_000), '10m');
  assert.equal(formatDelay(6 * 3_600_000), '6h');
  assert.equal(formatDelay(DAY), '1d');
  assert.equal(formatDelay(30 * DAY), '1mo');
  assert.equal(formatDelay(400 * DAY), '1y');
});

test('isDue treats a missing or invalid due date as due', () => {
  assert.equal(isDue({ dueAt: new Date(NOW.getTime() - 1000) }, NOW), true);
  assert.equal(isDue({ dueAt: new Date(NOW.getTime() + 60_000) }, NOW), false);
  assert.equal(isDue({ dueAt: '2026-01-02T09:00:00.000Z' }, NOW), false);
  assert.equal(isDue({ dueAt: 'not a date' }, NOW), true);
  assert.equal(isDue({}, NOW), true);
});
