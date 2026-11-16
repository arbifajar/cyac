<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ACADEMY_MAP_BOUNDS, ACADEMY_MAP_POINTS } from '../domain/academyMap';
import { learningChallenges, type LearningChallenge } from '../domain/learning';
import { endingCutscene, prologueCutscene, type StoryCutscene } from '../domain/story';
import {
  GameRuntime,
  type CameraMode,
  type LocomotionState,
  type TimePreset,
  type WeatherPreset,
  type WorldMapState,
} from '../game/GameRuntime';
import ComputerTerminal from './ComputerTerminal.vue';
import { useGameStore } from './stores/gameStore';

const viewport = ref<HTMLElement | null>(null);
const runtime = ref<GameRuntime | null>(null);
const ready = ref(false);
const started = ref(false);
const fatalError = ref('');
const notices = ref<string[]>([]);
const nearbyId = ref<string | null>(null);
const locomotion = ref<LocomotionState>('idle');
const activeChallenge = ref<LearningChallenge | null>(null);
const journalOpen = ref(false);
const showAria = ref(true);
const mobilePanelOpen = ref(true);
const academyDoorOpen = ref(false);
const soundEnabled = ref(true);
const cameraMode = ref<CameraMode>('cinematic');
const environmentOpen = ref(false);
const timePreset = ref<TimePreset>('day');
const weatherPreset = ref<WeatherPreset>('clear');
const activeCutscene = ref<StoryCutscene | null>(null);
const cutsceneIndex = ref(0);
const dialogueSubtitle = ref<{ speaker: string; text: string } | null>(null);
const mapPose = ref<WorldMapState>({ x: -6, z: 11, yaw: 0 });
const selectedWaypointId = ref<string | null>(null);
const stick = ref({ x: 0, y: 0 });
const stickPointer = ref<number | null>(null);
const stickElement = ref<HTMLElement | null>(null);
const gameStore = useGameStore();
const progress = computed(() => gameStore.progress);
const nextChallenge = computed(() => gameStore.currentChallenge);

const activeChallengeIndex = computed(() => {
  return nextChallenge.value ? learningChallenges.indexOf(nextChallenge.value) : learningChallenges.length;
});
const chapterComplete = computed(() => activeChallengeIndex.value === learningChallenges.length);
const completionPercent = computed(() => Math.round((progress.value.completed.length / learningChallenges.length) * 100));
const nearbyChallenge = computed(() => learningChallenges.find((challenge) => challenge.id === nearbyId.value) ?? null);
const nearbyDoor = computed(() => nearbyId.value === 'academy-door');
const nearbyAi = computed(() => nearbyId.value?.startsWith('ai:') ?? false);
const currentCutsceneBeat = computed(() => activeCutscene.value?.beats[cutsceneIndex.value] ?? null);
const waypointId = computed(
  () => selectedWaypointId.value ?? nextChallenge.value?.id ?? (chapterComplete.value ? 'academy-door' : null),
);
const mapPlayerPoint = computed(() => mapCoordinates(mapPose.value.x, mapPose.value.z));
const mapTarget = computed(() => ACADEMY_MAP_POINTS.find((point) => point.id === waypointId.value) ?? null);
const mapTargetPoint = computed(() =>
  mapTarget.value ? mapCoordinates(mapTarget.value.x, mapTarget.value.z) : null,
);
const mapPlayerStyle = computed(() => ({
  left: `${mapPlayerPoint.value.x}%`,
  top: `${mapPlayerPoint.value.y}%`,
  transform: `translate(-50%, -50%) rotate(${mapPose.value.yaw * 180 / Math.PI + 180}deg)`,
}));
const mapMarkers = computed(() => ACADEMY_MAP_POINTS.map((point) => {
  const challengeIndex = learningChallenges.findIndex((challenge) => challenge.id === point.id);
  const complete = progress.value.completed.includes(point.id);
  return {
    ...point,
    challengeIndex,
    complete,
    locked: point.kind === 'door'
      ? !progress.value.completed.includes('credentials')
      : challengeIndex > activeChallengeIndex.value,
    current: point.id === waypointId.value,
  };
}));
const guideTitle = computed(() => {
  if (activeChallenge.value) return 'Jalankan simulasi di terminal';
  if (waypointId.value === 'academy-door') return 'Menuju pintu keamanan';
  return nextChallenge.value?.station ?? 'Akademi dipulihkan';
});
const guideInstruction = computed(() => {
  if (activeChallenge.value) return 'Operasikan komputer untuk menerapkan prosedur keamanan.';
  if (waypointId.value === 'academy-door') {
    if (academyDoorOpen.value) return 'Pintu terbuka. Lewati pintu untuk menuju zona berikutnya.';
    if (nearbyDoor.value) return 'Tekan E untuk membuka pintu dan berpindah zona.';
    return 'Ikuti penanda pintu di map, lalu tekan E untuk membuka akses.';
  }
  if (!nextChallenge.value) return 'Semua protokol selesai. Periksa peta untuk tujuan akhir.';
  if (nearbyChallenge.value?.id === nextChallenge.value.id) {
    return `Tekan E untuk memulai misi ${nextChallenge.value.station}.`;
  }
  return `Ikuti penanda ${nextChallenge.value.station} di map, lalu tekan E di stasiunnya.`;
});
let dialogueTimer = 0;

function mapCoordinates(x: number, z: number): { x: number; y: number } {
  const width = ACADEMY_MAP_BOUNDS.maxX - ACADEMY_MAP_BOUNDS.minX;
  const depth = ACADEMY_MAP_BOUNDS.maxZ - ACADEMY_MAP_BOUNDS.minZ;
  return {
    x: Math.max(0, Math.min(100, ((x - ACADEMY_MAP_BOUNDS.minX) / width) * 100)),
    y: Math.max(0, Math.min(100, ((ACADEMY_MAP_BOUNDS.maxZ - z) / depth) * 100)),
  };
}

function mapMarkerStyle(x: number, z: number): Record<string, string> {
  const point = mapCoordinates(x, z);
  return { left: `${point.x}%`, top: `${point.y}%` };
}

function selectMapPoint(id: string): void {
  const point = ACADEMY_MAP_POINTS.find((item) => item.id === id);
  if (!point) return;
  if (point.kind === 'door') {
    if (!progress.value.completed.includes('credentials')) {
      showNotice('Selesaikan misi Kredensial sebelum membuka penanda pintu.');
      return;
    }
    selectedWaypointId.value = id;
    return;
  }
  const challengeIndex = learningChallenges.findIndex((challenge) => challenge.id === id);
  if (challengeIndex > activeChallengeIndex.value) {
    showNotice('Selesaikan misi aktif terlebih dahulu untuk membuka area ini.');
    return;
  }
  if (progress.value.completed.includes(id)) {
    showNotice('Stasiun ini sudah selesai. Ikuti penanda misi aktif berikutnya.');
    return;
  }
  selectedWaypointId.value = id;
}

function showNotice(message: string): void {
  notices.value = [...notices.value.slice(-1), message];
  window.setTimeout(() => {
    notices.value = notices.value.filter((notice) => notice !== message);
  }, 4200);
}

function beginGame(): void {
  runtime.value?.setAudioEnabled(soundEnabled.value);
  startCutscene(prologueCutscene);
}

function startCutscene(cutscene: StoryCutscene): void {
  activeCutscene.value = cutscene;
  cutsceneIndex.value = 0;
  runtime.value?.setPlaying(false);
  runtime.value?.setCutsceneShot(0);
}

function advanceCutscene(): void {
  if (!activeCutscene.value) return;
  if (cutsceneIndex.value < activeCutscene.value.beats.length - 1) {
    cutsceneIndex.value += 1;
    runtime.value?.setCutsceneShot(cutsceneIndex.value);
    return;
  }
  finishCutscene();
}

function finishCutscene(): void {
  const completedCutscene = activeCutscene.value;
  activeCutscene.value = null;
  cutsceneIndex.value = 0;
  selectedWaypointId.value = null;
  runtime.value?.setCameraMode(cameraMode.value);
  if (completedCutscene?.id === 'prologue') started.value = true;
  runtime.value?.setPlaying(true);
}

function toggleSound(): void {
  soundEnabled.value = !soundEnabled.value;
  runtime.value?.setAudioEnabled(soundEnabled.value);
}

function cycleCameraMode(): void {
  const modes: CameraMode[] = ['cinematic', 'third-close', 'first-person'];
  const nextIndex = (modes.indexOf(cameraMode.value) + 1) % modes.length;
  cameraMode.value = modes[nextIndex] ?? 'cinematic';
  runtime.value?.setCameraMode(cameraMode.value);
}

function updateEnvironment(): void {
  runtime.value?.setEnvironment(timePreset.value, weatherPreset.value);
}

function showDialogue(speaker: string, text: string): void {
  dialogueSubtitle.value = { speaker, text };
  window.clearTimeout(dialogueTimer);
  dialogueTimer = window.setTimeout(() => {
    dialogueSubtitle.value = null;
  }, 5200);
}

function interact(): void {
  if (!nearbyId.value) return;
  runtime.value?.interact();
}

function handleStationInteraction(id: string): void {
  if (id === 'academy-door-locked') {
    showNotice('Pintu keamanan terkunci. Selesaikan misi Kredensial untuk mendapatkan akses.');
    return;
  }
  const challenge = learningChallenges.find((item) => item.id === id);
  if (!challenge || progress.value.completed.includes(id)) return;
  if (challenge.id !== nextChallenge.value?.id) {
    showNotice('Selesaikan misi yang sedang aktif untuk membuka stasiun berikutnya.');
    return;
  }
  activeChallenge.value = challenge;
  runtime.value?.enterWorkstation(id);
  runtime.value?.setPlaying(false);
}

function completeCurrentChallenge(): void {
  if (!activeChallenge.value) return;
  const id = activeChallenge.value.id;
  if (!gameStore.completeChallenge(id, showNotice)) return;
  runtime.value?.completeChallenge(id);
  selectedWaypointId.value = null;
}

function closeChallenge(): void {
  const completed = Boolean(activeChallenge.value && progress.value.completed.includes(activeChallenge.value.id));
  activeChallenge.value = null;
  runtime.value?.exitWorkstation();
  if (completed && chapterComplete.value) {
    startCutscene(endingCutscene);
    return;
  }
  runtime.value?.setPlaying(started.value);
}

function resetProgress(): void {
  gameStore.reset(showNotice);
  window.location.reload();
}

function reloadPage(): void {
  window.location.reload();
}

function handleShortcuts(event: KeyboardEvent): void {
  if (event.key.toLowerCase() === 'j' && started.value && !activeChallenge.value) {
    journalOpen.value = !journalOpen.value;
  }
  if (event.key === 'Escape') {
    if (journalOpen.value) journalOpen.value = false;
    else if (activeCutscene.value) finishCutscene();
    else if (activeChallenge.value) closeChallenge();
  }
}

function setStick(event: PointerEvent): void {
  if (!stickElement.value) return;
  const rect = stickElement.value.getBoundingClientRect();
  const radius = Math.max(34, rect.width * 0.34);
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy);
  const scale = length > radius ? radius / length : 1;
  stick.value = { x: dx * scale, y: dy * scale };
  runtime.value?.setMoveInput(stick.value.x / radius, stick.value.y / radius);
}

function startStick(event: PointerEvent): void {
  event.preventDefault();
  stickPointer.value = event.pointerId;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  setStick(event);
}

function moveStick(event: PointerEvent): void {
  if (stickPointer.value === event.pointerId) setStick(event);
}

function stopStick(event: PointerEvent): void {
  if (stickPointer.value !== event.pointerId) return;
  stickPointer.value = null;
  stick.value = { x: 0, y: 0 };
  runtime.value?.setMoveInput(0, 0);
}

onMounted(async () => {
  window.addEventListener('keydown', handleShortcuts);
  gameStore.initialize(showNotice);
  if (!viewport.value) return;
  const instance = new GameRuntime();
  runtime.value = instance;
  try {
    await instance.start(viewport.value, {
      onReady: () => {
        ready.value = true;
        progress.value.completed.forEach((id) => instance.completeChallenge(id));
      },
      onError: showNotice,
      onNearby: (id) => (nearbyId.value = id),
      onMapUpdate: (state) => (mapPose.value = state),
      onInteract: handleStationInteraction,
      onDialogue: showDialogue,
      onDoorState: (isOpen) => (academyDoorOpen.value = isOpen),
      onLocomotion: (state) => (locomotion.value = state),
    });
  } catch (error) {
    console.error('Game runtime gagal dimulai.', error);
    fatalError.value = 'Game tidak dapat memulai WebGL atau fisika. Coba gunakan browser yang mendukung WebGL.';
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleShortcuts);
  window.clearTimeout(dialogueTimer);
  runtime.value?.dispose();
});
</script>

<template>
  <main class="game-shell">
    <div ref="viewport" class="world-viewport" aria-label="Dunia 3D Cyber Academy"></div>
    <div class="world-vignette" aria-hidden="true"></div>

    <div v-if="!ready && !fatalError" class="loading-screen">
      <div class="loading-mark">CA</div>
      <span class="eyebrow">NEXUS WORLD · INITIALIZING</span>
      <h1>Menyiapkan akademi<span>.</span></h1>
      <div class="loading-track"><i></i></div>
      <p>Memuat karakter, lingkungan, dan simulasi</p>
    </div>
    <div v-if="fatalError" class="fatal-screen">
      <div class="brand-mark">!</div>
      <h1>Belum bisa masuk</h1>
      <p>{{ fatalError }}</p>
      <button class="button button-primary" @click="reloadPage">Coba lagi</button>
    </div>

    <template v-if="ready">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">CA</div>
          <div class="brand-copy">
            <strong>CYBER <span>ACADEMY</span></strong>
            <small>THE DIGITAL AWAKENING</small>
          </div>
        </div>
        <div class="chapter-chip"><span class="live-dot"></span> CHAPTER 01 <b>·</b> AWAKENING</div>
        <div class="profile-chip">
          <div><small>ACADEMY XP</small><strong>{{ progress.xp.toLocaleString('id-ID') }}</strong></div>
        </div>
      </header>

      <section v-if="started" class="quest-panel" :class="{ 'quest-panel-collapsed': !mobilePanelOpen }">
        <button class="panel-toggle" aria-label="Buka atau tutup panel misi" @click="mobilePanelOpen = !mobilePanelOpen">
          <span>{{ mobilePanelOpen ? '−' : '+' }}</span>
        </button>
        <div class="panel-kicker"><span class="tiny-spark">✦</span> MISI UTAMA <span class="quest-number">01</span></div>
        <h2>{{ chapterComplete ? 'Akademi dipulihkan' : nextChallenge?.station }}</h2>
        <p class="quest-copy">{{ chapterComplete ? 'Sistem keamanan NEXUS kembali aktif.' : nextChallenge?.title }}</p>
        <div class="quest-progress">
          <div class="progress-label"><span>PROGRES CHAPTER</span><strong>{{ progress.completed.length }} / {{ learningChallenges.length }}</strong></div>
          <div class="progress-track"><span :style="{ width: `${completionPercent}%` }"></span></div>
        </div>
        <button class="journal-button" @click="journalOpen = true"><span>▤</span> Jurnal misi <kbd>J</kbd></button>
      </section>

      <aside v-if="started" class="minimap-panel" aria-label="Peta akademi real-time">
        <div class="minimap-heading"><span>PETA NEXUS</span><small>REAL-TIME</small></div>
        <div class="minimap-canvas">
          <div class="minimap-grid" aria-hidden="true"></div>
          <svg v-if="mapTargetPoint" class="minimap-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
              :x1="mapPlayerPoint.x"
              :y1="mapPlayerPoint.y"
              :x2="mapTargetPoint.x"
              :y2="mapTargetPoint.y"
            />
          </svg>
          <button
            v-for="marker in mapMarkers"
            :key="marker.id"
            class="map-marker"
            :class="{
              'map-marker-current': marker.current,
              'map-marker-complete': marker.complete,
              'map-marker-locked': marker.locked,
              'map-marker-door': marker.kind === 'door',
            }"
            :style="mapMarkerStyle(marker.x, marker.z)"
            :aria-label="`${marker.label}${marker.locked ? ', terkunci' : ''}`"
            :title="`${marker.label}${marker.locked ? ' · selesaikan misi sebelumnya' : ' · jadikan waypoint'}`"
            @click="selectMapPoint(marker.id)"
          >{{ marker.kind === 'door' ? '↗' : marker.complete ? '✓' : marker.challengeIndex + 1 }}</button>
          <span class="map-player" :style="mapPlayerStyle" aria-label="Posisi dan arah pemain">↑</span>
        </div>
        <div class="map-legend"><span><i class="legend-player"></i>KAMU</span><span><i class="legend-target"></i>OBJEKTIF</span></div>
        <div class="map-guide">
          <span>ARIA · PETUNJUK</span>
          <strong>{{ guideTitle }}</strong>
          <p>{{ guideInstruction }}</p>
        </div>
      </aside>

      <aside v-if="started && (nearbyDoor || chapterComplete)" class="aria-card" :class="{ 'aria-card-hidden': !showAria, 'aria-card-gameplay': started }">
        <div class="aria-orb"><span>✦</span><i></i></div>
        <div class="aria-copy">
          <div class="aria-name">ARIA <span>ASISTEN AKADEMI</span></div>
          <p v-if="nearbyDoor && !academyDoorOpen">“Pintu ini butuh akses keamanan. Selesaikan misi Kredensial, lalu tekan <b>E</b>.”</p>
          <p v-else-if="nearbyDoor">“Akses terbuka. Jalur ke zona berikutnya sudah aman.”</p>
          <p v-else-if="nearbyChallenge">“{{ nearbyChallenge.station }} ada di dekatmu. Tekan <b>E</b> untuk berinteraksi.”</p>
          <p v-else-if="chapterComplete">“Kerja bagus. Kebiasaan aman yang kamu bangun melindungi seluruh komunitas.”</p>
        </div>
        <button class="aria-close" aria-label="Tutup pesan ARIA" @click="showAria = !showAria">×</button>
      </aside>
      <button v-if="!showAria && started" class="aria-reopen" @click="showAria = true">✦ <span>ARIA</span></button>

      <div v-if="(nearbyChallenge || nearbyDoor || nearbyAi) && started && !activeChallenge" class="interaction-prompt" :class="{ 'interaction-prompt-with-subtitle': dialogueSubtitle }">
        <span class="interact-key">E</span><div><strong>AKSI TERDEKAT</strong><small>{{ nearbyDoor ? 'Pintu keamanan' : nearbyAi ? 'Teman akademi' : nearbyChallenge?.station }}</small></div>
        <button class="prompt-action" @click="interact">{{ nearbyDoor ? (academyDoorOpen ? 'Terbuka' : 'Buka pintu') : nearbyAi ? 'Bicara' : 'Mulai misi' }} <span>↗</span></button>
      </div>

      <div v-if="dialogueSubtitle && started" class="dialogue-subtitle" role="status" aria-live="polite">
        <strong>{{ dialogueSubtitle.speaker }}</strong>
        <p>{{ dialogueSubtitle.text }}</p>
      </div>

      <div v-if="started" class="bottom-hud">
        <div class="controls-hint">
          <span class="control-icon">⌖</span>
          <div><strong>{{ locomotion === 'run' ? 'SPRINTING' : locomotion === 'walk' ? 'EXPLORING' : locomotion === 'jump' ? 'IN MOTION' : guideTitle }}</strong><small>{{ guideInstruction }}</small></div>
        </div>
        <div class="desktop-controls">
          <span><kbd>WASD</kbd> GERAK</span><span><kbd>SHIFT</kbd> LARI</span><span><kbd>C</kbd> JONGKOK</span><span><kbd>SPACE</kbd> LOMPAT</span><span><kbd>E</kbd> AKSI</span>
        </div>
        <button class="camera-mode-button" aria-label="Ganti mode kamera" @click="cycleCameraMode">
          {{ cameraMode === 'cinematic' ? 'KAMERA · DEFAULT' : cameraMode === 'third-close' ? 'KAMERA · DEKAT' : 'KAMERA · FIRST PERSON' }}
        </button>
        <div class="environment-control">
          <button
            class="environment-button"
            :aria-expanded="environmentOpen"
            @click="environmentOpen = !environmentOpen"
          >☼ DUNIA</button>
          <div v-if="environmentOpen" class="environment-popover">
            <label>WAKTU
              <select v-model="timePreset" @change="updateEnvironment">
                <option value="day">Siang</option>
                <option value="dusk">Sore</option>
                <option value="night">Malam</option>
              </select>
            </label>
            <label>CUACA
              <select v-model="weatherPreset" @change="updateEnvironment">
                <option value="clear">Cerah</option>
                <option value="rain">Hujan</option>
                <option value="heat">Panas</option>
                <option value="snow">Salju</option>
              </select>
            </label>
          </div>
        </div>
        <button class="sound-button" :class="{ 'sound-muted': !soundEnabled }" :aria-label="soundEnabled ? 'Matikan suara' : 'Nyalakan suara'" @click="toggleSound">
          {{ soundEnabled ? '♫' : '♪' }}
        </button>
      </div>

      <div v-if="started" class="mobile-controls" aria-label="Kontrol permainan mobile">
        <div ref="stickElement" class="joystick" @pointerdown="startStick" @pointermove="moveStick" @pointerup="stopStick" @pointercancel="stopStick">
          <span class="stick-ring"></span><span class="stick-knob" :style="{ transform: `translate(${stick.x}px, ${stick.y}px)` }"></span>
        </div>
        <div class="mobile-actions">
          <button class="mobile-action mobile-crouch" aria-label="Jongkok" @pointerdown.prevent="runtime?.setCrouch(true)" @pointerup.prevent="runtime?.setCrouch(false)" @pointercancel.prevent="runtime?.setCrouch(false)" @pointerleave="runtime?.setCrouch(false)">↓<small>JONGKOK</small></button>
          <button class="mobile-action mobile-jump" aria-label="Lompat" @pointerdown.prevent="runtime?.jump()">↑<small>LOMPAT</small></button>
          <button class="mobile-action mobile-sprint" aria-label="Sprint" @pointerdown.prevent="runtime?.setSprint(true)" @pointerup.prevent="runtime?.setSprint(false)" @pointercancel.prevent="runtime?.setSprint(false)" @pointerleave="runtime?.setSprint(false)">»<small>SPRINT</small></button>
          <button class="mobile-action mobile-interact" :disabled="!nearbyId" aria-label="Interaksi" @pointerdown.prevent="interact">◎<small>AKSI</small></button>
        </div>
      </div>

      <div v-if="!started" class="intro-overlay">
        <div class="intro-copy">
          <div class="intro-kicker"><span></span> NEXUS ACADEMY · YEAR 2089</div>
          <h1>Setiap sistem<br />punya <em>titik lemah.</em></h1>
          <p>Tahun 2089, Digital Collapse memutus NEXUS. Pulihkan akun, data, dan jaringan akademi sebelum AI yang rusak mengunci semuanya.</p>
          <button class="button button-primary start-button" :disabled="!ready" @click="beginGame">
            Mulai prolog <span>↗</span>
          </button>
          <div class="intro-meta"><span>◈</span> PETUALANGAN EDUKATIF <i></i> KONTROL DESKTOP & MOBILE</div>
        </div>
        <div class="intro-chapter"><small>CHAPTER 00</small><strong>AWAKENING</strong><span>PROLOGUE</span></div>
        <div class="intro-grain"></div>
      </div>

      <section v-if="activeCutscene && currentCutsceneBeat" class="cutscene-overlay" role="dialog" aria-modal="true" :aria-label="activeCutscene.title">
        <article class="cutscene-card">
          <div class="cutscene-heading">
            <span>{{ activeCutscene.title }}</span>
            <span>{{ String(cutsceneIndex + 1).padStart(2, '0') }} / {{ String(activeCutscene.beats.length).padStart(2, '0') }}</span>
          </div>
          <div class="cutscene-scene">
            <span class="cutscene-kicker">NEXUS ACADEMY · STORY SEQUENCE</span>
            <h2>{{ currentCutsceneBeat.title }}</h2>
            <p>{{ currentCutsceneBeat.narration }}</p>
          </div>
          <div class="cutscene-caption">
            <strong>{{ currentCutsceneBeat.speaker }}</strong>
            <p>{{ currentCutsceneBeat.subtitle }}</p>
          </div>
          <div class="cutscene-footer">
            <button class="cutscene-skip" @click="finishCutscene">Lewati cutscene</button>
            <button class="button button-primary" @click="advanceCutscene">
              {{ cutsceneIndex === activeCutscene.beats.length - 1 ? 'Lanjutkan' : 'Berikutnya' }} <span>↗</span>
            </button>
          </div>
        </article>
      </section>

      <ComputerTerminal
        v-if="activeChallenge"
        :challenge="activeChallenge"
        :completed="progress.completed.includes(activeChallenge.id)"
        @complete="completeCurrentChallenge"
        @close="closeChallenge"
      />

      <section v-if="journalOpen" class="journal-overlay" role="dialog" aria-modal="true" aria-label="Jurnal misi">
        <div class="journal-scrim" @click="journalOpen = false"></div>
        <article class="journal-card">
          <div class="journal-header"><div><span class="eyebrow">NEXUS ACADEMY · FIELD NOTES</span><h2>Jurnal misi</h2></div><button aria-label="Tutup jurnal" @click="journalOpen = false">×</button></div>
          <p class="journal-lead">Catatan penting untuk menjaga sistem dan data tetap aman.</p>
          <div class="journal-list">
            <div v-for="(challenge, index) in learningChallenges" :key="challenge.id" class="journal-entry">
              <span class="journal-entry-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <div><strong>{{ challenge.station }}</strong><p>{{ progress.completed.includes(challenge.id) ? challenge.lesson : 'Selesaikan simulasi untuk membuka catatan pembelajaran ini.' }}</p></div>
              <span class="journal-status">{{ progress.completed.includes(challenge.id) ? '✓' : '·' }}</span>
            </div>
          </div>
          <div class="journal-footer"><span>{{ progress.completed.length }} dari {{ learningChallenges.length }} protokol selesai · {{ progress.xp }} XP</span><button v-if="chapterComplete" class="reset-button" @click="resetProgress">Mulai ulang</button></div>
        </article>
      </section>

      <TransitionGroup name="notice" tag="div" class="notice-stack">
        <div v-for="notice in notices" :key="notice" class="notice-item"><span>✦</span>{{ notice }}</div>
      </TransitionGroup>
    </template>
  </main>
</template>
