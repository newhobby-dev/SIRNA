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
 * Mengecek apakah suatu Mata Pelajaran dipelajari pada Kelas/Rombel tertentu secara detail.
 * - Jika subject.targetClassIds berisi daftar ID kelas spesifik (misal hanya ['cls_xi_d']),
 *   maka mata pelajaran tersebut HANYA berlaku di kelas yang terdaftar di targetClassIds.
 * - Jika targetClassIds kosong / tidak diatur, maka mengikuti tingkat kelas (gradeLevel: 'Semua', '10', '11', '12').
 */
export function isSubjectApplicableToClass(subject: Subject, cls?: ClassRoom | null): boolean {
  if (!cls) return true;
  if (subject.targetClassIds && subject.targetClassIds.length > 0) {
    return subject.targetClassIds.includes(cls.id);
  }
  return !subject.gradeLevel || subject.gradeLevel === 'Semua' || subject.gradeLevel === cls.gradeLevel;
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

  classes.forEach(cls => {
    const classStudents = sortStudentsAlphabetically(
      students.filter(s => s.currentClassId === cls.id && s.status === 'aktif')
    );

    // Filter subjects applicable to this specific class (or all active subjects if none match)
    const classSubjects = sortedAllSubjects.filter(
      sub => sub.isActive && isSubjectApplicableToClass(sub, cls)
    );
    const subjectsToUse = classSubjects.length > 0 ? classSubjects : sortedAllSubjects.filter(s => s.isActive);

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
        if (includeExistingScores && existingGradesMap) {
          const val = existingGradesMap.get(`${st.id}_${sub.id}`);
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


