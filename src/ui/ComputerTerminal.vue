<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import type { LearningChallenge } from '../domain/learning';

const props = defineProps<{
  challenge: LearningChallenge;
  completed: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  close: [];
}>();

const passphrase = ref('');
const mfaEnabled = ref(false);
const senderChecked = ref(false);
const officialChannelChecked = ref(false);
const messageReported = ref(false);
const allFilesAccess = ref(true);
const administratorAccess = ref(true);
const selectedFileAccess = ref(false);
const permissionsApplied = ref(false);
const backups = ref({ academyDrive: false, externalDrive: false, offlineVault: false });
const restoreTested = ref(false);
const incidentReported = ref(false);
const accountIsolated = ref(false);
const evidencePreserved = ref(false);
const localCompletion = ref(false);
const activeApp = ref<'workspace' | 'terminal' | 'activity' | 'guide'>('workspace');
const terminalCommand = ref('');
const terminalOutput = ref([
  'NEXUS Shell 3.2 · Sesi simulasi lokal',
  'Ketik `help` untuk melihat perintah misi.',
]);
const activityEntries = ref<string[]>(['Sesi workstation dibuka.']);
const windowMinimized = ref(false);
const windowMaximized = ref(false);
const startMenuOpen = ref(false);
const systemClock = ref(formatSystemTime());
const clockTimer = window.setInterval(() => {
  systemClock.value = formatSystemTime();
}, 15000);

const isComplete = computed(() => props.completed || localCompletion.value);
const taskActions = computed(() => {
  switch (props.challenge.id) {
    case 'credentials': return Number(passphrase.value.length >= 12) + Number(mfaEnabled.value);
    case 'phishing': return Number(senderChecked.value) + Number(officialChannelChecked.value) + Number(messageReported.value);
    case 'permissions':
      return Number(!allFilesAccess.value)
        + Number(!administratorAccess.value)
        + Number(selectedFileAccess.value)
        + Number(permissionsApplied.value);
    case 'backup': return Number(backups.value.academyDrive) + Number(backups.value.externalDrive) + Number(backups.value.offlineVault) + Number(restoreTested.value);
    case 'incident': return Number(incidentReported.value) + Number(accountIsolated.value) + Number(evidencePreserved.value);
    default: return 0;
  }
});
const taskActionCount = computed(() => {
  switch (props.challenge.id) {
    case 'credentials': return 2;
    case 'backup':
    case 'permissions': return 4;
    default: return 3;
  }
});
const progressPercent = computed(() => Math.round((taskActions.value / taskActionCount.value) * 100));
const credentialsReady = computed(() => passphrase.value.length >= 12 && mfaEnabled.value);
const permissionsReady = computed(
  () => !allFilesAccess.value && !administratorAccess.value && selectedFileAccess.value,
);
const backupsReady = computed(
  () => backups.value.academyDrive && backups.value.externalDrive && backups.value.offlineVault,
);

function formatSystemTime(): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

onUnmounted(() => window.clearInterval(clockTimer));

function logActivity(message: string): void {
  activityEntries.value = [message, ...activityEntries.value].slice(0, 8);
}

function logTerminal(message: string): void {
  terminalOutput.value = [...terminalOutput.value, message].slice(-30);
  logActivity(message);
}

function runTerminalCommand(): void {
  const command = terminalCommand.value.trim().toLowerCase().replace(/\s+/g, ' ');
  terminalCommand.value = '';
  if (!command) return;
  logTerminal(`> ${command}`);
  if (command === 'help') {
    logTerminal('Gunakan perintah yang tercantum di panduan misi. Semua operasi berjalan lokal.');
    return;
  }
  switch (props.challenge.id) {
    case 'credentials':
      if (command === 'check-policy') {
        logTerminal(credentialsReady.value
          ? 'LULUS: frasa latihan memenuhi panjang minimum dan MFA aktif.'
          : 'GAGAL: isi frasa latihan minimal 12 karakter dan aktifkan MFA.');
      } else if (command === 'save-profile' && credentialsReady.value) {
        saveCredentials();
        logTerminal('OK: profil latihan disimpan tanpa merekam frasa sandi.');
      } else {
        logTerminal('Perintah tidak valid atau prasyarat belum terpenuhi. Jalankan `check-policy`.');
      }
      break;
    case 'phishing':
      if (command === 'inspect-headers') senderChecked.value = true;
      else if (command === 'verify-it' && senderChecked.value) officialChannelChecked.value = true;
      else if (command === 'report-message' && senderChecked.value && officialChannelChecked.value) reportMessage();
      else {
        logTerminal('Urutan yang diperlukan: inspect-headers → verify-it → report-message.');
        return;
      }
      logTerminal(`OK: ${command} selesai.`);
      break;
    case 'permissions':
      if (command === 'revoke-broad-access') allFilesAccess.value = false;
      else if (command === 'disable-admin') administratorAccess.value = false;
      else if (command === 'grant-file-only') selectedFileAccess.value = true;
      else if (command === 'apply-permissions' && permissionsReady.value) {
        applyPermissions();
        logTerminal('OK: izin minimum diterapkan.');
        return;
      } else {
        logTerminal('Atur izin minimum dahulu: revoke-broad-access, disable-admin, grant-file-only.');
        return;
      }
      logTerminal(`OK: ${command} selesai.`);
      break;
    case 'backup':
      if (command === 'backup-nas') backups.value.academyDrive = true;
      else if (command === 'backup-external') backups.value.externalDrive = true;
      else if (command === 'backup-offline') backups.value.offlineVault = true;
      else if (command === 'test-restore' && backupsReady.value) {
        verifyBackup();
        logTerminal('OK: uji pemulihan dari vault offline berhasil.');
        return;
      } else {
        logTerminal('Pilih backup-nas, backup-external, dan backup-offline sebelum test-restore.');
        return;
      }
      logTerminal(`OK: ${command} selesai.`);
      break;
    case 'incident':
      if (command === 'report-incident') incidentReported.value = true;
      else if (command === 'isolate-session' && incidentReported.value) accountIsolated.value = true;
      else if (command === 'preserve-evidence' && incidentReported.value && accountIsolated.value) {
        preserveEvidence();
        logTerminal('OK: bukti login dipertahankan untuk tim respons.');
        return;
      } else {
        logTerminal('Urutan yang diperlukan: report-incident → isolate-session → preserve-evidence.');
        return;
      }
      logTerminal(`OK: ${command} selesai.`);
      break;
  }
}

function finishMission(): void {
  localCompletion.value = true;
  emit('complete');
}

function saveCredentials(): void {
  if (!credentialsReady.value) return;
  passphrase.value = '';
  finishMission();
}

function reportMessage(): void {
  if (!senderChecked.value || !officialChannelChecked.value) return;
  messageReported.value = true;
  finishMission();
}

function applyPermissions(): void {
  if (!permissionsReady.value) return;
  permissionsApplied.value = true;
  finishMission();
}

function verifyBackup(): void {
  if (!backupsReady.value) return;
  restoreTested.value = true;
  finishMission();
}

function preserveEvidence(): void {
  if (!incidentReported.value || !accountIsolated.value) return;
  evidencePreserved.value = true;
  finishMission();
}
</script>

<template>
  <section class="terminal-overlay" role="dialog" aria-modal="true" :aria-label="`Terminal ${challenge.station}`">
    <article class="computer-window" :class="{ 'computer-window-maximized': windowMaximized }">
      <header class="computer-titlebar">
        <div class="computer-brand" @dblclick="windowMaximized = !windowMaximized"><span class="computer-brand-mark">N</span><span>NEXUS OS <small>· TERMINAL AKADEMI</small></span></div>
        <div class="computer-status"><i></i> SIMULASI LOKAL</div>
        <div class="computer-window-controls">
          <button aria-label="Minimalkan jendela" @click="windowMinimized = true">−</button>
          <button :aria-label="windowMaximized ? 'Pulihkan jendela' : 'Maksimalkan jendela'" @click="windowMaximized = !windowMaximized">{{ windowMaximized ? '❐' : '□' }}</button>
          <button aria-label="Tutup terminal" @click="emit('close')">×</button>
        </div>
      </header>

      <template v-if="isComplete">
        <div class="computer-success">
          <div class="success-glyph">✓</div>
          <span class="terminal-eyebrow">PROTOKOL DITERAPKAN</span>
          <h2>{{ challenge.title }}</h2>
          <p>{{ challenge.lesson }}</p>
          <button class="terminal-primary" @click="emit('close')">Kembali ke akademi <span>↗</span></button>
        </div>
      </template>

      <template v-else>
        <div v-if="!windowMinimized" class="computer-desktop">
          <aside class="computer-sidebar">
            <span class="terminal-eyebrow">RUANG KERJA</span>
            <button class="computer-app" :class="{ 'computer-app-active': activeApp === 'workspace' }" @click="activeApp = 'workspace'"><i>▤</i> Pusat keamanan</button>
            <button class="computer-app" :class="{ 'computer-app-active': activeApp === 'terminal' }" @click="activeApp = 'terminal'"><i>›_</i> Terminal</button>
            <button class="computer-app" :class="{ 'computer-app-active': activeApp === 'activity' }" @click="activeApp = 'activity'"><i>◈</i> Aktivitas</button>
            <button class="computer-app" :class="{ 'computer-app-active': activeApp === 'guide' }" @click="activeApp = 'guide'"><i>⌑</i> Panduan ARIA</button>
            <div class="computer-user"><span>CA</span><div><strong>Peserta NEXUS</strong><small>AKUN LATIHAN</small></div></div>
          </aside>

          <div class="computer-workspace">
            <div class="terminal-task-heading">
              <div><span class="terminal-eyebrow">{{ challenge.station }} · OPERASI AKTIF</span><h1>{{ challenge.title }}</h1></div>
              <span class="terminal-progress">{{ taskActions }} / {{ taskActionCount }}</span>
            </div>
            <p class="terminal-context">{{ challenge.context }}</p>
            <div class="terminal-objective"><span>▸ TUJUAN</span><p>{{ challenge.objective }}</p></div>
            <div class="terminal-progress-track"><span :style="{ width: `${progressPercent}%` }"></span></div>

            <div v-if="activeApp === 'terminal'" class="terminal-shell">
              <div class="terminal-shell-title"><span>NEXUS COMMAND LINE</span><span>SESSION LOCAL</span></div>
              <pre class="terminal-output" aria-live="polite">{{ terminalOutput.join('\n') }}</pre>
              <form class="terminal-command-line" @submit.prevent="runTerminalCommand">
                <label for="terminal-command-input">peserta@nexus:~$</label>
                <input id="terminal-command-input" v-model="terminalCommand" autocomplete="off" spellcheck="false" placeholder="ketik perintah..." />
                <button type="submit" :disabled="!terminalCommand.trim()">Jalankan</button>
              </form>
              <div class="terminal-command-help">Perintah yang dijalankan hanya mengubah simulasi lokal ini. Buka Panduan ARIA untuk urutan perintah.</div>
            </div>

            <div v-else-if="activeApp === 'activity'" class="terminal-module activity-module">
              <div class="module-heading"><span class="module-icon">◈</span><div><strong>Riwayat workstation</strong><small>Aktivitas sesi lokal terbaru</small></div></div>
              <div v-for="(entry, index) in activityEntries" :key="`${entry}-${index}`" class="activity-entry"><span>{{ String(index + 1).padStart(2, '0') }}</span><p>{{ entry }}</p></div>
            </div>

            <div v-else-if="activeApp === 'guide'" class="terminal-module guide-module">
              <div class="module-heading"><span class="module-icon">⌑</span><div><strong>Panduan operasi</strong><small>{{ challenge.station }} · tujuan pembelajaran</small></div></div>
              <p>{{ challenge.objective }}</p>
              <div class="guide-command-list">
                <span>PERINTAH YANG TERSEDIA</span>
                <code v-if="challenge.id === 'credentials'">check-policy · save-profile</code>
                <code v-else-if="challenge.id === 'phishing'">inspect-headers · verify-it · report-message</code>
                <code v-else-if="challenge.id === 'permissions'">revoke-broad-access · disable-admin · grant-file-only · apply-permissions</code>
                <code v-else-if="challenge.id === 'backup'">backup-nas · backup-external · backup-offline · test-restore</code>
                <code v-else>report-incident · isolate-session · preserve-evidence</code>
              </div>
              <div class="field-hint">Semua tombol di Pusat keamanan juga dapat dioperasikan dengan kursor.</div>
            </div>

            <div v-else-if="challenge.id === 'credentials'" class="terminal-module">
              <div class="module-heading"><span class="module-icon">♙</span><div><strong>Pengaturan akun peserta</strong><small>Latihan lokal · jangan gunakan kata sandi asli</small></div></div>
              <label class="terminal-field">Frasa sandi latihan
                <input v-model="passphrase" type="password" autocomplete="new-password" placeholder="Ketik frasa unik (min. 12 karakter)" />
              </label>
              <div class="field-hint" :class="{ 'field-hint-success': passphrase.length >= 12 }">
                {{ passphrase.length >= 12 ? 'Panjang frasa latihan memenuhi syarat.' : `${passphrase.length} / 12 karakter minimum` }}
              </div>
              <label class="terminal-toggle">
                <input v-model="mfaEnabled" type="checkbox" />
                <span class="toggle-mark"></span>
                <span><strong>Aktifkan autentikasi multifaktor</strong><small>Wajibkan verifikasi kedua saat masuk</small></span>
              </label>
              <button class="terminal-primary" :disabled="!credentialsReady" @click="saveCredentials">Simpan konfigurasi akun <span>↗</span></button>
            </div>

            <div v-else-if="activeApp === 'workspace' && challenge.id === 'phishing'" class="terminal-module email-module">
              <div class="inbox-column">
                <span class="inbox-heading">KOTAK MASUK · 3 PESAN</span>
                <div class="email-row email-row-selected"><span class="email-unread"></span><div><strong>Pulihkan akun sekarang!</strong><small>IT Helpdesk · 2 menit lalu</small></div><b>!</b></div>
                <div class="email-row"><span></span><div><strong>Jadwal kelas minggu ini</strong><small>Akademi · kemarin</small></div></div>
                <div class="email-row"><span></span><div><strong>Salinan catatan kelas</strong><small>Arsip · Senin</small></div></div>
              </div>
              <div class="email-preview">
                <span class="inbox-heading">PESAN DIPILIH</span>
                <h3>Akun akan dinonaktifkan</h3>
                <p>Segera pulihkan akses dalam 10 menit melalui tautan di bawah.</p>
                <div v-if="senderChecked" class="sender-details"><small>PENGIRIM ASLI</small><strong>helpdesk@nexus-support.invalid</strong><small>Domain tidak cocok dengan direktori akademi.</small></div>
                <div class="email-actions">
                  <button class="terminal-secondary" :class="{ 'action-done': senderChecked }" @click="senderChecked = true">{{ senderChecked ? '✓ Header diperiksa' : 'Periksa header pengirim' }}</button>
                  <button class="terminal-secondary" :disabled="!senderChecked" :class="{ 'action-done': officialChannelChecked }" @click="officialChannelChecked = true">{{ officialChannelChecked ? '✓ Kanal resmi diverifikasi' : 'Verifikasi lewat direktori IT' }}</button>
                  <button class="terminal-primary" :disabled="!senderChecked || !officialChannelChecked" @click="reportMessage">Karantina & laporkan <span>↗</span></button>
                </div>
              </div>
            </div>

            <div v-else-if="activeApp === 'workspace' && challenge.id === 'permissions'" class="terminal-module permission-module">
              <div class="permission-app"><span class="app-icon">P</span><div><strong>Poster Akademi</strong><small>Permintaan akses aplikasi</small></div><span class="permission-risk">TINJAU IZIN</span></div>
              <p class="permission-description">Atur izin yang benar-benar diperlukan untuk mengunggah satu poster.</p>
              <label class="permission-row"><span><strong>Semua berkas akademi</strong><small>Baca, ubah, dan hapus berkas apa pun</small></span><input v-model="allFilesAccess" type="checkbox" /></label>
              <label class="permission-row"><span><strong>Akses administrator</strong><small>Ubah pengaturan seluruh ruang kerja</small></span><input v-model="administratorAccess" type="checkbox" /></label>
              <label class="permission-row"><span><strong>Hanya poster yang dipilih</strong><small>Akses terbatas untuk satu berkas</small></span><input v-model="selectedFileAccess" type="checkbox" /></label>
              <div v-if="permissionsApplied" class="field-hint field-hint-success">Izin minimum diterapkan.</div>
              <div v-else-if="!permissionsReady && (!allFilesAccess || !administratorAccess || selectedFileAccess)" class="field-hint">Pilih hanya berkas poster; matikan akses luas dan administrator.</div>
              <button class="terminal-primary" :disabled="!permissionsReady" @click="applyPermissions">Terapkan izin minimum <span>↗</span></button>
            </div>

            <div v-else-if="activeApp === 'workspace' && challenge.id === 'backup'" class="terminal-module backup-module">
              <div class="backup-status"><span class="backup-status-dot"></span><div><strong>PEMULIHAN ARSIP</strong><small>Volume utama terkunci · 1 salinan sumber</small></div></div>
              <p class="permission-description">Pilih tiga tujuan berbeda agar cadangan dapat bertahan saat satu lokasi terdampak.</p>
              <label class="backup-target"><input v-model="backups.academyDrive" type="checkbox" /><span class="backup-symbol">▣</span><span><strong>NAS akademi</strong><small>Media 1 · jaringan terkelola</small></span><i>{{ backups.academyDrive ? 'SIAP' : 'PILIH' }}</i></label>
              <label class="backup-target"><input v-model="backups.externalDrive" type="checkbox" /><span class="backup-symbol">▤</span><span><strong>Drive eksternal terenkripsi</strong><small>Media 2 · perangkat terpisah</small></span><i>{{ backups.externalDrive ? 'SIAP' : 'PILIH' }}</i></label>
              <label class="backup-target"><input v-model="backups.offlineVault" type="checkbox" /><span class="backup-symbol">⌑</span><span><strong>Vault offline</strong><small>Salinan ketiga · terputus dari jaringan</small></span><i>{{ backups.offlineVault ? 'SIAP' : 'PILIH' }}</i></label>
              <div v-if="restoreTested" class="field-hint field-hint-success">Uji pemulihan berhasil dari vault offline.</div>
              <button class="terminal-primary" :disabled="!backupsReady" @click="verifyBackup">Jalankan & uji pemulihan <span>↗</span></button>
            </div>

            <div v-else-if="activeApp === 'workspace' && challenge.id === 'incident'" class="terminal-module incident-module">
              <div class="incident-alert"><span>!</span><div><strong>LOGIN TIDAK DIKENAL</strong><small>Akun kelas · lokasi baru · 03:14</small></div><b>INSIDEN TERBUKA</b></div>
              <p class="permission-description">Tangani insiden melalui prosedur resmi. Pertahankan bukti dan jangan menyebarkan data pribadi.</p>
              <div class="incident-step" :class="{ 'incident-step-done': incidentReported }"><span>01</span><div><strong>Laporkan ke Pusat Respons</strong><small>Kirim ringkasan insiden lewat kanal internal</small></div><button :disabled="incidentReported" @click="incidentReported = true">{{ incidentReported ? 'TERKIRIM' : 'LAPORKAN' }}</button></div>
              <div class="incident-step" :class="{ 'incident-step-done': accountIsolated }"><span>02</span><div><strong>Isolasi sesi yang terdampak</strong><small>Cabut sesi aktif yang tidak dikenal</small></div><button :disabled="!incidentReported || accountIsolated" @click="accountIsolated = true">{{ accountIsolated ? 'TERISOLASI' : 'ISOLASI' }}</button></div>
              <div class="incident-step" :class="{ 'incident-step-done': evidencePreserved }"><span>03</span><div><strong>Pertahankan bukti login</strong><small>Simpan log untuk tim respons resmi</small></div><button :disabled="!accountIsolated || evidencePreserved" @click="preserveEvidence">{{ evidencePreserved ? 'TERSIMPAN' : 'SIMPAN LOG' }}</button></div>
            </div>

            <div v-else class="terminal-module">
              <p class="terminal-context">Terminal ini belum memiliki alur simulasi.</p>
            </div>

            <div class="computer-footer"><span><i></i> {{ progressPercent }}% PROSEDUR SELESAI</span><button class="terminal-exit" @click="emit('close')">Keluar terminal</button></div>
          </div>
          <footer class="computer-taskbar">
            <div class="taskbar-start">
              <button aria-label="Buka menu aplikasi" @click="startMenuOpen = !startMenuOpen">⊞</button>
              <div v-if="startMenuOpen" class="taskbar-start-menu">
                <strong>NEXUS OS</strong>
                <button @click="activeApp = 'workspace'; startMenuOpen = false">Pusat keamanan</button>
                <button @click="activeApp = 'terminal'; startMenuOpen = false">Terminal</button>
                <button @click="activeApp = 'activity'; startMenuOpen = false">Aktivitas</button>
              </div>
            </div>
            <button :class="{ 'taskbar-app-active': activeApp === 'workspace' }" @click="activeApp = 'workspace'">▤ Pusat keamanan</button>
            <button :class="{ 'taskbar-app-active': activeApp === 'terminal' }" @click="activeApp = 'terminal'">›_ Terminal</button>
            <span class="taskbar-clock">{{ systemClock }}</span>
          </footer>
        </div>
        <div v-else class="computer-minimized">
          <button @click="windowMinimized = false">▤ Pulihkan jendela {{ challenge.title }}</button>
        </div>
      </template>
    </article>
  </section>
</template>
