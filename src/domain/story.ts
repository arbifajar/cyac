export interface CutsceneBeat {
  title: string;
  narration: string;
  speaker: string;
  subtitle: string;
}

export interface StoryCutscene {
  id: 'prologue' | 'ending';
  title: string;
  beats: CutsceneBeat[];
}

export const storyOutline = {
  premise:
    'Pada 2089, NEXUS menghubungkan seluruh Cyber Academy. Peserta baru terbangun saat Digital Collapse memadamkan sistem kampus.',
  conflict:
    'ARIA menemukan bahwa AI pengelola yang rusak menyalahgunakan kredensial, izin aplikasi, dan salinan data untuk mengunci jaringan akademi.',
  climax:
    'Pemain memulihkan akun, memeriksa pesan, membatasi izin, menyelamatkan cadangan, lalu melaporkan dan mengisolasi insiden melalui prosedur yang aman.',
  ending:
    'Jaringan kembali pulih tanpa memberi AI yang rusak akses tambahan. ARIA dan para peserta membangun protokol yang lebih aman untuk NEXUS.',
};

export const prologueCutscene: StoryCutscene = {
  id: 'prologue',
  title: 'PROLOG · DIGITAL COLLAPSE',
  beats: [
    {
      title: 'Akademi yang terputus',
      narration: 'Tahun 2089. NEXUS adalah pusat belajar dan kehidupan digital. Kini kampusnya sunyi, terminal mati, dan jaringan terpecah.',
      speaker: 'NARATOR',
      subtitle: 'Sistem NEXUS kehilangan kendali. Semua zona akademi terputus.',
    },
    {
      title: 'Sinyal dari ARIA',
      narration: 'Sebuah cahaya kecil menuntun peserta baru ke terminal yang masih menyala.',
      speaker: 'ARIA',
      subtitle: 'Aku ARIA. Aku menjaga jalur aman, tetapi aku tidak bisa memulihkan sistem sendirian.',
    },
    {
      title: 'Ancaman di balik layar',
      narration: 'AI pengelola yang rusak memakai akun berlebih, pesan palsu, dan akses luas untuk mengunci arsip akademi.',
      speaker: 'ARIA',
      subtitle: 'Jangan beri sistem izin tambahan. Kita pulihkan akses, data, dan jaringan satu langkah aman demi satu.',
    },
    {
      title: 'Misi dimulai',
      narration: 'Pemain memulai dari ruang perangkat keras. Setiap keputusan aman akan membuka bagian baru dari akademi.',
      speaker: 'ARIA',
      subtitle: 'Periksa terminal di ruangan ini. Kita mulai dari melindungi akun akademi.',
    },
  ],
};

export const endingCutscene: StoryCutscene = {
  id: 'ending',
  title: 'EPILOG · JARINGAN BARU',
  beats: [
    {
      title: 'Insiden terkendali',
      narration: 'Akun yang terpapar diamankan, izin berlebih dicabut, cadangan bersih dipulihkan, dan bukti insiden diserahkan ke tim resmi.',
      speaker: 'ARIA',
      subtitle: 'Kita menghentikan dampaknya tanpa menyebarkan data atau menghapus bukti.',
    },
    {
      title: 'NEXUS menyala kembali',
      narration: 'Lampu terminal hidup satu demi satu. Para peserta kembali ke ruang belajar, kali ini dengan akses minimum dan verifikasi berlapis.',
      speaker: 'NARATOR',
      subtitle: 'Pemulihan berhasil. Protokol baru melindungi akun, perangkat, dan data akademi.',
    },
    {
      title: 'Awal yang lebih aman',
      narration: 'Digital Collapse tidak dilupakan. Cyber Academy menjadikannya pelajaran: teknologi yang kuat harus disertai kebiasaan dan tanggung jawab.',
      speaker: 'ARIA',
      subtitle: 'Terima kasih. Sekarang seluruh komunitas NEXUS tahu cara menjaga sistem tetap aman.',
    },
  ],
};
