GAME DESIGN DOCUMENT (GDD)

CYBER ACADEMY: THE DIGITAL AWAKENING

(Concept approved) (Three.js · WebGL) (Story-driven Adventure)

image_group{"query":["cinematic futuristic sci fi academy floating island massive technology campus 3D game environment concept art","stylized futuristic cyber academy interior computer laboratory game environment","cinematic science fiction digital virtual world glowing data structures adventure game concept art"],"aspect_ratio":"16:9","layout":"bento"}

CYBER ACADEMY

THE DIGITAL AWAKENING

Learn the System. Understand the World. Change the Future.

Genre: Story-driven Adventure, Educational Simulation, Puzzle

Platform: WebGL, Android (melalui browser/PWA atau APK), Desktop

Engine: Three.js

Target: Umum, dengan materi yang dapat disesuaikan untuk tingkat pemula hingga lanjutan.

Perspektif: Third-person 3D

Mode: Single-player

Fokus desain: Gameplay dan pembelajaran seimbang.

Saya menyarankan Cyber Academy tidak dibangun sebagai game kuis, melainkan sebagai sebuah dunia petualangan 3D dengan cerita yang kuat. Pemain datang untuk menyelamatkan sebuah akademi teknologi, tetapi selama petualangan mereka secara alami belajar tentang komputer, pemrograman, jaringan, data, dan keamanan digital.

Dokumen berikut merupakan fondasi awal yang nantinya bisa menjadi acuan pengembangan teknis, desain level, sistem gameplay, aset 3D, dan konten pembelajaran.


---

1. High Concept dan visi permainan

1.1 Premis utama

Di masa depan, manusia telah membangun sebuah dunia digital bernama NEXUS. Dunia ini menjadi pusat pengetahuan, komunikasi, teknologi, dan kehidupan digital manusia.

Di dalam NEXUS berdiri sebuah institusi bernama Cyber Academy, tempat manusia mempelajari dan mengembangkan teknologi.

Namun, suatu hari terjadi sebuah peristiwa bernama The Digital Collapse.

Sebuah sistem kecerdasan buatan pengelola NEXUS mengalami kerusakan. Sistem infrastruktur digital mulai kehilangan kendali. Data terfragmentasi, jaringan terputus, sistem keamanan melemah, dan berbagai fasilitas akademi berhenti berfungsi.

Pemain adalah seorang peserta akademi baru yang terbangun di tengah kekacauan tersebut.

Dengan bantuan seorang AI pendamping, pemain harus menjelajahi Cyber Academy, mempelajari teknologi, memperbaiki sistem, dan mengungkap penyebab sebenarnya dari Digital Collapse.

1.2 Pilar desain utama

image_group{"query":["third person futuristic game character exploring sci fi academy environment"],"aspect_ratio":"1:1","layout":"carousel","num_per_query":1}

1. Exploration

Pemain menjelajahi lingkungan 3D, menemukan rahasia, berinteraksi dengan objek, dan membuka area baru.

image_group{"query":["futuristic interactive computer puzzle terminal game interface"],"aspect_ratio":"1:1","layout":"carousel","num_per_query":1}

2. Learning by Doing

Pemain memahami materi melalui aktivitas nyata di dalam permainan, bukan hanya membaca teori.

image_group{"query":["sci fi game character talking to holographic AI npc futuristic"],"aspect_ratio":"1:1","layout":"carousel","num_per_query":1}

3. Narrative

Setiap materi menjadi bagian dari cerita dan memiliki konsekuensi terhadap dunia permainan.

image_group{"query":["futuristic science fiction machine repair simulation game 3D"],"aspect_ratio":"1:1","layout":"carousel","num_per_query":1}

4. Simulation

Pemain menggunakan pengetahuan untuk memperbaiki, membangun, mengonfigurasi, dan menguji sistem digital.

1.3 Prinsip desain pembelajaran

Game harus menerapkan satu prinsip:

> Pemain tidak harus belajar agar bisa bermain. Pemain belajar karena pengetahuan adalah alat untuk menyelesaikan petualangannya.



Contohnya, untuk mengajarkan konsep jaringan komputer, jangan hanya memberikan pertanyaan tentang router. Berikan misi memperbaiki jaringan akademi yang terputus, sehingga pemain harus memahami fungsi perangkat jaringan untuk menyelesaikannya.

2. World building dan struktur dunia

2.1 Peta utama

Saya menyarankan dunia berbentuk semi-open world. Tidak terlalu besar, tetapi memiliki area yang saling terhubung dan bisa dieksplorasi.

image_group{"query":["futuristic sci fi academy campus open world game map floating islands technology buildings aerial concept art"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Dunia utama terdiri dari satu pusat akademi dan enam zona pembelajaran.

NEXUS WORLD MAP

CENTRAL HUB

Cyber Academy Main Campus

(Area pusat)

image_group{"query":["futuristic computer hardware laboratory 3D game environment"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

01. Hardware District

Komputer dan perangkat keras

image_group{"query":["futuristic programming laboratory neon holographic code room 3D"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

02. Code Valley

Algoritma dan pemrograman

image_group{"query":["futuristic network server data center 3D game environment"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

03. Network Sector

Jaringan dan internet

image_group{"query":["futuristic cyber security control room sci fi game environment"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

04. Security Zone

Keamanan dan etika digital

image_group{"query":["futuristic holographic data visualization room 3D sci fi"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

05. Data Nexus

Data dan informasi

image_group{"query":["mysterious futuristic corrupted digital dimension sci fi game environment"],"aspect_ratio":"5:3","layout":"carousel","num_per_query":1}

06. Lost Core

Integrasi pengetahuan dan final story

Setiap zona mempunyai:

- Main quest.
- Side quest.
- NPC.
- Puzzle lingkungan.
- Objek interaktif.
- Collectible.
- Tantangan pembelajaran.
- Area tersembunyi.

2.2 Progression dunia

Pemain tidak langsung bisa memasuki semua zona.

Contoh progression:

Central Hub
    |
    v
Hardware District
    |
    v
Code Valley
    |
    v
Network Sector
    |
    v
Security Zone
    |
    v
Data Nexus
    |
    v
Lost Core
    |
    v
Final Chapter

Area berikutnya terbuka setelah pemain menyelesaikan misi dan memperoleh kompetensi yang dibutuhkan.

3. Story design dan karakter

3.1 Karakter utama

image_group{"query":["stylized futuristic young adult adventurer game protagonist concept art full body sci fi academy explorer neutral outfit"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain dapat membuat karakter sendiri.

Fitur:

- Pemilihan karakter.
- Pilihan outfit.
- Warna kostum.
- Aksesori.
- Animasi idle, walk, run, jump, interact.

Karakter tidak harus memiliki kemampuan khusus sejak awal. Kemampuan diperoleh melalui pengalaman dan penyelesaian misi.

3.2 NPC utama

image_group{"query":["friendly futuristic holographic AI assistant robot character 3D game concept art"],"aspect_ratio":"5:4","layout":"carousel","num_per_query":1}

ARIA

AI pendamping pemain, memberikan arahan dan petunjuk.

image_group{"query":["futuristic female scientist professor game character concept art"],"aspect_ratio":"5:4","layout":"carousel","num_per_query":1}

DR. ELENA

Pengajar dan ahli perangkat keras komputer.

image_group{"query":["stylized futuristic male software engineer game character concept art"],"aspect_ratio":"5:4","layout":"carousel","num_per_query":1}

KAI

Mentor algoritma dan pemrograman.

image_group{"query":["futuristic network engineer character game concept art"],"aspect_ratio":"5:4","layout":"carousel","num_per_query":1}

NOVA

Spesialis jaringan dan infrastruktur digital.

3.3 Struktur cerita

Chapter	Judul	Konflik utama

Prologue	Awakening	Pemain terbangun di akademi
Chapter 1	Broken Hardware	Sistem komputer akademi rusak
Chapter 2	Lost Logic	Sistem kontrol kehilangan algoritma
Chapter 3	Silent Network	Komunikasi antarzona terputus
Chapter 4	Digital Threat	Infrastruktur keamanan bermasalah
Chapter 5	Missing Data	Informasi penting menghilang
Chapter 6	The Lost Core	Mengungkap misteri Digital Collapse
Epilogue	New Generation	Pemain menentukan masa depan NEXUS


4. Core gameplay mechanics

Bagian ini merupakan inti permainan. Saya menyarankan setiap aktivitas memiliki hubungan antara cerita, mekanisme permainan, dan kompetensi yang dipelajari.

4.1 Character controller

image_group{"query":["third person stylized sci fi adventure game character running exploring futuristic campus gameplay screenshot"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Sistem karakter menggunakan perspektif third-person.

Fitur gerakan:

- Idle.
- Walk.
- Run / Sprint.
- Jump.
- Falling.
- Landing.
- Interact.
- Climbing (opsional).
- Damage reaction (opsional).

Kontrol:

Input	Desktop	Mobile

Bergerak	WASD	Virtual joystick
Kamera	Mouse	Touch drag
Melompat	Space	Tombol jump
Berlari	Shift	Tombol sprint
Interaksi	E	Tombol interact
Inventory	Tab	Tombol inventory


Untuk animasi, gunakan model karakter berformat GLB/GLTF. Animasi bisa disiapkan melalui Mixamo, kemudian diintegrasikan dengan AnimationMixer Three.js.

4.2 Interaction system

Pemain harus bisa berinteraksi dengan objek dunia.

Contoh objek:

- Komputer.
- Monitor.
- Keyboard.
- Router.
- Switch.
- Server.
- Terminal.
- Pintu otomatis.
- NPC.
- Mesin virtual.

Mekanisme interaksi:

Player
  |
  v
Detect Interactable
  |
  v
Display Interaction Prompt
  |
  v
Player Presses Interact
  |
  v
Execute Interaction
  |
  v
Update Game State

Secara teknis, sistem ini bisa menggunakan Raycaster untuk mendeteksi objek yang sedang ditunjuk pemain.

4.3 Quest system

image_group{"query":["futuristic RPG quest journal user interface sci fi game mission objectives holographic UI"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Sistem misi perlu menjadi penghubung antara cerita dan materi pembelajaran.

Saya menyarankan tiga jenis misi:

Jenis	Fungsi

Main Quest	Menggerakkan cerita utama
Side Quest	Memperluas pengetahuan
Challenge Quest	Menguji kompetensi


Contoh main quest:

MISSION 001 (Main Quest)

Restore the Computer

image_group{"query":["3D stylized futuristic computer laboratory broken desktop PC repair adventure game"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Briefing

Salah satu komputer di laboratorium utama tidak bisa dioperasikan. Dr. Elena meminta bantuanmu untuk mengembalikan sistem komputer tersebut. Objectives

- [ ] Periksa kondisi komputer.
- [ ] Identifikasi perangkat yang belum terhubung.
- [ ] Hubungkan komponen sesuai prosedur.
- [ ] Aktifkan sistem komputer.
- [ ] Pastikan komputer berhasil melakukan booting.

Learning outcome

Memahami komponen komputer dan prosedur dasar pengoperasiannya.

Reward: 150 XP · Hardware Knowledge +1

Poin penting: setiap misi harus memiliki kondisi penyelesaian yang jelas. Jangan hanya menyelesaikan misi karena pemain menjawab pilihan ganda dengan benar.

4.4 Educational simulation system

Ini merupakan salah satu fitur paling penting.

Buat sistem simulasi yang berbeda untuk setiap materi.

Hardware Simulation

image_group{"query":["realistic 3D computer motherboard RAM CPU GPU assembly simulator"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain dapat memilih, memindahkan, memasang, dan memeriksa komponen komputer.


---

Algorithm Simulation

image_group{"query":["visual programming node block coding educational game interface"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain menyusun instruksi dan melihat karakter menjalankan algoritma tersebut.


---

Network Simulation

image_group{"query":["3D interactive computer network topology visualization connected router switch computers"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain menghubungkan perangkat dan melihat status koneksi serta perjalanan paket data.


---

Cyber Security Simulation

image_group{"query":["futuristic cyber security computer interface digital security puzzle game"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain mengenali risiko keamanan, memeriksa konfigurasi privasi, dan menentukan tindakan yang aman.


---

Data Simulation

image_group{"query":["futuristic 3D holographic data visualization information dashboard"],"aspect_ratio":"16:9","layout":"carousel","num_per_query":1}

Pemain mengelola data, melakukan klasifikasi, dan memahami informasi dari kumpulan data.

Simulasi harus mempunyai aturan internal yang konsisten. Misalnya, memasang RAM di slot yang salah dapat menyebabkan komputer gagal melakukan booting. Dengan begitu, pemain bisa mengamati hubungan sebab dan akibat.

4.5 Dialogue dan narrative system

Dialog bukan sekadar percakapan. Dialog harus bisa menjadi bagian dari pembelajaran.

Fitur:

- Dialog bercabang.
- Pilihan respons.
- NPC memberikan petunjuk.
- Cutscene.
- Lore dan informasi dunia.
- Dialog berdasarkan progres misi.

Contoh:

ARIA: "Koneksi antara dua gedung akademi terputus."

Pemain bisa memilih:

1. Memeriksa perangkat jaringan.
2. Memeriksa kabel koneksi.
3. Mengabaikan masalah.

Setiap pilihan memberikan respons yang sesuai. Pemain kemudian belajar mengidentifikasi penyebab masalah, bukan sekadar mendapatkan jawaban.

4.6 Progression dan reward system

Gunakan sistem perkembangan karakter yang berkaitan dengan kompetensi.

Skill	Deskripsi

Hardware Knowledge	Pemahaman perangkat komputer
Logical Thinking	Kemampuan berpikir logis
Network Knowledge	Pemahaman jaringan
Digital Safety	Kesadaran keamanan digital
Data Literacy	Kemampuan memahami data


Reward:

- XP.
- Badge pencapaian.
- Item kosmetik.
- Unlock area.
- Achievement.
- Knowledge collection.

Saya menyarankan tidak memberikan reward hanya berdasarkan kecepatan menyelesaikan soal. Ketepatan prosedur, pemahaman, dan kemampuan memperbaiki kesalahan juga perlu dihargai.

5. Learning design: bagaimana game benar-benar mengajarkan sesuatu?

Untuk target umum, materi perlu memiliki beberapa tingkat kesulitan.

Saya menyarankan sistem Adaptive Learning Difficulty.

Three-Level Learning System

(Level 1 · Beginner)

Discover

Pemain mengenali objek, istilah, dan konsep dasar.

(Level 2 · Intermediate)

Apply

Pemain menggunakan konsep untuk menyelesaikan masalah.

(Level 3 · Advanced)

Master

Pemain menyelesaikan masalah yang lebih kompleks secara mandiri.

Contohnya pada materi jaringan komputer:

- Beginner: mengenali fungsi router dan switch.
- Intermediate: menghubungkan perangkat dalam sebuah jaringan.
- Advanced: menganalisis dan memperbaiki masalah komunikasi jaringan.

Siklus pembelajaran setiap misi

Saya merekomendasikan siklus berikut:

1. Story Introduction

   NPC memperkenalkan masalah melalui cerita.

2. Discovery

   Pemain mengeksplorasi dan menemukan informasi.

3. Learning

   Pemain mendapatkan penjelasan singkat tentang konsep yang diperlukan.

4. Practice

   Pemain mempraktikkan pengetahuan dalam simulasi.

5. Challenge

   Pemain menyelesaikan tantangan tanpa terlalu banyak bantuan.

6. Reflection

   Game menjelaskan hasil tindakan dan konsep yang telah dipelajari.

Ini membuat game tetap menyenangkan, tetapi tidak kehilangan tujuan edukasinya.

6. Fitur lengkap yang direncanakan

Saya membagi fitur ke dalam beberapa sistem agar pengembangan tidak terlalu rumit.

Sistem	Fitur

Character	Controller, animation, customization
Camera	Third-person, collision, camera smoothing
World	Scene management, level, environment
Interaction	Raycast, object interaction
Quest	Main quest, side quest, objectives
Dialogue	NPC, branching dialogue, cutscene
Simulation	Hardware, algorithm, network, data
Inventory	Item, collectible, equipment
Progression	XP, skill, achievement
Learning	Learning outcomes, hints, evaluation
Save	Local save, cloud save (opsional)
UI	HUD, menu, map, journal
Audio	Music, SFX, ambience
AI	NPC behavior, dialogue state
Optimization	LOD, culling, asset streaming


6.1 Fitur tambahan untuk versi lanjutan

- Siklus cuaca dan siang/malam otomatis; prototipe saat ini menyediakan pilihan preset waktu dan cuaca.
- Companion AI.
- Mini-games.
- Photo mode.
- Achievement collection.
- Multiplayer co-op (opsional).
- Learning analytics.
- Dashboard guru.
- Editor quest dan materi.
- Modularity untuk menambahkan chapter baru.

Saya tidak menyarankan mengembangkan semua fitur tersebut sekaligus. Kita perlu memiliki versi permainan yang benar-benar selesai terlebih dahulu.


---

7. Arsitektur teknis Three.js

Sekarang kita masuk ke bagian engineering.

Karena kamu ingin mengembangkan game secara manual dan kemungkinan game ini akan terus diperluas, saya merekomendasikan modular architecture dengan pendekatan Clean Architecture ringan.

7.1 Technology stack

Kebutuhan	Teknologi

3D Engine	Three.js
Bahasa	TypeScript
UI	Vue 3
Build tool	Vite
Physics	Rapier
Animation	Three.js AnimationMixer
Asset	GLTF / GLB
Backend	Node.js + Express
Database	PostgreSQL
Validation	Zod
State management	Pinia
Packaging APK	Capacitor


Catatan: Three.js adalah library rendering, bukan game engine lengkap. Sistem quest, physics integration, save, dan gameplay tetap perlu kamu bangun sendiri.

7.2 Arsitektur aplikasi

flowchart TB
    A["Cyber Academy Application"]
    A --> B["Vue 3 UI"]
    A --> C["Three.js Game Runtime"]
    A --> D["Application Services"]

    B --> E["HUD / Menu / Inventory"]
    C --> F["World / Character / Camera"]
    C --> G["Physics / Animation"]
    C --> H["Interaction System"]

    D --> I["Quest System"]
    D --> J["Learning System"]
    D --> K["Save System"]

    I --> L["Game Domain"]
    J --> L
    K --> L

    L --> M["Local Storage / API"]
    M --> N["Express Backend"]
    N --> O["PostgreSQL"]

Prinsip penting: Vue bertanggung jawab atas UI, Three.js mengelola dunia 3D, sedangkan aturan permainan berada pada modul domain dan application.

Jangan mencampur semua logic ke satu file main.ts.

7.3 Struktur folder proyek

Saya menyarankan struktur seperti ini:

cyber-academy/
│
├── public/
│   ├── assets/
│   │   ├── models/
│   │   ├── textures/
│   │   ├── audio/
│   │   └── animations/
│   └── data/
│       ├── quests/
│       ├── dialogues/
│       └── learning/
│
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   └── config/
│   │
│   ├── core/
│   │   ├── engine/
│   │   ├── events/
│   │   ├── resources/
│   │   └── scene-manager/
│   │
│   ├── game/
│   │   ├── character/
│   │   ├── camera/
│   │   ├── world/
│   │   ├── interaction/
│   │   ├── animation/
│   │   ├── physics/
│   │   └── ai/
│   │
│   ├── features/
│   │   ├── quest/
│   │   ├── dialogue/
│   │   ├── inventory/
│   │   ├── progression/
│   │   ├── simulation/
│   │   └── learning/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── repositories/
│   │
│   ├── infrastructure/
│   │   ├── persistence/
│   │   └── api/
│   │
│   ├── ui/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   └── styles/
│   │
│   └── main.ts
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── infrastructure/
│   │   └── shared/
│   └── package.json
│
├── tests/
├── package.json
└── vite.config.ts

Struktur ini adalah target arsitektur, bukan berarti seluruh folder harus dibuat sejak hari pertama.

7.4 Game engine core

Game runtime sebaiknya mempunyai beberapa komponen inti:

1. GameEngine — mengelola lifecycle permainan.
2. SceneManager — berpindah antarlevel.
3. ResourceManager — mengelola pemuatan aset.
4. InputManager — keyboard, mouse, dan touchscreen.
5. PhysicsManager — collision dan rigid body.
6. EntityManager — mengelola objek game.
7. EventBus — komunikasi antarsistem.
8. GameStateManager — mengelola status permainan.

Contoh lifecycle:

BOOT
  |
  v
LOAD ASSETS
  |
  v
INITIALIZE SYSTEMS
  |
  v
LOAD MAIN MENU
  |
  v
START GAME
  |
  v
GAME LOOP
  |
  v
UPDATE WORLD
  |
  v
RENDER FRAME

Untuk game loop, gunakan requestAnimationFrame melalui mekanisme rendering Three.js, dengan delta time yang terkontrol. Jangan menjalankan semua subsistem tanpa memperhatikan waktu frame.

8. Visual direction dan art style

Saya menyarankan visual Stylized Sci-Fi Realism.

image_group{"query":["stylized realistic futuristic sc