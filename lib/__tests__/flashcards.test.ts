import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Flashcard generation.
 *
 * Two properties matter here. The first is that nothing unlearnable reaches
 * the database: a card whose back is its own front, a blank card, a duplicate,
 * or one asking three things at once. The second is that the number returned
 * is a ceiling rather than a quota — a model that produces four good cards when
 * asked for twelve must not be padded out with filler.
 *
 * Run with:  npm run check:flashcards
 */

const {
  normalizeGeneratedCards,
  cardKey,
  deckNameForDocument,
  clampCardCount,
  buildFlashcardPrompts,
  MIN_CARDS_PER_GENERATION,
  MAX_CARDS_PER_GENERATION,
  DEFAULT_CARDS_PER_GENERATION,
} = await import('../flashcards.ts');

test('cards are read from the documented shape', () => {
  const cards = normalizeGeneratedCards(
    {
      cards: [
        { front: 'What is a closure?', back: 'A function with its lexical scope.', page: 3 },
        { front: 'Why use an index?', back: 'To avoid a full table scan.' },
      ],
    },
    10
  );
  assert.equal(cards.length, 2);
  assert.equal(cards[0].page, 3);
  assert.equal(cards[1].page, undefined);
});

test('a bare array and an alternative envelope both work', () => {
  const bare = normalizeGeneratedCards([{ front: 'A?', back: 'B.' }], 5);
  assert.equal(bare.length, 1);

  const wrapped = normalizeGeneratedCards(
    { flashcards: [{ term: 'Big-O', definition: 'Growth rate of an algorithm.' }] },
    5
  );
  assert.equal(wrapped.length, 1);
  assert.equal(wrapped[0].front, 'Big-O');
});

test('blank, self-answering and duplicate cards are dropped', () => {
  const cards = normalizeGeneratedCards(
    [
      { front: 'What is a closure?', back: 'A function plus its scope.' },
      { front: 'what is a closure', back: 'Different wording, same card.' },
      { front: '   ', back: 'Nothing to ask.' },
      { front: 'Why indexes?', back: 'Why indexes?' },
      { front: 'When is an index used?', back: 'When filtering on its columns.' },
    ],
    10
  );
  assert.equal(cards.length, 2);
  assert.equal(cards[0].front, 'What is a closure?');
  assert.equal(cards[1].front, 'When is an index used?');
});

test('count is a ceiling, not a target', () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    front: `Question ${index}?`,
    back: `Answer ${index}.`,
  }));
  assert.equal(normalizeGeneratedCards(items, 5).length, 5);
  assert.equal(normalizeGeneratedCards(items.slice(0, 3), 12).length, 3);
});

test('an invalid page number is dropped rather than stored as zero', () => {
  const cards = normalizeGeneratedCards(
    [
      { front: 'A?', back: 'B.', page: 0 },
      { front: 'C?', back: 'D.', page: -2 },
      { front: 'E?', back: 'F.', page: 'x' },
      { front: 'G?', back: 'H.', page: 12 },
    ],
    10
  );
  assert.deepEqual(
    cards.map((card) => card.page),
    [undefined, undefined, undefined, 12]
  );
});

test('garbage input yields no cards instead of throwing', () => {
  assert.deepEqual(normalizeGeneratedCards(null, 10), []);
  assert.deepEqual(normalizeGeneratedCards('not json', 10), []);
  assert.deepEqual(normalizeGeneratedCards({ cards: 'nope' }, 10), []);
  assert.deepEqual(normalizeGeneratedCards([{ front: 'A?' }], 10), []);
});

test('cardKey ignores case, punctuation and spacing', () => {
  assert.equal(cardKey('What is a closure?'), cardKey('what is a   closure'));
  assert.notEqual(cardKey('What is a closure?'), cardKey('What is a promise?'));
  assert.equal(cardKey('   '), '');
});

test('deck names lose the extension', () => {
  assert.equal(deckNameForDocument('Data Structures.pdf'), 'Data Structures');
  assert.equal(deckNameForDocument('notes'), 'notes');
  assert.equal(deckNameForDocument(''), 'Untitled');
  assert.equal(deckNameForDocument('.pdf'), 'Untitled');
  assert.ok(deckNameForDocument('x'.repeat(200)).length <= 60);
});

test('card count is clamped to a sane range', () => {
  assert.equal(clampCardCount(1), MIN_CARDS_PER_GENERATION);
  assert.equal(clampCardCount(1000), MAX_CARDS_PER_GENERATION);
  assert.equal(clampCardCount(undefined), DEFAULT_CARDS_PER_GENERATION);
  assert.equal(clampCardCount('16'), 16);
});

test('the prompt carries the deck, the count and the material', () => {
  const prompts = buildFlashcardPrompts({
    deck: 'Operating Systems',
    context: 'A deadlock needs four conditions.',
    count: 8,
    role: 'Backend Developer',
  });
  assert.match(prompts.system, /ONLY JSON/);
  assert.match(prompts.system, /One fact or idea per card/);
  assert.match(prompts.user, /Operating Systems/);
  assert.match(prompts.user, /Write 8 cards/);
  assert.match(prompts.user, /A deadlock needs four conditions/);
  assert.match(prompts.user, /Backend Developer/);
});
