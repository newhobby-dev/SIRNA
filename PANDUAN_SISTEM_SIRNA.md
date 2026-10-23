# PANDUAN PENGGUNAAN & DOKUMENTASI SISTEM INFORMASI REKAP NILAI AKADEMIK PESERTA DIDIK (SIRNA)

Dikembangkan Oleh: **Aris Wicaksono, S.Pd.**

---

## 1. PENDAHULUAN & PRINSIP UTAMA SISTEM

**SIRNA (Sistem Informasi Rekap Nilai Akademik Peserta Didik)** dirancang untuk jenjang SMP, SMA, SMK, dan MA di Indonesia guna mengelola nilai akhir setiap semester, menghitung rata-rata dan peringkat secara otomatis, serta menyediakan portal mandiri peserta didik.

### Prinsip Utama
1. **Guru Mengunggah Nilai Akhir Mandiri**:
   Nilai yang dimasukkan oleh guru mata pelajaran adalah **nilai akhir yang sudah selesai diolah dan ditetapkan secara mandiri oleh guru**. Aplikasi tidak menghitung nilai mentah (tugas, kuis, formatif, sumatif).
2. **Kalkulasi Rata-Rata Otomatis**:
   Rata-rata semester dihitung dari seluruh nilai akhir mata pelajaran yang sah:
   $$\text{Rata-Rata} = \frac{\sum \text{Nilai Akhir Mapel}}{\text{Jumlah Mapel Terhitung}}$$
3. **Peringkat Kompetisi Standar (Standard Competition Ranking 1224)**:
   Peserta didik dengan rata-rata yang sama memperoleh peringkat yang sama (misal 1, 1, 3, 4...). Peserta didik dengan nilai wajib belum lengkap tidak memperoleh peringkat final.
4. **Keamanan 2-Faktor Portal Siswa**:
   Akses nilai mandiri siswa memerlukan **NISN + PIN Akses Sekolah** guna mencegah pencarian massal atau kebocoran data pribadi.

---

## 2. STRUKTUR FOLDER PROYEK

```
/
├── firebase-blueprint.json       # Intermediate Representation (IR) skema basis data
├── firebase-applet-config.json    # Konfigurasi koneksi Firebase SDK
├── firestore.rules               # Aturan keamanan akses Firestore (RBAC)
├── index.html                    # Entry point aplikasi dengan tipografi Plus Jakarta Sans
├── package.json                  # Dependensi (React 19, Firebase, SheetJS XLSX, Lucide)
├── tsconfig.json                 # Konfigurasi TypeScript
├── vite.config.ts                # Konfigurasi Vite & Tailwind CSS v4
├── src/
│   ├── App.tsx                   # Komponen utama & router tampilan berbasis peran
│   ├── index.css                 # Styling global, font & CSS @media print dokumen resmi
│   ├── main.tsx                  # Root mount point
│   ├── types/
│   │   └── index.ts              # Interface TypeScript (Siswa, Rombel, Nilai, Summary, Log)
│   ├── lib/
│   │   ├── firebase.ts           # Inisialisasi Firebase & error handler standar
│   │   ├── utils.ts              # Algoritma sort alfabetis, format ID, peringkat, Excel
│   │   └── seedData.ts           # Dataset awal realistis (SMA Negeri 1 Nusantara)
│   ├── context/
│   │   ├── AuthContext.tsx       # Autentikasi Google, profil pengguna & demo switcher
│   │   └── AcademicContext.tsx   # Sinkronisasi Firestore, audit log & kalkulasi rekap
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx        # Header, periode aktif, status cloud, & profil
│   │   │   ├── Sidebar.tsx       # Navigasi responsif adaptif sesuai 4 peran
│   │   │   └── Footer.tsx        # Footer resmi: "Dikembangkan Oleh: Aris Wicaksono, S.Pd."
│   │   └── common/
│   │       └── PrintHeader.tsx   # Kop surat resmi dinas & sekolah untuk cetak rapor/leger
│   └── views/
│       ├── admin/                # Modul Administrator Sekolah
│       │   ├── AdminDashboard.tsx
│       │   ├── StudentManagement.tsx
│       │   ├── ClassManagement.tsx
│       │   ├── SubjectManagement.tsx
│       │   ├── TeacherManagement.tsx
│       │   ├── AssignmentManagement.tsx
│       │   ├── PeriodManagement.tsx
│       │   ├── VerificationFinalization.tsx
│       │   ├── PublishManagement.tsx
│       │   ├── SchoolRecapView.tsx
│       │   ├── RankingsView.tsx
│       │   ├── AnalyticsView.tsx
│       │   ├── CompletenessMonitor.tsx
│       │   ├── AuditLogsView.tsx
│       │   ├── SchoolSettingsView.tsx
│       │   └── BackupRestoreView.tsx
│       ├── teacher/              # Modul Guru Mata Pelajaran
│       │   ├── TeacherDashboard.tsx
│       │   ├── ManualGradeInput.tsx
│       │   ├── ExcelGradeImport.tsx
│       │   └── TeacherSubjectRecap.tsx
│       ├── homeroom/             # Modul Wali Kelas & Guru BK
│       │   ├── HomeroomDashboard.tsx
│       │   └── HomeroomMonitoring.tsx
│       └── student/              # Modul Portal Siswa
│           └── StudentPortal.tsx
```

---

## 3. PANDUAN PENGUJIAN 4 PERAN (QUICK ROLE SWITCHER)

Pada sudut kanan atas aplikasi, terdapat dropdown **Ganti Peran**:
1. **Administrator Sekolah**:
   - Memiliki akses ke seluruh data master, rombel, guru, mapel, penugasan, kelengkapan, verifikasi, finalisasi, dan publikasi nilai.
2. **Guru Mata Pelajaran (Aris Wicaksono, S.Pd. - Matematika)**:
   - Menguji penginputan nilai manual dengan navigasi keyboard (`Enter`/`Panah Bawah`).
   - Mengunduh template Excel dan mengunggah nilai massal `.xlsx`.
   - Mengirim nilai untuk proses verifikasi.
3. **Wali Kelas (Dra. Sri Wahyuni - Kelas X-A)**:
   - Melihat Buku Leger Nilai kelas secara menyeluruh.
   - Melihat daftar peringkat kelas dan siswa yang membutuhkan remedial/pendampingan.
4. **Portal Nilai Peserta Didik (Aditya Pratama Putra)**:
   - Masukkan NISN `0081234561` dan PIN `123456`.
   - Melihat nilai akhir publikasi, rata-rata semester, peringkat, dan mencetak surat keterangan rapor resmi.

---

## 4. FORMULA PERHITUNGAN RESMI

### A. Rata-Rata Semester
- Nilai kosong **tidak dianggap sebagai 0** (nilai kosong = belum diisi). Nilai 0 adalah nilai sah yang benar-benar diberikan guru.
- Rata-rata dihitung dengan presisi desimal standar Indonesia (misal: $88,17$).

### B. Peringkat Kompetisi (Competition Ranking 1224)
- Jika Siswa A dan Siswa B sama-sama memiliki rata-rata $92,50$, keduanya berperingkat $1$. Siswa berikutnya berperingkat $3$.
- Peserta didik yang mata pelajaran wajibnya belum lengkap berstatus *Menunggu Kelengkapan Nilai* dan tidak diberikan peringkat final resmi.

---

## 5. FITUR CETAK DAN EKSPOR EXCEL
- Menggunakan CSS `@media print` sehingga seluruh tombol navigasi disembunyikan saat dicetak, menghasilkan dokumen resmi berkop surat dinas lengkap dengan tanda tangan Kepala Sekolah dan Wali Kelas.
- Ekspor berkas Excel `.xlsx` menggunakan pustaka SheetJS berpresisi tinggi.
