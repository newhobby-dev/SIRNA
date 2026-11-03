import * as XLSX from 'xlsx';
import { Student, StudentStatus, GradePredicate, Subject, ClassRoom, GradeEntry } from '../types';

/**
 * Standar Pengurutan Alfabetis Siswa (Bagian 19 Spesifikasi):
 * - Membersihkan spasi di awal dan akhir nama
 * - Mengabaikan perbedaan huruf besar dan kecil
 * - Menggunakan localeCompare dengan locale Indonesia ('id')
 * - Menggunakan NIS sebagai pengurut sekunder jika nama sama
 */
export function sortStudentsAlphabetically<T extends Record<string, any>>(
  students: T[],
  nameKey: keyof T = 'name' as keyof T,
  nisKey: keyof T = 'nis' as keyof T
): T[] {
  return [...students].sort((a, b) => {
    const nameA = String(a[nameKey] ?? '').trim().toLowerCase();
    const nameB = String(b[nameKey] ?? '').trim().toLowerCase();

    const comparison = nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    if (comparison !== 0) {
      return comparison;
    }

    const nisA = String(a[nisKey] ?? '').trim();
    const nisB = String(b[nisKey] ?? '').trim();
    return nisA.localeCompare(nisB, 'id');
  });
}

/**
 * Mengurutkan peserta didik berdasarkan Kelas/Rombel terlebih dahulu,
 * kemudian di dalam masing-masing kelas diurutkan sesuai Abjad Nama (A-Z).
 */
export function sortStudentsByClassAndName(
  students: Student[],
  classes: ClassRoom[] = []
): Student[] {
  const classOrderMap = new Map<string, number>();
  classes.forEach((cls, idx) => {
    classOrderMap.set(cls.id, idx);
  });

  return [...students].sort((a, b) => {
    const orderA = classOrderMap.get(a.currentClassId) ?? 9999;
    const orderB = classOrderMap.get(b.currentClassId) ?? 9999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const classNameCompare = String(a.currentClassName ?? '')
      .trim()
      .localeCompare(String(b.currentClassName ?? '').trim(), 'id', { numeric: true, sensitivity: 'base' });
    if (classNameCompare !== 0) {
      return classNameCompare;
    }

    const nameA = String(a.name ?? '').trim().toLowerCase();
    const nameB = String(b.name ?? '').trim().toLowerCase();
    const nameCompare = nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return String(a.nis ?? '').trim().localeCompare(String(b.nis ?? '').trim(), 'id');
  });
}

/**
 * Ekspor Daftar Nama Peserta Didik ke Excel (.xlsx) yang dijamin terurut sesuai Abjad Nama (A-Z) di tiap kelas.
 * Menyediakan Sheet Gabungan (dikelompokkan per kelas & urut abjad tiap kelas) serta Sheet terpisah untuk masing-masing kelas.
 */
export function exportStudentNamesByClassExcel(params: {
  students: Student[];
  classes: ClassRoom[];
  targetClassId?: string; // 'ALL' atau ID kelas tertentu
  fileNamePrefix?: string;
}) {
  const {
    students,
    classes,
    targetClassId = 'ALL',
    fileNamePrefix = 'Daftar_Nama_Peserta_Didik',
  } = params;

  const wb = XLSX.utils.book_new();

  const targetClasses =
    targetClassId && targetClassId !== 'ALL'
      ? classes.filter(c => c.id === targetClassId)
      : classes;

  // Jika ekspor Semua Kelas, buat Sheet Pertama berupa Rekap Gabungan yang terurut per kelas dan A-Z di tiap kelas
  if (!targetClassId || targetClassId === 'ALL') {
    const combinedRows: Record<string, any>[] = [];
    let globalNo = 1;

    targetClasses.forEach(cls => {
      const classStudents = sortStudentsAlphabetically(
        students.filter(s => s.currentClassId === cls.id)
      );

      classStudents.forEach((st, idxInClass) => {
        combinedRows.push({
          'No.': globalNo++,
          'No. Absen Kelas': idxInClass + 1,
          'Nama Peserta Didik': st.name,
          'L/P': st.gender,
          'NIS': String(st.nis),
          'NISN': String(st.nisn),
          'Kelas / Rombel': cls.name,
          'Status': st.status.toUpperCase(),
        });
      });
    });

    // Siswa yang kelasnya tidak termasuk dalam daftar targetClasses (jika ada)
    const knownClassIds = new Set(targetClasses.map(c => c.id));
    const unassignedStudents = sortStudentsAlphabetically(
      students.filter(s => !knownClassIds.has(s.currentClassId))
    );
    unassignedStudents.forEach((st, idx) => {
      combinedRows.push({
        'No.': globalNo++,
        'No. Absen Kelas': idx + 1,
        'Nama Peserta Didik': st.name,
        'L/P': st.gender,
        'NIS': String(st.nis),
        'NISN': String(st.nisn),
        'Kelas / Rombel': st.currentClassName || 'Belum Terdaftar',
        'Status': st.status.toUpperCase(),
      });
    });

    const wsCombined = XLSX.utils.json_to_sheet(combinedRows);
    wsCombined['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 36 },
      { wch: 8 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCombined, 'Semua Kelas (Urut Abjad)');
  }

  // Buat Sheet untuk masing-masing kelas, diurutkan ketat sesuai Abjad Nama (A-Z)
  targetClasses.forEach(cls => {
    const classStudents = sortStudentsAlphabetically(
      students.filter(s => s.currentClassId === cls.id)
    );

    const sheetRows = classStudents.map((st, idx) => ({
      'No.': idx + 1,
      'Nama Peserta Didik': st.name,
      'L/P': st.gender,
      'NIS': String(st.nis),
      'NISN': String(st.nisn),
      'Kelas / Rombel': cls.name,
      'Status': st.status.toUpperCase(),
    }));

    if (sheetRows.length === 0) {
      sheetRows.push({
        'No.': 1,
        'Nama Peserta Didik': '(Belum ada peserta didik di kelas ini)',
        'L/P': '' as any,
        'NIS': '',
        'NISN': '',
        'Kelas / Rombel': cls.name,
        'Status': '',
      });
    }

    const wsClass = XLSX.utils.json_to_sheet(sheetRows);
    wsClass['!cols'] = [
      { wch: 6 },
      { wch: 36 },
      { wch: 8 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
    ];

    const safeSheetName = (cls.code || cls.name || 'Kelas').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, wsClass, safeSheetName);
  });

  const scopeSuffix =
    targetClassId && targetClassId !== 'ALL' && targetClasses[0]
      ? targetClasses[0].code || targetClasses[0].name
      : 'Tiap_Kelas_A-Z';
  const safeFileName = `${fileNamePrefix}_${scopeSuffix}`.replace(/[\\/:*?"<>|\s]+/g, '_');
  XLSX.writeFile(wb, `${safeFileName}.xlsx`);
}

/**
 * Format angka desimal standar Indonesia (misal: 87,50)
 */
export function formatIndonesianNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '-';
  }
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format tanggal Indonesia (misal: 22 Oktober 2026)
 */
export function formatIndonesianDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '-';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Menentukan predikat dan keterangan berdasarkan skor akhir
 */
export function getPredicateForScore(
  score: number | null | undefined,
  predicates: GradePredicate[]
): { predicate: string; description: string } {
  if (score === null || score === undefined || isNaN(score)) {
    return { predicate: '-', description: 'Belum Dinilai' };
  }

  const found = predicates.find(p => score >= p.min && score <= p.max);
  if (found) {
    return { predicate: found.predicate, description: found.description };
  }

  if (score >= 90) return { predicate: 'A', description: 'Sangat Baik' };
  if (score >= 80) return { predicate: 'B', description: 'Baik' };
  if (score >= 70) return { predicate: 'C', description: 'Cukup' };
  return { predicate: 'D', description: 'Perlu Bimbingan' };
}

/**
 * Menghitung Peringkat Kompetisi (Competition Ranking: 1, 1, 3, 4...)
 * Sesuai Bagian 9 Spesifikasi:
 * - Gunakan rata-rata final sebagai dasar
 * - Peserta didik dengan nilai wajib belum lengkap TIDAK memperoleh peringkat
 * - Peserta didik dengan rata-rata sama memperoleh peringkat yang sama
 */
export function assignCompetitionRanks<T extends { studentId: string; averageScore: number; isComplete: boolean }>(
  items: T[]
): (T & { rank: number | null })[] {
  // Hanya siswa yang lengkap yang diikutkan peringkat
  const completeItems = items
    .filter(i => i.isComplete)
    .sort((a, b) => b.averageScore - a.averageScore);

  const rankMap = new Map<string, number>();

  let currentRank = 1;
  for (let i = 0; i < completeItems.length; i++) {
    if (i > 0 && completeItems[i].averageScore === completeItems[i - 1].averageScore) {
      rankMap.set(completeItems[i].studentId, rankMap.get(completeItems[i - 1].studentId)!);
    } else {
      currentRank = i + 1;
      rankMap.set(completeItems[i].studentId, currentRank);
    }
  }

  return items.map(item => ({
    ...item,
    rank: item.isComplete ? rankMap.get(item.studentId) ?? null : null,
  }));
}

/**
 * Ekspor data ke format berkas Excel (.xlsx)
 */
export function exportExcelWorkbook(
  fileName: string,
  sheets: { sheetName: string; data: Record<string, any>[] }[]
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Max sheet name length
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Menghasilkan Template Excel Pengunggahan Nilai Akhir
 */
export function downloadGradeTemplate(
  className: string,
  subjectName: string,
  academicYear: string,
  semesterName: string,
  students: Student[]
) {
  // Urutkan siswa secara alfabetis
  const sortedStudents = sortStudentsAlphabetically(students);

  const templateData = sortedStudents.map((st, idx) => ({
    'No.': idx + 1,
    'NIS': String(st.nis),
    'NISN': String(st.nisn),
    'Nama Peserta Didik': st.name,
    'Nilai': '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 35 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
  const safeName = `Template_Nilai_${className}_${subjectName}_${academicYear.replace('/', '-')}_${semesterName}`.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}

export interface ExcelImportRow {
  rowNumber: number;
  nis: string;
  nisn: string;
  name: string;
  scoreRaw: any;
  scoreValid: number | null;
  isValid: boolean;
  errors: string[];
  matchedStudent?: Student;
}

/**
 * Parsing berkas Excel nilai akhir dengan deteksi kesalahan ketat
 */
export async function parseExcelGradeFile(
  file: File,
  expectedStudents: Student[],
  minScore = 0,
  maxScore = 100
): Promise<{ rows: ExcelImportRow[]; totalValid: number; totalErrors: number }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const studentByNis = new Map<string, Student>();
  const studentByNisn = new Map<string, Student>();
  expectedStudents.forEach(st => {
    studentByNis.set(String(st.nis).trim(), st);
    studentByNisn.set(String(st.nisn).trim(), st);
  });

  const parsedRows: ExcelImportRow[] = [];
  const seenNis = new Set<string>();
  const seenNisn = new Set<string>();

  rawJson.forEach((row, index) => {
    // Toleran nama kolom header yang umum
    const nis = String(row['NIS'] || row['nis'] || row['Nis'] || '').trim();
    const nisn = String(row['NISN'] || row['nisn'] || row['Nisn'] || '').trim();
    const name = String(row['Nama Peserta Didik'] || row['Nama'] || row['nama'] || '').trim();
    const scoreVal = row['Nilai'] ?? row['nilai'] ?? row['Nilai (0-100)'] ?? row['Nilai Akhir (0-100)'] ?? row['Nilai Akhir'];

    const errors: string[] = [];

    // Deteksi duplikasi baris
    if (nis && seenNis.has(nis)) {
      errors.push(`NIS ${nis} duplikat dalam file.`);
    }
    if (nisn && seenNisn.has(nisn)) {
      errors.push(`NISN ${nisn} duplikat dalam file.`);
    }
    if (nis) seenNis.add(nis);
    if (nisn) seenNisn.add(nisn);

    // Pencocokan identitas siswa
    let matchedStudent = studentByNis.get(nis) || studentByNisn.get(nisn);
    if (!matchedStudent) {
      errors.push(`Peserta didik dengan NIS ${nis || '-'} / NISN ${nisn || '-'} tidak terdaftar di kelas ini.`);
    } else {
      if (nisn && matchedStudent.nisn !== nisn) {
        errors.push(`NISN tidak cocok dengan data terdaftar (terdaftar: ${matchedStudent.nisn}).`);
      }
    }

    // Validasi nilai
    let validScore: number | null = null;
    if (scoreVal === '' || scoreVal === null || scoreVal === undefined) {
      errors.push('Nilai akhir kosong. Mohon lengkapi nilai.');
    } else {
      const parsedNum = typeof scoreVal === 'number' ? scoreVal : parseFloat(String(scoreVal).replace(',', '.'));
      if (isNaN(parsedNum)) {
        errors.push(`Nilai "${scoreVal}" bukan angka valid.`);
      } else if (parsedNum < minScore || parsedNum > maxScore) {
        errors.push(`Nilai ${parsedNum} di luar rentang sah (${minScore} - ${maxScore}).`);
      } else {
        validScore = Math.round(parsedNum * 100) / 100; // Pembulatan 2 desimal
      }
    }

    parsedRows.push({
      rowNumber: index + 2, // 1-based index plus header
      nis,
      nisn,
      name: name || matchedStudent?.name || 'Tanpa Nama',
      scoreRaw: scoreVal,
      scoreValid: validScore,
      isValid: errors.length === 0,
      errors,
      matchedStudent,
    });
  });

  const totalValid = parsedRows.filter(r => r.isValid).length;
  const totalErrors = parsedRows.filter(r => !r.isValid).length;

  return { rows: parsedRows, totalValid, totalErrors };
}

export interface AllSubjectsExcelStudentRow {
  sheetName: string;
  rowNumber: number;
  nis: string;
  nisn: string;
  name: string;
  className: string;
  matchedStudent?: Student;
  scoresBySubjectId: Record<string, number>;
  rawErrors: string[];
  isValid: boolean;
}

export interface AllSubjectsParseResult {
  rows: AllSubjectsExcelStudentRow[];
  detectedSubjects: Subject[];
  totalStudentsMatched: number;
  totalGradeEntriesValid: number;
  totalErrors: number;
}

/**
 * Mengurutkan daftar Mata Pelajaran sesuai pengaturan urutan kolom (`sortOrder`).
 * Jika `sortOrder` belum diatur atau bernilai sama, diurutkan berdasarkan Kelompok Kurikulum (A -> B -> C -> Mulok) lalu Nama Mapel.
 */
export function sortSubjects(subjects: Subject[]): Subject[] {
  const categoryRank: Record<string, number> = {
    'Kelompok A (Umum)': 1,
    'Kelompok B (Umum)': 2,
    'Kelompok C (Peminatan)': 3,
    'Muatan Lokal': 4,
  };

  return [...subjects].sort((a, b) => {
    const orderA = typeof a.sortOrder === 'number' && !isNaN(a.sortOrder) ? a.sortOrder : 9999;
    const orderB = typeof b.sortOrder === 'number' && !isNaN(b.sortOrder) ? b.sortOrder : 9999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const catA = categoryRank[a.category] ?? 99;
    const catB = categoryRank[b.category] ?? 99;
    if (catA !== catB) {
      return catA - catB;
    }

    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'id', { sensitivity: 'base' });
  });
}

/**
 * Menormalisasi representasi tingkat kelas (misal 'X' -> '10', 'XI' -> '11', 'XII' -> '12')
 * agar perbandingan tingkat antara Mata Pelajaran dan Kelas selalu akurat.
 */
export function normalizeGradeLevel(grade?: string, classNameOrCode?: string): string {
  const raw = String(grade || '').trim().toUpperCase();
  if (raw === 'SEMUA' || raw === 'ALL') return 'Semua';
  if (raw === '12' || raw === 'XII' || raw.startsWith('12 ') || raw.startsWith('XII')) return '12';
  if (raw === '11' || raw === 'XI' || raw.startsWith('11 ') || raw.startsWith('XI')) return '11';
  if (raw === '10' || raw === 'X' || raw.startsWith('10 ') || raw.startsWith('X')) return '10';
  if (raw === '9' || raw === 'IX') return '9';
  if (raw === '8' || raw === 'VIII') return '8';
  if (raw === '7' || raw === 'VII') return '7';

  if (classNameOrCode) {
    const codeUpper = classNameOrCode.trim().toUpperCase();
    if (/\b(XII|12)\b/.test(codeUpper) || codeUpper.startsWith('XII-') || codeUpper.startsWith('12-')) return '12';
    if (/\b(XI|11)\b/.test(codeUpper) || codeUpper.startsWith('XI-') || codeUpper.startsWith('11-')) return '11';
    if (/\b(X|10)\b/.test(codeUpper) || codeUpper.startsWith('X-') || codeUpper.startsWith('10-')) return '10';
  }

  return raw || 'Semua';
}

/**
 * Mengecek apakah suatu Mata Pelajaran dipelajari pada Kelas/Rombel tertentu secara detail.
 * - Jika subject.targetStudentIds berisi daftar ID siswa spesifik (Peminatan berdasarkan nama siswa),
 *   maka berlaku pada kelas yang memiliki siswa tersebut (atau terdaftar di targetClassIds).
 * - Jika subject.targetClassIds berisi daftar ID kelas spesifik (misal hanya ['cls_xi_d']),
 *   maka mata pelajaran tersebut HANYA berlaku di kelas yang terdaftar di targetClassIds.
 * - Jika targetClassIds kosong / tidak diatur, maka mengikuti tingkat kelas (gradeLevel: 'Semua', '10', '11', '12').
 */
export function isSubjectApplicableToClass(
  subject: Subject,
  cls?: ClassRoom | null,
  classStudents?: Student[]
): boolean {
  if (!cls) return true;
  if (Array.isArray(subject.targetStudentIds) && subject.targetStudentIds.length > 0) {
    if (classStudents && classStudents.length > 0) {
      if (classStudents.some(st => subject.targetStudentIds!.includes(st.id))) {
        return true;
      }
    }
    if (Array.isArray(subject.targetClassIds) && subject.targetClassIds.length > 0) {
      return subject.targetClassIds.includes(cls.id);
    }
    if (classStudents && classStudents.length > 0) {
      return false;
    }
  }
  if (Array.isArray(subject.targetClassIds) && subject.targetClassIds.length > 0) {
    return subject.targetClassIds.includes(cls.id);
  }
  const rawGrade = String(subject.gradeLevel || '').trim();
  if (!rawGrade || rawGrade.toUpperCase() === 'SEMUA' || rawGrade.toUpperCase() === 'ALL') {
    return true;
  }
  const clsGrade = normalizeGradeLevel(cls.gradeLevel, `${cls.code || ''} ${cls.name || ''}`);
  if (rawGrade.includes(',')) {
    const allowedGrades = rawGrade
      .split(',')
      .map(part => normalizeGradeLevel(part.trim()))
      .filter(Boolean);
    return allowedGrades.includes(clsGrade);
  }
  const subjGrade = normalizeGradeLevel(rawGrade);
  return subjGrade === clsGrade;
}

/**
 * Mengecek apakah suatu Mata Pelajaran diambil/dipelajari oleh Peserta Didik tertentu.
 * - Jika Mata Pelajaran memiliki pengaturan per nama peserta didik (`targetStudentIds`),
 *   maka hanya peserta didik yang namanya dipilih di `targetStudentIds` yang wajib/mengikuti mapel tersebut.
 * - Jika `targetStudentIds` kosong, maka mengikuti aturan kelas (`isSubjectApplicableToClass`).
 */
export function isSubjectApplicableToStudent(
  subject: Subject,
  studentId: string,
  cls?: ClassRoom | null
): boolean {
  if (Array.isArray(subject.targetStudentIds) && subject.targetStudentIds.length > 0) {
    return subject.targetStudentIds.includes(studentId);
  }
  return isSubjectApplicableToClass(subject, cls);
}

export interface PeriodStudent extends Student {
  latestClassId?: string;
  latestClassName?: string;
  isHistoricalPeriodClass?: boolean;
}

export function getClassGradeLevelNum(cls?: ClassRoom | null, fallbackName?: string): number {
  const levelStr = String(cls?.gradeLevel || '').trim();
  if (levelStr === '12') return 12;
  if (levelStr === '11') return 11;
  if (levelStr === '10') return 10;

  const combined = `${cls?.code || ''} ${cls?.name || ''} ${fallbackName || ''}`.toUpperCase();
  if (/\b(XII|12)\b/.test(combined) || combined.startsWith('XII')) return 12;
  if (/\b(XI|11)\b/.test(combined) || combined.startsWith('XI')) return 11;
  if (/\b(X|10)\b/.test(combined) || combined.startsWith('X')) return 10;
  return 0;
}

export function parsePeriodOrder(ayIdOrName?: string, semIdOrName?: string): {
  yearNum: number;
  semNum: number;
  order: number;
} {
  const semStr = String(semIdOrName || '').toLowerCase();
  const ayStr = String(ayIdOrName || '').toLowerCase();

  let yearNum = 0;
  const semYearMatch = semStr.match(/(20\d{2})/);
  const ayYearMatch = ayStr.match(/(20\d{2})/);
  if (semYearMatch) {
    yearNum = parseInt(semYearMatch[1], 10);
  } else if (ayYearMatch) {
    yearNum = parseInt(ayYearMatch[1], 10);
  }

  let semNum = 1;
  if (
    semStr.endsWith('_2') ||
    semStr.includes('genap') ||
    semStr.includes('semester 2') ||
    semStr.includes('sem 2')
  ) {
    semNum = 2;
  }

  return {
    yearNum,
    semNum,
    order: yearNum > 0 ? yearNum * 10 + semNum : 0,
  };
}

/**
 * Menormalkan dan memperbaiki riwayat kelas (classHistory) peserta didik secara otomatis,
 * termasuk memperbaiki data siswa hasil kenaikan kelas (misal X 2024/2025 -> XI 2025/2026)
 * yang sebelumnya memiliki placeholder tahun ajaran bawaan atau belum memiliki entri kelas tujuan di classHistory.
 */
export function normalizeStudentClassHistory(params: {
  student: Student;
  classes: ClassRoom[];
  semesters?: { id: string; academicYearId: string; semesterType?: string; name?: string }[];
  gradeEntries?: GradeEntry[];
}): { history: NonNullable<Student['classHistory']>; changed: boolean } {
  const { student: s, classes, semesters = [], gradeEntries = [] } = params;
  const rawHistory = Array.isArray(s.classHistory) ? s.classHistory : [];

  const classById = new Map<string, ClassRoom>();
  classes.forEach(c => classById.set(c.id, c));

  const semesterById = new Map<
    string,
    { id: string; academicYearId: string; semesterType?: string; name?: string }
  >();
  semesters.forEach(sm => semesterById.set(sm.id, sm));

  // Kumpulkan daftar tahun ajaran yang tersedia dari semesters (diurutkan naik: misal 2024, 2025, 2026)
  const yearToInfo = new Map<
    number,
    { academicYearId: string; sem1Id: string; sem2Id: string }
  >();
  semesters.forEach(sm => {
    const p = parsePeriodOrder(sm.academicYearId, `${sm.id} ${sm.name || ''}`);
    if (p.yearNum > 0) {
      const existing = yearToInfo.get(p.yearNum) || {
        academicYearId: sm.academicYearId,
        sem1Id: `sem_${p.yearNum}_1`,
        sem2Id: `sem_${p.yearNum}_2`,
      };
      if (p.semNum === 1) existing.sem1Id = sm.id;
      if (p.semNum === 2) existing.sem2Id = sm.id;
      if (sm.academicYearId) existing.academicYearId = sm.academicYearId;
      yearToInfo.set(p.yearNum, existing);
    }
  });
  const sortedYears = Array.from(yearToInfo.keys()).sort((a, b) => a - b);

  const getYearInfo = (yearNum: number) => {
    return (
      yearToInfo.get(yearNum) || {
        academicYearId: `ay_${yearNum}_${yearNum + 1}`,
        sem1Id: `sem_${yearNum}_1`,
        sem2Id: `sem_${yearNum}_2`,
      }
    );
  };

  const currCls = classById.get(s.currentClassId);
  const currGrade = getClassGradeLevelNum(currCls, s.currentClassName);
  const studentGrades = gradeEntries.filter(g => g.studentId === s.id);

  // Cek apakah siswa memiliki riwayat kelas lama (tingkat lebih rendah / classId berbeda)
  const oldClassEntriesFromHistory = rawHistory.filter(
    h => h.classId && h.classId !== s.currentClassId
  );
  const oldClassEntriesFromGrades = studentGrades.filter(
    g => g.classId && g.classId !== s.currentClassId
  );

  const hasPromotedHistory =
    oldClassEntriesFromHistory.length > 0 || oldClassEntriesFromGrades.length > 0;

  if (!hasPromotedHistory || !s.currentClassId) {
    return { history: rawHistory, changed: false };
  }

  // Temukan kelas tingkat X (grade 10) dan tingkat XI (grade 11) bila siswa sudah naik kelas
  const findOldClassByGrade = (targetGrade: number) => {
    for (let i = oldClassEntriesFromHistory.length - 1; i >= 0; i--) {
      const h = oldClassEntriesFromHistory[i];
      const cls = classById.get(h.classId);
      if (getClassGradeLevelNum(cls, h.className) === targetGrade) {
        return { classId: h.classId, className: cls?.name || h.className };
      }
    }
    for (let i = 0; i < oldClassEntriesFromGrades.length; i++) {
      const g = oldClassEntriesFromGrades[i];
      const cls = classById.get(g.classId);
      if (getClassGradeLevelNum(cls, g.className) === targetGrade) {
        return { classId: g.classId, className: cls?.name || g.className };
      }
    }
    return null;
  };

  // KASUS UTAMA: Siswa saat ini berada di Kelas XI (currGrade === 11) hasil kenaikan dari Kelas X (grade 10)
  if (currGrade === 11) {
    const grade10Info = findOldClassByGrade(10) || {
      classId: (oldClassEntriesFromHistory[0] || oldClassEntriesFromGrades[0])?.classId || '',
      className:
        classById.get((oldClassEntriesFromHistory[0] || oldClassEntriesFromGrades[0])?.classId || '')
          ?.name ||
        (oldClassEntriesFromHistory[0] || oldClassEntriesFromGrades[0])?.className ||
        'Kelas X',
    };

    if (grade10Info.classId) {
      // Tentukan tahun ajaran Kelas X (oldYearNum) dan Kelas XI (currYearNum).
      // Jika sistem memiliki Tahun Ajaran 2024/2025 (atau riwayat mencatat 2024, atau belum ada nilai Kelas XI di 2026),
      // maka Kelas X adalah 2024/2025 (2024) dan Kelas XI adalah 2025/2026 (2025).
      const hasGrade11In2026 = studentGrades.some(g => {
        if (g.classId !== s.currentClassId) return false;
        const gSem = semesterById.get(g.semesterId);
        const gp = parsePeriodOrder(g.academicYearId || gSem?.academicYearId, g.semesterId);
        return gp.yearNum === 2026;
      });

      const has2024InSystemOrHistory =
        sortedYears.includes(2024) ||
        rawHistory.some(h => {
          const semObj = semesterById.get(h.semesterId);
          return (
            parsePeriodOrder(
              h.academicYearId || semObj?.academicYearId,
              `${h.semesterId} ${semObj?.name || ''}`
            ).yearNum === 2024
          );
        }) ||
        !hasGrade11In2026;

      const oldYearNum = has2024InSystemOrHistory ? 2024 : sortedYears[0] || 2024;
      const currYearNum = oldYearNum + 1;

      const oldY = getYearInfo(oldYearNum);
      const currY = getYearInfo(currYearNum);
      const currClassName = currCls?.name || s.currentClassName;

      const expectedHistory: NonNullable<Student['classHistory']> = [
        {
          academicYearId: oldY.academicYearId,
          semesterId: oldY.sem1Id,
          classId: grade10Info.classId,
          className: grade10Info.className,
        },
        {
          academicYearId: oldY.academicYearId,
          semesterId: oldY.sem2Id,
          classId: grade10Info.classId,
          className: grade10Info.className,
        },
        {
          academicYearId: currY.academicYearId,
          semesterId: currY.sem1Id,
          classId: s.currentClassId,
          className: currClassName,
        },
        {
          academicYearId: currY.academicYearId,
          semesterId: currY.sem2Id,
          classId: s.currentClassId,
          className: currClassName,
        },
      ];

      const isAlreadyExact =
        rawHistory.length === expectedHistory.length &&
        expectedHistory.every(exp =>
          rawHistory.some(
            r =>
              r.semesterId === exp.semesterId &&
              r.classId === exp.classId &&
              r.academicYearId === exp.academicYearId
          )
        );

      return {
        history: isAlreadyExact ? rawHistory : expectedHistory,
        changed: !isAlreadyExact,
      };
    }
  }

  // KASUS KEDUA: Siswa saat ini berada di Kelas XII (currGrade === 12)
  if (currGrade === 12) {
    const grade10Info = findOldClassByGrade(10);
    const grade11Info = findOldClassByGrade(11);
    const currClassName = currCls?.name || s.currentClassName;

    const rebuilt: NonNullable<Student['classHistory']> = [];
    if (grade10Info?.classId) {
      const y2024 = getYearInfo(2024);
      rebuilt.push(
        {
          academicYearId: y2024.academicYearId,
          semesterId: y2024.sem1Id,
          classId: grade10Info.classId,
          className: grade10Info.className,
        },
        {
          academicYearId: y2024.academicYearId,
          semesterId: y2024.sem2Id,
          classId: grade10Info.classId,
          className: grade10Info.className,
        }
      );
    }
    if (grade11Info?.classId) {
      const y2025 = getYearInfo(2025);
      rebuilt.push(
        {
          academicYearId: y2025.academicYearId,
          semesterId: y2025.sem1Id,
          classId: grade11Info.classId,
          className: grade11Info.className,
        },
        {
          academicYearId: y2025.academicYearId,
          semesterId: y2025.sem2Id,
          classId: grade11Info.classId,
          className: grade11Info.className,
        }
      );
    }
    const y2026 = getYearInfo(2026);
    rebuilt.push(
      {
        academicYearId: y2026.academicYearId,
        semesterId: y2026.sem1Id,
        classId: s.currentClassId,
        className: currClassName,
      },
      {
        academicYearId: y2026.academicYearId,
        semesterId: y2026.sem2Id,
        classId: s.currentClassId,
        className: currClassName,
      }
    );

    const isAlreadyExact =
      rawHistory.length === rebuilt.length &&
      rebuilt.every(exp =>
        rawHistory.some(
          r =>
            r.semesterId === exp.semesterId &&
            r.classId === exp.classId &&
            r.academicYearId === exp.academicYearId
        )
      );

    return {
      history: isAlreadyExact ? rawHistory : rebuilt,
      changed: !isAlreadyExact,
    };
  }

  return {
    history: rawHistory,
    changed: false,
  };
}

/**
 * Mengambil daftar peserta didik pada suatu Kelas/Rombel sesuai Semester & Tahun Pelajaran yang dipilih.
 * Memastikan:
 * - Saat melihat Tahun Ajaran 2024/2025 Kelas X, siswa yang dulu di Kelas X (meski kini sudah naik ke Kelas XI di 2025/2026) tetap tampil.
 * - Saat melihat Tahun Ajaran 2025/2026 Kelas X, siswa angkatan 2024/2025 yang sudah naik ke Kelas XI TIDAK muncul lagi di Kelas X 2025/2026.
 * - Saat melihat Tahun Ajaran 2025/2026 Kelas XI, baik siswa hasil kenaikan kelas maupun siswa mutasi baru di Kelas XI tampil lengkap.
 */
export function getClassStudentsWithHistory(params: {
  classId: string;
  semesterId?: string;
  students: Student[];
  gradeEntries: GradeEntry[];
  classes?: ClassRoom[];
  semesters?: { id: string; academicYearId: string; semesterType?: string; name?: string }[];
}): Student[] {
  const { classId, semesterId, students, gradeEntries, classes = [], semesters = [] } = params;
  if (!classId) return [];

  const targetSemObj = semesters.find(s => s.id === semesterId);
  const targetPeriod = parsePeriodOrder(
    targetSemObj?.academicYearId,
    targetSemObj ? `${semesterId} ${targetSemObj.name || ''}` : semesterId
  );

  const matched = students.filter(s => {
    if (s.status !== 'aktif') return false;

    const studentEntries = gradeEntries.filter(g => g.studentId === s.id);
    const { history: normalizedHistory } = normalizeStudentClassHistory({
      student: s,
      classes,
      semesters,
      gradeEntries: studentEntries,
    });

    // Jika periode tahun ajaran terdeteksi (misal 2024, 2025, 2026):
    if (targetPeriod.yearNum > 0 && normalizedHistory.length > 0) {
      // Cari entri riwayat siswa pada tahun ajaran yang sedang dibuka
      const yearHistoryEntries = normalizedHistory.filter(h => {
        if (!h.classId) return false;
        const semObj = semesters.find(sm => sm.id === h.semesterId);
        const p = parsePeriodOrder(
          h.academicYearId || semObj?.academicYearId,
          `${h.semesterId} ${semObj?.name || ''}`
        );
        return p.yearNum === targetPeriod.yearNum;
      });

      if (yearHistoryEntries.length > 0) {
        // Siswa tercatat di tahun ajaran ini -> ia hanya anggota kelas ini jika riwayat pada tahun ajaran ini adalah classId
        const semSpecific = semesterId
          ? yearHistoryEntries.filter(h => h.semesterId === semesterId)
          : [];
        const activeEntries = semSpecific.length > 0 ? semSpecific : yearHistoryEntries;
        const chosen = activeEntries[activeEntries.length - 1];
        return chosen.classId === classId;
      }

      // Siswa punya classHistory di tahun ajaran LAIN, tetapi TIDAK punya catatan di tahun ajaran ini:
      // Jangan tampilkan siswa dari tahun ajaran sebelumnya ke tahun ajaran baru!
      return false;
    }

    // Fallback jika semesterId tidak memiliki informasi tahun atau siswa belum memiliki classHistory
    if (semesterId) {
      const hasGradeInThisClassAndSem = studentEntries.some(
        g => g.semesterId === semesterId && g.classId === classId
      );
      if (hasGradeInThisClassAndSem) return true;

      const hasGradeInOtherClassThisSem = studentEntries.some(
        g => g.semesterId === semesterId && g.classId && g.classId !== classId
      );
      if (hasGradeInOtherClassThisSem) return false;
    }

    return s.currentClassId === classId;
  });

  return sortStudentsAlphabetically(matched);
}

/**
 * Menyelesaikan daftar peserta didik beserta Kelas/Rombel mereka yang sesuai dengan Tahun Pelajaran & Semester yang dipilih.
 * Prinsip Utama:
 * 1. Setiap Tahun Ajaran hanya menampilkan peserta didik yang terdaftar/ditempatkan pada Tahun Ajaran tersebut.
 * 2. Ketika siswa Kelas X (2024/2025) naik ke Kelas XI (2025/2026):
 *    - Di 2024/2025: mereka tampil sebagai siswa Kelas X.
 *    - Di 2025/2026: mereka tampil sebagai siswa Kelas XI (bersama siswa mutasi Kelas XI 2025/2026),
 *      dan TIDAK muncul lagi sebagai siswa Kelas X di 2025/2026.
 * 3. Siswa dari Tahun Ajaran sebelumnya yang tidak berada di Tahun Ajaran terpilih tidak ditampilkan.
 */
export function getStudentsForPeriod(params: {
  students: Student[];
  classes: ClassRoom[];
  semesters?: { id: string; academicYearId: string; semesterType?: string; name?: string }[];
  gradeEntries: GradeEntry[];
  academicYearId?: string;
  semesterId?: string;
}): PeriodStudent[] {
  const {
    students,
    classes,
    semesters = [],
    gradeEntries,
    academicYearId = '',
    semesterId = '',
  } = params;

  if (!semesterId && !academicYearId) {
    return students.map(s => ({
      ...s,
      latestClassId: s.currentClassId,
      latestClassName: s.currentClassName,
      isHistoricalPeriodClass: false,
    }));
  }

  const classById = new Map<string, ClassRoom>();
  classes.forEach(c => classById.set(c.id, c));

  const semesterById = new Map<
    string,
    { id: string; academicYearId: string; semesterType?: string; name?: string }
  >();
  semesters.forEach(s => semesterById.set(s.id, s));

  const targetSemObj = semesterById.get(semesterId);
  const effectiveYearId = academicYearId || targetSemObj?.academicYearId || '';
  const targetPeriod = parsePeriodOrder(
    effectiveYearId,
    targetSemObj ? `${semesterId} ${targetSemObj.name || ''} ${targetSemObj.semesterType || ''}` : semesterId
  );

  const entriesByStudent = new Map<string, GradeEntry[]>();
  gradeEntries.forEach(g => {
    const list = entriesByStudent.get(g.studentId) || [];
    list.push(g);
    entriesByStudent.set(g.studentId, list);
  });

  const resolvedList: PeriodStudent[] = [];

  for (const s of students) {
    const studentEntries = entriesByStudent.get(s.id) || [];
    const { history: normalizedHistory } = normalizeStudentClassHistory({
      student: s,
      classes,
      semesters,
      gradeEntries: studentEntries,
    });

    let resolvedClassId = '';
    let resolvedClassName = '';

    // 1. Jika siswa memiliki riwayat penempatan kelas per Tahun Ajaran (normalizedHistory):
    if (normalizedHistory.length > 0 && targetPeriod.yearNum > 0) {
      // Cari seluruh entri riwayat yang cocok dengan Tahun Ajaran yang sedang dibuka
      const yearMatches = normalizedHistory.filter(h => {
        if (!h.classId) return false;
        if (effectiveYearId && h.academicYearId === effectiveYearId) return true;
        const semObj = semesterById.get(h.semesterId);
        const p = parsePeriodOrder(
          h.academicYearId || semObj?.academicYearId,
          `${h.semesterId} ${semObj?.name || ''}`
        );
        return p.yearNum === targetPeriod.yearNum;
      });

      if (yearMatches.length > 0) {
        // Utamakan yang cocok dengan semesterId; jika ada lebih dari satu pada tahun yang sama, ambil kelas dengan tingkat tertinggi / terbaru
        const semMatches = semesterId
          ? yearMatches.filter(h => h.semesterId === semesterId)
          : [];
        const candidates = semMatches.length > 0 ? semMatches : yearMatches;
        const sortedCandidates = [...candidates].sort((a, b) => {
          const gradeA = getClassGradeLevelNum(classById.get(a.classId), a.className);
          const gradeB = getClassGradeLevelNum(classById.get(b.classId), b.className);
          return gradeA - gradeB;
        });
        const chosen = sortedCandidates[sortedCandidates.length - 1];
        resolvedClassId = chosen.classId;
        resolvedClassName =
          classById.get(chosen.classId)?.name || chosen.className || s.currentClassName;
      } else {
        // Siswa memiliki catatan Tahun Ajaran di normalizedHistory, tetapi TIDAK terdaftar pada Tahun Ajaran yang sedang dipilih.
        // Jangan bocorkan data siswa dari Tahun Ajaran lain ke Tahun Ajaran ini.
        continue;
      }
    } else if (normalizedHistory.length === 0) {
      // 2. Fallback hanya untuk data siswa lama yang sama sekali belum memiliki array classHistory
      if (semesterId) {
        const semEntries = studentEntries.filter(g => g.semesterId === semesterId && g.classId);
        if (semEntries.length > 0) {
          resolvedClassId = semEntries[0].classId;
          resolvedClassName =
            classById.get(semEntries[0].classId)?.name || semEntries[0].className || s.currentClassName;
        }
      }
      if (!resolvedClassId) {
        resolvedClassId = s.currentClassId;
        resolvedClassName = classById.get(s.currentClassId)?.name || s.currentClassName;
      }
    }

    if (!resolvedClassId) {
      continue;
    }

    resolvedList.push({
      ...s,
      classHistory: normalizedHistory,
      currentClassId: resolvedClassId,
      currentClassName: resolvedClassName,
      latestClassId: s.currentClassId,
      latestClassName: s.currentClassName,
      isHistoricalPeriodClass: false,
    });
  }

  return resolvedList;
}


/**
 * Unduh Template / Ekspor Excel Semua Mata Pelajaran (Untuk 1 Kelas atau Seluruh Kelas)
 */
export function downloadAllSubjectsTemplate(params: {
  classes: ClassRoom[];
  students: Student[];
  subjects: Subject[];
  semesterName: string;
  existingGradesMap?: Map<string, number>; // key: `${studentId}_${subjectId}`
  includeExistingScores?: boolean;
  fileNamePrefix?: string;
}) {
  const {
    classes,
    students,
    subjects,
    semesterName,
    existingGradesMap,
    includeExistingScores = false,
    fileNamePrefix = 'Template_Nilai_Semua_Mapel',
  } = params;

  const sortedAllSubjects = sortSubjects(subjects);
  const wb = XLSX.utils.book_new();
  const periodStudentsForTemplate = getStudentsForPeriod({
    students,
    classes,
    gradeEntries: [],
    academicYearId: semesterName,
    semesterId: semesterName,
  });

  classes.forEach(cls => {
    const classStudents = sortStudentsAlphabetically(
      periodStudentsForTemplate.filter(
        s => s.status === 'aktif' && s.currentClassId === cls.id
      )
    );

    // Filter subjects strictly applicable to this specific class
    const subjectsToUse = sortedAllSubjects.filter(
      sub => sub.isActive && isSubjectApplicableToClass(sub, cls, classStudents)
    );

    const sheetData = classStudents.map((st, idx) => {
      const row: Record<string, any> = {
        'No.': idx + 1,
        'NIS': String(st.nis),
        'NISN': String(st.nisn),
        'Nama Peserta Didik': st.name,
        'Kelas': cls.name,
      };

      subjectsToUse.forEach(sub => {
        const colHeader = `${sub.code} - ${sub.name}`;
        const takesSubject = isSubjectApplicableToStudent(sub, st.id, cls);
        if (!takesSubject) {
          row[colHeader] = '-';
        } else if (includeExistingScores && existingGradesMap) {
          const val =
            existingGradesMap.get(`${cls.id}_${st.id}_${sub.id}`) ??
            existingGradesMap.get(`${st.id}_${sub.id}`);
          row[colHeader] = val !== undefined ? val : '';
        } else {
          row[colHeader] = '';
        }
      });

      return row;
    });

    // If class has no students yet, still provide header structure
    if (sheetData.length === 0) {
      const emptyHeaderRow: Record<string, any> = {
        'No.': 1,
        'NIS': '',
        'NISN': '',
        'Nama Peserta Didik': '',
        'Kelas': cls.name,
      };
      subjectsToUse.forEach(sub => {
        emptyHeaderRow[`${sub.code} - ${sub.name}`] = '';
      });
      sheetData.push(emptyHeaderRow);
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 15 },
      { wch: 32 },
      { wch: 14 },
      ...subjectsToUse.map(() => ({ wch: 18 })),
    ];

    const safeSheetName = (cls.code || cls.name || 'Kelas').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  });

  const scopeLabel = classes.length === 1 ? classes[0].code : 'Seluruh_Kelas';
  const safeFile = `${fileNamePrefix}_${scopeLabel}_${semesterName}`.replace(/[\\/:*?"<>|\s]+/g, '_');
  XLSX.writeFile(wb, `${safeFile}.xlsx`);
}

/**
 * Parsing berkas Excel Semua Mata Pelajaran (mendukung 1 sheet maupun multi-sheet seluruh kelas)
 */
export async function parseAllSubjectsExcelFile(
  file: File,
  allowedStudents: Student[],
  activeSubjects: Subject[],
  minScore = 0,
  maxScore = 100
): Promise<AllSubjectsParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const studentByNis = new Map<string, Student>();
  const studentByNisn = new Map<string, Student>();
  allowedStudents.forEach(st => {
    if (st.nis) studentByNis.set(String(st.nis).trim(), st);
    if (st.nisn) studentByNisn.set(String(st.nisn).trim(), st);
  });

  const detectedSubjectIds = new Set<string>();
  const rows: AllSubjectsExcelStudentRow[] = [];
  let totalGradeEntriesValid = 0;
  let totalErrors = 0;

  // Helper to match a column header to a Subject
  const matchHeaderToSubject = (headerRaw: string): Subject | undefined => {
    const h = headerRaw.trim();
    const hLower = h.toLowerCase();

    // Ignore standard identity/summary columns
    const ignored = new Set([
      'no', 'no.', 'nomor', 'nis', 'nisn', 'nama', 'nama peserta didik', 'nama siswa', 'nama siswa (a-z)',
      'kelas', 'rombel', 'rata-rata', 'rata rata', 'total', 'total nilai', 'status', 'peringkat',
      'peringkat kelas', 'peringkat paralel', 'peringkat eligible', 'predikat',
    ]);
    if (ignored.has(hLower)) return undefined;

    // 1. Exact code match or exact name match
    const exact = activeSubjects.find(
      s =>
        s.code.trim().toLowerCase() === hLower ||
        s.name.trim().toLowerCase() === hLower ||
        `${s.code.trim()} - ${s.name.trim()}`.toLowerCase() === hLower ||
        `${s.name.trim()} (${s.code.trim()})`.toLowerCase() === hLower
    );
    if (exact) return exact;

    // 2. Starts with "CODE -" or "CODE:"
    const prefixMatch = activeSubjects.find(s => {
      const codeLower = s.code.trim().toLowerCase();
      return hLower.startsWith(`${codeLower} -`) || hLower.startsWith(`${codeLower}-`) || hLower.startsWith(`${codeLower}:`);
    });
    if (prefixMatch) return prefixMatch;

    return undefined;
  };

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (rawJson.length === 0) continue;

    // Map headers in this sheet to subjects
    const firstRowKeys = Object.keys(rawJson[0] || {});
    const headerSubjectMap = new Map<string, Subject>();
    firstRowKeys.forEach(colKey => {
      const matchedSub = matchHeaderToSubject(colKey);
      if (matchedSub) {
        headerSubjectMap.set(colKey, matchedSub);
        detectedSubjectIds.add(matchedSub.id);
      }
    });

    rawJson.forEach((row, idx) => {
      const nis = String(row['NIS'] ?? row['nis'] ?? row['Nis'] ?? '').trim();
      const nisn = String(row['NISN'] ?? row['nisn'] ?? row['Nisn'] ?? '').trim();
      const name = String(
        row['Nama Peserta Didik'] ?? row['Nama Siswa'] ?? row['Nama Siswa (A-Z)'] ?? row['Nama'] ?? row['nama'] ?? ''
      ).trim();
      const classNameCol = String(row['Kelas'] ?? row['kelas'] ?? row['Rombel'] ?? sheetName).trim();

      // Skip completely empty template rows
      if (!nis && !nisn && !name) return;

      const rowErrors: string[] = [];
      const matchedStudent = (nis ? studentByNis.get(nis) : undefined) || (nisn ? studentByNisn.get(nisn) : undefined);

      if (!matchedStudent) {
        rowErrors.push(`Siswa dengan NIS "${nis || '-'}" / NISN "${nisn || '-'}" tidak ditemukan.`);
      }

      const scoresBySubjectId: Record<string, number> = {};

      headerSubjectMap.forEach((subj, colKey) => {
        const rawVal = row[colKey];
        if (rawVal === '' || rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || String(rawVal).trim() === '-') {
          return; // Kosong dilewati (tidak dihitung 0)
        }

        const parsedNum =
          typeof rawVal === 'number'
            ? rawVal
            : parseFloat(String(rawVal).trim().replace(',', '.'));

        if (isNaN(parsedNum)) {
          rowErrors.push(`${subj.code}: nilai "${rawVal}" bukan angka valid`);
        } else if (parsedNum < minScore || parsedNum > maxScore) {
          rowErrors.push(`${subj.code}: nilai ${parsedNum} di luar rentang (${minScore}-${maxScore})`);
        } else {
          const rounded = Math.round(parsedNum * 100) / 100;
          scoresBySubjectId[subj.id] = rounded;
          if (matchedStudent) {
            totalGradeEntriesValid++;
          }
        }
      });

      const isValid = matchedStudent !== undefined && rowErrors.length === 0 && Object.keys(scoresBySubjectId).length > 0;
      if (rowErrors.length > 0) {
        totalErrors += rowErrors.length;
      }

      rows.push({
        sheetName,
        rowNumber: idx + 2,
        nis: nis || matchedStudent?.nis || '-',
        nisn: nisn || matchedStudent?.nisn || '-',
        name: name || matchedStudent?.name || 'Tanpa Nama',
        className: matchedStudent?.currentClassName || classNameCol,
        matchedStudent,
        scoresBySubjectId,
        rawErrors: rowErrors,
        isValid,
      });
    });
  }

  const detectedSubjects = sortSubjects(activeSubjects.filter(s => detectedSubjectIds.has(s.id)));
  const totalStudentsMatched = rows.filter(r => r.matchedStudent && Object.keys(r.scoresBySubjectId).length > 0).length;

  return {
    rows,
    detectedSubjects,
    totalStudentsMatched,
    totalGradeEntriesValid,
    totalErrors,
  };
}

/**
 * Unduh Template Excel untuk Unggah Data Peserta Didik Baru / Massal
 */
export function downloadStudentImportTemplate(classes: ClassRoom[], targetClassId?: string) {
  const wb = XLSX.utils.book_new();
  const selectedClass = targetClassId && targetClassId !== 'ALL'
    ? classes.find(c => c.id === targetClassId)
    : classes[0];

  const defaultClassLabel = selectedClass?.code || selectedClass?.name || 'X-A';

  const sampleRows = [
    {
      'No.': 1,
      'NIS': '260001',
      'NISN': '0091234501',
      'Nama Peserta Didik': 'CONTOH SISWA PERTAMA (HAPUS ATAU GANTI BARIS INI)',
      'L/P': 'L',
      'Kelas / Rombel': defaultClassLabel,
      'Angkatan': '2026',
      'Status': 'AKTIF',
    },
    {
      'No.': 2,
      'NIS': '260002',
      'NISN': '0091234502',
      'Nama Peserta Didik': 'CONTOH SISWA KEDUA (HAPUS ATAU GANTI BARIS INI)',
      'L/P': 'P',
      'Kelas / Rombel': defaultClassLabel,
      'Angkatan': '2026',
      'Status': 'AKTIF',
    },
  ];

  const wsMain = XLSX.utils.json_to_sheet(sampleRows);
  wsMain['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 38 },
    { wch: 8 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, 'Data Peserta Didik');

  const refClasses = classes.map((c, idx) => ({
    'No.': idx + 1,
    'Kode Rombel (Isikan di Kolom Kelas / Rombel)': c.code,
    'Nama Rombel': c.name,
    'Tingkat': `Kelas ${c.gradeLevel}`,
  }));
  const wsRef = XLSX.utils.json_to_sheet(refClasses);
  wsRef['!cols'] = [{ wch: 6 }, { wch: 38 }, { wch: 22 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi Kode Kelas');

  const suffix = selectedClass && targetClassId !== 'ALL' ? selectedClass.code : 'Semua_Kelas';
  XLSX.writeFile(wb, `Template_Unggah_Peserta_Didik_${suffix}.xlsx`);
}

export interface StudentExcelImportRow {
  rowNumber: number;
  sheetName: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  classId: string;
  className: string;
  admissionYear: string;
  status: StudentStatus;
  mode: 'create' | 'update';
  existingStudentId?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Parsing berkas Excel Data Peserta Didik (Mendukung unggah 1 sheet maupun multi-sheet per kelas)
 */
export async function parseStudentExcelFile(
  file: File,
  classes: ClassRoom[],
  existingStudents: Student[],
  fallbackClassId?: string
): Promise<{
  rows: StudentExcelImportRow[];
  totalValid: number;
  totalCreate: number;
  totalUpdate: number;
  totalErrors: number;
}> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const fallbackClass = fallbackClassId && fallbackClassId !== 'ALL'
    ? classes.find(c => c.id === fallbackClassId)
    : undefined;

  const findMatchingClass = (rawClassStr: string, sheetName: string): ClassRoom | undefined => {
    const clean = rawClassStr.trim().toLowerCase();
    if (clean) {
      const matched = classes.find(
        c =>
          c.code.trim().toLowerCase() === clean ||
          c.name.trim().toLowerCase() === clean ||
          `kelas ${c.code.trim().toLowerCase()}` === clean ||
          c.id.toLowerCase() === clean
      );
      if (matched) return matched;
    }

    const cleanSheet = sheetName.trim().toLowerCase();
    const matchedBySheet = classes.find(
      c =>
        c.code.trim().toLowerCase() === cleanSheet ||
        c.name.trim().toLowerCase() === cleanSheet
    );
    if (matchedBySheet) return matchedBySheet;

    return fallbackClass;
  };

  const existingByNisn = new Map<string, Student>();
  const existingByNis = new Map<string, Student>();
  existingStudents.forEach(st => {
    if (st.nisn) existingByNisn.set(String(st.nisn).trim(), st);
    if (st.nis) existingByNis.set(String(st.nis).trim(), st);
  });

  const seenNisInFile = new Set<string>();
  const seenNisnInFile = new Set<string>();
  const parsedRows: StudentExcelImportRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes('referensi')) continue;

    const worksheet = workbook.Sheets[sheetName];
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (rawJson.length === 0) continue;

    rawJson.forEach((row, index) => {
      const nis = String(row['NIS'] ?? row['nis'] ?? row['Nis'] ?? row['No. Induk'] ?? '').trim();
      const nisn = String(row['NISN'] ?? row['nisn'] ?? row['Nisn'] ?? '').trim();
      const name = String(
        row['Nama Peserta Didik'] ??
        row['Nama Siswa'] ??
        row['Nama Lengkap'] ??
        row['Nama'] ??
        row['nama'] ??
        ''
      ).trim();

      // Skip empty rows or template placeholder instruction rows if unmodified
      if (!nis && !nisn && !name) return;
      if (name.toUpperCase().includes('CONTOH SISWA PERTAMA') || name.toUpperCase().includes('CONTOH SISWA KEDUA')) {
        return;
      }
      if (name.includes('(Belum ada peserta didik di kelas ini)')) {
        return;
      }

      const genderRaw = String(
        row['L/P'] ?? row['Jenis Kelamin'] ?? row['JK'] ?? row['Gender'] ?? row['lp'] ?? 'L'
      ).trim().toUpperCase();
      const gender: 'L' | 'P' =
        genderRaw.startsWith('P') || genderRaw.startsWith('W') || genderRaw === 'PEREMPUAN' ? 'P' : 'L';

      const classRaw = String(
        row['Kelas / Rombel'] ?? row['Kelas'] ?? row['Rombel'] ?? row['Kode Kelas'] ?? ''
      ).trim();
      const matchedClass = findMatchingClass(classRaw, sheetName);

      const admissionYear = String(
        row['Angkatan'] ?? row['Tahun Masuk / Angkatan'] ?? row['Tahun Masuk'] ?? '2026'
      ).trim() || '2026';

      const statusRaw = String(row['Status'] ?? row['status'] ?? 'aktif').trim().toLowerCase();
      let status: StudentStatus = 'aktif';
      if (statusRaw === 'alumni' || statusRaw === 'lulus') {
        status = 'alumni';
      } else if (statusRaw === 'mutasi' || statusRaw === 'pindah') {
        status = 'mutasi';
      } else if (statusRaw === 'keluar' || statusRaw === 'nonaktif') {
        status = 'keluar';
      }

      const errors: string[] = [];

      if (!name) errors.push('Nama peserta didik wajib diisi.');
      if (!nis) errors.push('NIS wajib diisi.');
      if (!nisn) errors.push('NISN wajib diisi.');
      if (!matchedClass) {
        errors.push(
          classRaw
            ? `Kelas "${classRaw}" tidak ditemukan pada daftar rombel sekolah.`
            : 'Kelas / Rombel belum diisi.'
        );
      }

      if (nis) {
        if (seenNisInFile.has(nis)) {
          errors.push(`NIS "${nis}" duplikat di dalam file Excel.`);
        }
        seenNisInFile.add(nis);
      }

      if (nisn) {
        if (seenNisnInFile.has(nisn)) {
          errors.push(`NISN "${nisn}" duplikat di dalam file Excel.`);
        }
        seenNisnInFile.add(nisn);
      }

      const existingMatch = (nisn ? existingByNisn.get(nisn) : undefined) || (nis ? existingByNis.get(nis) : undefined);

      parsedRows.push({
        rowNumber: index + 2,
        sheetName,
        nis,
        nisn,
        name,
        gender,
        classId: matchedClass?.id || '',
        className: matchedClass?.name || classRaw || '-',
        admissionYear,
        status,
        mode: existingMatch ? 'update' : 'create',
        existingStudentId: existingMatch?.id,
        isValid: errors.length === 0,
        errors,
      });
    });
  }

  const totalValid = parsedRows.filter(r => r.isValid).length;
  const totalCreate = parsedRows.filter(r => r.isValid && r.mode === 'create').length;
  const totalUpdate = parsedRows.filter(r => r.isValid && r.mode === 'update').length;
  const totalErrors = parsedRows.filter(r => !r.isValid).length;

  return {
    rows: parsedRows,
    totalValid,
    totalCreate,
    totalUpdate,
    totalErrors,
  };
}


