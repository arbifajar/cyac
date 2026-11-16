import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { learningChallenges } from '../../domain/learning';
import { loadProgress, saveProgress, type PlayerProgress } from '../../infrastructure/persistence/progressRepository';

export const useGameStore = defineStore('game', () => {
  const progress = ref<PlayerProgress>({ completed: [], xp: 0 });
  const currentChallenge = computed(
    () => learningChallenges.find((challenge) => !progress.value.completed.includes(challenge.id)) ?? null,
  );

  function initialize(onError: (message: string) => void): void {
    try {
      progress.value = loadProgress();
    } catch (error) {
      console.error('Gagal memuat progres lokal.', error);
      onError('Progres lokal gagal dibaca. Permainan dimulai dengan progres baru; penyimpanan browser mungkin diblokir.');
    }
  }

  function completeChallenge(id: string, onError: (message: string) => void): boolean {
    if (currentChallenge.value?.id !== id) return false;
    const updated = {
      completed: [...progress.value.completed, id],
      xp: progress.value.xp + 100,
    };
    progress.value = updated;
    try {
      saveProgress(updated);
    } catch (error) {
      console.error('Gagal menyimpan progres lokal.', error);
      onError('Misi selesai, tetapi progres tidak dapat disimpan di browser ini.');
    }
    return true;
  }

  function reset(onError: (message: string) => void): void {
    const empty: PlayerProgress = { completed: [], xp: 0 };
    progress.value = empty;
    try {
      saveProgress(empty);
    } catch (error) {
      console.error('Gagal mengatur ulang progres lokal.', error);
      onError('Progres sudah diatur ulang untuk sesi ini, tetapi perubahan tidak dapat disimpan.');
    }
  }

  return { progress, currentChallenge, initialize, completeChallenge, reset };
});
