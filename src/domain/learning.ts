export interface LearningChallenge {
  id: string;
  station: string;
  title: string;
  context: string;
  objective: string;
  lesson: string;
}

export const learningChallenges: LearningChallenge[] = [
  {
    id: 'credentials',
    station: 'Kredensial',
    title: 'Kunci akun akademi',
    context: 'Sebuah terminal meminta kamu membuat kata sandi untuk akun baru.',
    objective: 'Buat frasa sandi latihan yang kuat, aktifkan MFA, lalu simpan konfigurasi akun.',
    lesson: 'Kredensial yang unik dan MFA mengurangi risiko pengambilalihan akun.',
  },
  {
    id: 'phishing',
    station: 'Pesan mencurigakan',
    title: 'Sinyal dari kotak masuk',
    context: 'Pesan mendesak mengaku dari tim IT dan menyuruhmu membuka tautan untuk “memulihkan akun”.',
    objective: 'Periksa header, verifikasi pengirim lewat direktori resmi, lalu laporkan pesan tanpa membuka tautannya.',
    lesson: 'Kenali urgensi, alamat pengirim yang janggal, dan tautan tak terduga; verifikasi lewat kanal tepercaya.',
  },
  {
    id: 'permissions',
    station: 'Gerbang akses',
    title: 'Akses secukupnya',
    context: 'Aplikasi klub meminta izin membaca seluruh berkas akademi, padahal hanya perlu mengunggah poster.',
    objective: 'Tinjau izin aplikasi, cabut akses berlebih, pilih satu berkas poster, lalu terapkan izin minimum.',
    lesson: 'Hak akses minimum membatasi data dan sistem yang dapat dijangkau setiap akun atau aplikasi.',
  },
  {
    id: 'backup',
    station: 'Arsip data',
    title: 'Pulihkan arsip yang hilang',
    context: 'Serangan ransomware mengunci berkas proyek. Akademi sedang memeriksa salinan pemulihannya.',
    objective: 'Buat tiga salinan pada media terpisah, simpan satu salinan offline, lalu uji pemulihan.',
    lesson: 'Cadangan berkala yang terpisah dan diuji membantu pemulihan dari ransomware, kerusakan, dan kesalahan.',
  },
  {
    id: 'incident',
    station: 'Pusat respons',
    title: 'Tanggapi insiden digital',
    context: 'Kamu menemukan aktivitas login yang tidak dikenal di akun kelas.',
    objective: 'Kirim laporan melalui kanal resmi, isolasi akun yang terdampak, dan pertahankan bukti login.',
    lesson: 'Respons insiden yang baik mencakup pelaporan, pembatasan dampak, dan perlindungan bukti serta privasi.',
  },
];
