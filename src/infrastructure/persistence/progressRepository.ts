const STORAGE_KEY = 'cyber-academy-progress-v1';

export interface PlayerProgress {
  completed: string[];
  xp: number;
}

const emptyProgress = (): PlayerProgress => ({ completed: [], xp: 0 });

export function loadProgress(): PlayerProgress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Data progres lokal tidak dapat dibaca.', { cause: error });
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('completed' in parsed) ||
    !Array.isArray(parsed.completed) ||
    !parsed.completed.every((id) => typeof id === 'string') ||
    !('xp' in parsed) ||
    typeof parsed.xp !== 'number' ||
    !Number.isFinite(parsed.xp)
  ) {
    throw new Error('Format progres lokal tidak valid.');
  }
  return { completed: parsed.completed, xp: parsed.xp };
}

export function saveProgress(progress: PlayerProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
