/**
 * SM-2 Spaced Repetition Algorithm implementation.
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
 * Adapted for flashcard vocabulary learning with 4-level rating system.
 *
 * Rating scale:
 * - 1 (Again): Complete failure, reset progress
 * - 2 (Hard): Difficult recall, short interval
 * - 3 (Good): Successful recall, standard interval
 * - 4 (Easy): Perfect recall, longer interval
 */

export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
}

export function calculateSM2(
  rating: number,
  currentEaseFactor: number = 2.5,
  currentInterval: number = 0,
  currentRepetitions: number = 0,
): SM2Result {
  let ease = Math.max(currentEaseFactor, 1.3);
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  if (rating >= 3) {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(currentInterval * ease);
    }
    repetitions += 1;
  } else {
    // Failed recall - reset
    repetitions = 0;
    interval = 1;
  }

  // Adjust ease factor based on rating
  const qMap: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5 };
  const q = qMap[rating] ?? 3;
  const easeDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  ease = Math.max(ease + easeDelta, 1.3);

  // Hard rating: reduce interval slightly
  if (rating === 2) {
    interval = Math.max(Math.round(currentInterval * 1.2), 1);
  }

  // Easy rating: bonus interval
  if (rating === 4 && currentRepetitions > 0) {
    interval = Math.round(interval * 1.3);
  }

  // Cap maximum interval at 365 days
  interval = Math.min(interval, 365);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    easeFactor: Math.round(ease * 100) / 100,
    intervalDays: interval,
    repetitions,
    nextReviewAt,
  };
}

export function getInitialState() {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: null as Date | null,
  };
}
