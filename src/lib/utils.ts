import * as XLSX from 'xlsx';
import { Student, GradePredicate } from '../types';

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
