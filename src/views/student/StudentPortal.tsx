import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  KeyRound,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Calendar,
  Award,
  TrendingUp,
  LogOut,
  Clock,
  Sparkles,
  Layers,
  BookOpen,
  FileSpreadsheet,
  Trophy,
  Star,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  formatIndonesianNumber,
  formatIndonesianDate,
  getPredicateForScore,
  exportExcelWorkbook,
  sortSubjects,
  isSubjectApplicableToClass,
} from '../../lib/utils';
import { Student, GradeEntry, AcademicSummary, Semester } from '../../types';

export const StudentPortal: React.FC = () => {
  const {
    students,
    gradeEntries,
    academicSummaries,
    semesters,
    academicYears,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
    classes,
    subjects,
  } = useAcademic();

  // Verification Form State (empty initially)
  const [nisnInput, setNisnInput] = useState('');
  const [nisInput, setNisInput] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [verificationError, setVerificationError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // View mode: 'semester' = Rangkuman Nilai Per Semester, 'summary6' = Rangkuman Nilai (Sem 1 - 6)
  const [viewMode, setViewMode] = useState<'semester' | 'summary6'>('semester');

  // Chosen semester inside single-semester view
  const [activeSemId, setActiveSemId] = useState<string>(selectedSemesterId);

  // Semesters that have published grades or active
  const availableSemesters = useMemo(() => {
    return semesters.filter(s => s.status === 'published' || s.id === selectedSemesterId);
  }, [semesters, selectedSemesterId]);

  const activeSemester = semesters.find(s => s.id === activeSemId) || currentSemester;
  const activeYear = academicYears.find(y => y.id === activeSemester?.academicYearId);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');

    if (attemptCount >= 5) {
      setVerificationError('Terlalu banyak percobaan yang gagal. Silakan tunggu beberapa saat atau hubungi pihak sekolah.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      const cleanNisn = nisnInput.trim();
      const cleanNis = nisInput.trim();

      // Look up student by NISN and verify using NIS
      const found = students.find(
        s => s.nisn === cleanNisn && s.nis === cleanNis
      );

      if (found) {
        setVerifiedStudent(found);
        setAttemptCount(0);
        // Default to published semester if available
        const publishedSem = semesters.find(s => s.status === 'published');
        if (publishedSem) {
          setActiveSemId(publishedSem.id);
        } else {
          setActiveSemId(selectedSemesterId);
        }
      } else {
        setAttemptCount(prev => prev + 1);
        setVerificationError('Verifikasi identitas gagal. Periksa kembali NISN dan NIS yang dimasukkan.');
      }
      setIsVerifying(false);
    }, 400);
  };

  const handleLogout = () => {
    setVerifiedStudent(null);
    setNisnInput('');
    setNisInput('');
    setVerificationError('');
    setViewMode('semester');
  };

  // Helper to determine which semester (1 - 6) a grade or semester belongs to
  const getSemesterIndex = (semId: string, entry?: GradeEntry): number => {
    const sem = semesters.find(s => s.id === semId);
    const semType = sem?.semesterType || '1'; // '1' = Ganjil, '2' = Genap

    if (sem?.name) {
      const match = sem.name.match(/semester\s*([1-6])/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    let gradeLevel = '10';

    if (entry?.classId) {
      const cls = classes.find(c => c.id === entry.classId);
      if (cls?.gradeLevel) gradeLevel = cls.gradeLevel;
    } else if (verifiedStudent) {
      const historyItem = verifiedStudent.classHistory.find(
        h => h.semesterId === semId || (sem && h.academicYearId === sem.academicYearId)
      );
      if (historyItem) {
        const cls = classes.find(c => c.id === historyItem.classId);
        if (cls?.gradeLevel) {
          gradeLevel = cls.gradeLevel;
        } else if (historyItem.className.includes('XI') || historyItem.className.includes('11')) {
          gradeLevel = '11';
        } else if (historyItem.className.includes('XII') || historyItem.className.includes('12')) {
          gradeLevel = '12';
        }
      } else {
        const currentCls = classes.find(c => c.id === verifiedStudent.currentClassId);
        if (currentCls?.gradeLevel) gradeLevel = currentCls.gradeLevel;
      }
    }

    if (gradeLevel === '10' || gradeLevel.toLowerCase().includes('x')) {
      return semType === '1' ? 1 : 2;
    }
    if (gradeLevel === '11' || gradeLevel.toLowerCase().includes('xi')) {
      return semType === '1' ? 3 : 4;
    }
    if (gradeLevel === '12' || gradeLevel.toLowerCase().includes('xii')) {
      return semType === '1' ? 5 : 6;
    }

    return semType === '1' ? 1 : 2;
  };

  // Published grades for this student and active semester, sorted by subject sortOrder and filtered by class applicability
  const studentGrades = useMemo(() => {
    if (!verifiedStudent) return [];
    const sortedSubjOrder = new Map<string, number>();
    const subjectsById = new Map(subjects.map(s => [s.id, s]));
    sortSubjects(subjects).forEach((s, idx) => sortedSubjOrder.set(s.id, idx));

    const currentCls = classes.find(c => c.id === verifiedStudent.currentClassId);

    return gradeEntries
      .filter(g => {
        if (g.studentId !== verifiedStudent.id || g.semesterId !== activeSemId || g.status !== 'published') {
          return false;
        }
        const subjObj = subjectsById.get(g.subjectId);
        const gradeCls = classes.find(c => c.id === g.classId) || currentCls;
        if (subjObj && gradeCls && !isSubjectApplicableToClass(subjObj, gradeCls)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ordA = sortedSubjOrder.get(a.subjectId) ?? 9999;
        const ordB = sortedSubjOrder.get(b.subjectId) ?? 9999;
        if (ordA !== ordB) return ordA - ordB;
        return a.subjectName.localeCompare(b.subjectName, 'id');
      });
  }, [verifiedStudent, activeSemId, gradeEntries, subjects, classes]);

  // Student summary for this semester (including manual ranks input by Admin)
  const studentSummary = useMemo(() => {
    if (!verifiedStudent) return null;
    return academicSummaries.find(
      s => s.studentId === verifiedStudent.id && s.semesterId === activeSemId
    );
  }, [verifiedStudent, activeSemId, academicSummaries]);

  // Student eligible ranking: from student profile or summaries
  const eligibleRank = useMemo(() => {
    if (!verifiedStudent) return null;
    if (verifiedStudent.eligibleRank) return verifiedStudent.eligibleRank;
    const withRank = academicSummaries.find(s => s.studentId === verifiedStudent.id && s.eligibleRank);
    return withRank?.eligibleRank ?? null;
  }, [verifiedStudent, academicSummaries]);

  // 6-Semester Summary Data: Taken from all teacher uploads for this student across Semesters 1 to 6
  const multiSemesterSummary = useMemo(() => {
    if (!verifiedStudent) {
      return {
        rows: [],
        semesterAverages: {},
        cumulativeAverage: 0,
        completedSemestersCount: 0,
      };
    }

    const studentAllGrades = gradeEntries.filter(
      g =>
        (g.studentId === verifiedStudent.id ||
          g.studentNisn === verifiedStudent.nisn ||
          g.studentNis === verifiedStudent.nis) &&
        g.finalScore !== undefined &&
        g.finalScore !== null
    );

    const subjectMap = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        category: string;
        semScores: { [key: number]: number };
        average: number | null;
      }
    >();

    sortSubjects(subjects).forEach(subj => {
      subjectMap.set(subj.id, {
        id: subj.id,
        code: subj.code,
        name: subj.name,
        category: subj.category,
        semScores: {},
        average: null,
      });
    });

    studentAllGrades.forEach(grade => {
      let subj = subjectMap.get(grade.subjectId);
      if (!subj) {
        subj = {
          id: grade.subjectId,
          code: grade.subjectName.substring(0, 4).toUpperCase(),
          name: grade.subjectName,
          category: 'Kelompok A (Umum)',
          semScores: {},
          average: null,
        };
        subjectMap.set(grade.subjectId, subj);
      }

      const semIndex = getSemesterIndex(grade.semesterId, grade);
      if (semIndex >= 1 && semIndex <= 6) {
        subj.semScores[semIndex] = grade.finalScore;
      }
    });

    const currentStudentClass = classes.find(c => c.id === verifiedStudent.currentClassId);
    const subjectsById = new Map(subjects.map(s => [s.id, s]));

    const rows = Array.from(subjectMap.values())
      .map(row => {
        const scores = Object.values(row.semScores);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        return {
          ...row,
          average: avg,
        };
      })
      .filter(row => {
        const subjObj = subjectsById.get(row.id);
        const isApplicableToCurrentClass = subjObj
          ? isSubjectApplicableToClass(subjObj, currentStudentClass)
          : true;

        if (!isApplicableToCurrentClass && Object.keys(row.semScores).length === 0) {
          return false;
        }

        return (
          Object.keys(row.semScores).length > 0 ||
          (isApplicableToCurrentClass &&
            (row.category.includes('Kelompok A') || row.category.includes('Kelompok B')))
        );
      });

    const semesterAverages: { [key: number]: { average: number | null; count: number } } = {};
    let totalAllScores = 0;
    let totalScoreCount = 0;

    for (let sem = 1; sem <= 6; sem++) {
      let semTotal = 0;
      let semCount = 0;
      rows.forEach(r => {
        if (r.semScores[sem] !== undefined && r.semScores[sem] !== null) {
          semTotal += r.semScores[sem];
          semCount++;
          totalAllScores += r.semScores[sem];
          totalScoreCount++;
        }
      });
      semesterAverages[sem] = {
        average: semCount > 0 ? semTotal / semCount : null,
        count: semCount,
      };
    }

    const completedSemestersCount = Object.values(semesterAverages).filter(s => s.count > 0).length;
    const cumulativeAverage = totalScoreCount > 0 ? totalAllScores / totalScoreCount : 0;

    return {
      rows,
      semesterAverages,
      cumulativeAverage,
      completedSemestersCount,
    };
  }, [verifiedStudent, gradeEntries, subjects, semesters, classes]);

  // Historical progress: per semester with manual ranks input by Admin
  const historicalProgress = useMemo(() => {
    if (!verifiedStudent) return [];
    return semesters
      .map(sem => {
        const sum = academicSummaries.find(
          s => s.studentId === verifiedStudent.id && s.semesterId === sem.id
        );
        const gradesForSem = gradeEntries.filter(
          g => g.studentId === verifiedStudent.id && g.semesterId === sem.id && g.status === 'published'
        );
        const avg =
          sum?.averageScore ||
          (gradesForSem.length > 0
            ? gradesForSem.reduce((a, b) => a + b.finalScore, 0) / gradesForSem.length
            : 0);
        return {
          semesterId: sem.id,
          semesterName: sem.name,
          academicYearId: sem.academicYearId,
          averageScore: avg,
          classRank: sum?.classRank ?? null,
          parallelRank: sum?.parallelRank ?? null,
          eligibleRank: sum?.eligibleRank ?? verifiedStudent.eligibleRank ?? null,
          isComplete: sum?.isComplete ?? gradesForSem.length >= 6,
          subjectCount: gradesForSem.length,
          hasGrades: gradesForSem.length > 0 || (sum?.averageScore ?? 0) > 0,
        };
      })
      .filter(item => item.hasGrades || item.semesterId === activeSemId);
  }, [verifiedStudent, academicSummaries, semesters, gradeEntries, activeSemId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!verifiedStudent) return;

    if (viewMode === 'summary6') {
      const dataToExport = multiSemesterSummary.rows.map((r, idx) => {
        const pred = r.average ? getPredicateForScore(r.average, schoolSettings.predicates) : null;
        return {
          'No.': idx + 1,
          'Kode Mapel': r.code,
          'Mata Pelajaran': r.name,
          'Kategori': r.category,
          'Semester 1': r.semScores[1] !== undefined ? formatIndonesianNumber(r.semScores[1]) : '-',
          'Semester 2': r.semScores[2] !== undefined ? formatIndonesianNumber(r.semScores[2]) : '-',
          'Semester 3': r.semScores[3] !== undefined ? formatIndonesianNumber(r.semScores[3]) : '-',
          'Semester 4': r.semScores[4] !== undefined ? formatIndonesianNumber(r.semScores[4]) : '-',
          'Semester 5': r.semScores[5] !== undefined ? formatIndonesianNumber(r.semScores[5]) : '-',
          'Semester 6': r.semScores[6] !== undefined ? formatIndonesianNumber(r.semScores[6]) : '-',
          'Rata-Rata': r.average !== null ? formatIndonesianNumber(r.average) : '-',
          'Predikat': pred ? pred.predicate : '-',
          'Keterangan': pred ? pred.description : '-',
        };
      });

      exportExcelWorkbook(
        `Rangkuman_Nilai_Sem_1_6_${verifiedStudent.name.replace(/\s+/g, '_')}`,
        [{ sheetName: 'Rangkuman Sem 1-6', data: dataToExport }]
      );
      return;
    }

    const dataToExport = studentGrades.map((g, idx) => {
      const pred = getPredicateForScore(g.finalScore, schoolSettings.predicates);
      return {
        'No.': idx + 1,
        'Mata Pelajaran': g.subjectName,
        'Nilai Akhir': formatIndonesianNumber(g.finalScore),
        'Predikat': pred.predicate,
        'Keterangan': pred.description,
      };
    });

    exportExcelWorkbook(`Rangkuman_Nilai_${verifiedStudent.name}_${activeSemester?.name}`, [
      { sheetName: 'Nilai Rapor', data: dataToExport },
    ]);
  };

  // Masked NISN for display privacy
  const maskedNisn = verifiedStudent
    ? `${verifiedStudent.nisn.substring(0, 4)}****${verifiedStudent.nisn.substring(verifiedStudent.nisn.length - 2)}`
    : '';

  const studentClass = classes.find(c => c.id === verifiedStudent?.currentClassId);

  // If not verified, show verification login screen
  if (!verifiedStudent) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg mx-auto mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PORTAL NILAI SAYA</h1>
            <p className="text-xs text-blue-200 mt-1">{schoolSettings.schoolName}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Nilai Resmi Peserta Didik</span>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 space-y-5">
            {verificationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nomor Induk Siswa Nasional (NISN) *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={nisnInput}
                    onChange={(e) => setNisnInput(e.target.value)}
                    placeholder="Masukkan NISN..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nomor Induk Siswa (NIS) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={nisInput}
                    onChange={(e) => setNisInput(e.target.value)}
                    placeholder="Masukkan NIS..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan Nomor Induk Siswa (NIS) resmi Anda yang terdaftar di sekolah.
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Memverifikasi Identitas...' : 'Cari & Buka Nilai Saya'}</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-500">
              Butuh bantuan dengan NISN atau NIS akses Anda? Hubungi bagian Kurikulum atau pihak sekolah.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified Student View
  return (
    <div className="space-y-6">
      {/* Top Header Controls (Hidden in print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
            {verifiedStudent.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{verifiedStudent.name}</h1>
            <p className="text-xs text-slate-500 truncate">
              NIS: <strong className="font-mono text-slate-700">{verifiedStudent.nis}</strong> • NISN:{' '}
              <strong className="font-mono text-slate-700">{maskedNisn}</strong> • Rombel:{' '}
              <strong>{verifiedStudent.currentClassName}</strong>
            </p>
          </div>
        </div>

        {/* View Mode Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle between Single Semester and Summary 1-6 (Directive 1b: Rangkuman Nilai Per Semester) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('semester')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'semester'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Rangkuman Nilai Per Semester</span>
            </button>
            <button
              onClick={() => setViewMode('summary6')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'summary6'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Rangkuman Nilai (SEM 1 - 6)</span>
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            title="Unduh Data Nilai ke Format Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Directive 1c: Ubah Teks Cetak Rapor Menjadi Cetak Rangkuman Nilai Per Semester */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
            title={
              viewMode === 'summary6'
                ? 'Cetak Rangkuman Nilai Semester 1 - 6'
                : 'Cetak Rangkuman Nilai Per Semester'
            }
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {viewMode === 'summary6'
                ? 'Cetak Rangkuman Sem 1 - 6'
                : 'Cetak Rangkuman Nilai Per Semester'}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Keluar Sesi Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: RANGKUMAN NILAI (SEM 1 - 6)                            */}
      {/* ============================================================== */}
      {viewMode === 'summary6' && (
        <div className="space-y-6">
          {/* KPI Cards (Screen only) - Directive 1d: Munculkan Data Peringkat Eligible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Rata-Rata Kumulatif (IPK)
              </span>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">
                {multiSemesterSummary.cumulativeAverage > 0
                  ? formatIndonesianNumber(multiSemesterSummary.cumulativeAverage)
                  : '-'}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Skala 0 - 100 Seluruh Semester
              </span>
            </div>

            {/* Directive 1d: Data Peringkat Eligible Peserta Didik */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 rounded-xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 block">
                  Peringkat Eligible
                </span>
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1 flex items-center gap-1.5">
                {eligibleRank ? (
                  <span>Ke-{eligibleRank}</span>
                ) : (
                  <span className="text-lg text-slate-400 font-semibold">-</span>
                )}
              </div>
              <span className="text-[10px] text-amber-900/70 mt-0.5 block font-medium">
                {eligibleRank ? 'Eligible Kuota SNBP / Sekolah' : 'Belum Ditetapkan Sekolah'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Semester Terdata</span>
              <div className="text-2xl font-extrabold text-indigo-700 mt-1 flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>{multiSemesterSummary.completedSemestersCount} / 6</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Semester yang telah terisi nilai
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Mata Pelajaran Tercatat
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-emerald-500" />
                <span>{multiSemesterSummary.rows.length}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Mata Pelajaran Kurikulum
              </span>
            </div>
          </div>

          {/* Official Document Sheet: Rangkuman Nilai Semester 1 - 6 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
            <PrintHeader
              documentTitle="REKAPITULASI HASIL BELAJAR PESERTA DIDIK"
              subTitle={`Rangkuman Capaian Nilai Semester 1, 2, 3, 4, 5, & 6 | ${schoolSettings.schoolName}`}
            />

            {/* Student Identity Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-slate-200">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-40 text-slate-500">Nama Peserta Didik</span>
                  <strong className="text-slate-900">: {verifiedStudent.name}</strong>
                </div>
                <div className="flex">
                  <span className="w-40 text-slate-500">Nomor Induk Siswa (NIS)</span>
                  <strong className="text-slate-900 font-mono">: {verifiedStudent.nis}</strong>
                </div>
                <div className="flex">
                  <span className="w-40 text-slate-500">NISN</span>
                  <strong className="text-slate-900 font-mono">: {verifiedStudent.nisn}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-40 text-slate-500">Rombongan Belajar</span>
                  <strong className="text-slate-900">: {studentClass?.name || verifiedStudent.currentClassName}</strong>
                </div>
                <div className="flex">
                  <span className="w-40 text-slate-500">Tingkat / Angkatan</span>
                  <strong className="text-slate-900">: Kelas {studentClass?.gradeLevel || '10'} (Angkatan {verifiedStudent.cohort})</strong>
                </div>
                {/* Directive 1d: Munculkan Data Peringkat Eligible */}
                <div className="flex">
                  <span className="w-40 text-slate-500 font-semibold text-amber-900">Peringkat Eligible</span>
                  <strong className="text-amber-800">
                    : {eligibleRank ? `Peringkat Ke-${eligibleRank} (Eligible Kuota Sekolah)` : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Mobile swipe hint */}
            <div className="block sm:hidden px-3.5 py-2 mb-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-medium no-print">
              ↔ Geser tabel ke kanan/kiri untuk melihat seluruh kolom Semester 1 sampai 6
            </div>

            {/* Multi-Semester Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border border-slate-300 print-table min-w-[760px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-800 tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No.</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Mata Pelajaran</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-slate-600 hidden md:table-cell">Kategori</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-blue-50/60 text-blue-950 font-bold">Sem 1</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-blue-50/60 text-blue-950 font-bold">Sem 2</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-indigo-50/60 text-indigo-950 font-bold">Sem 3</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-indigo-50/60 text-indigo-950 font-bold">Sem 4</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-purple-50/60 text-purple-950 font-bold">Sem 5</th>
                    <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-300 bg-purple-50/60 text-purple-950 font-bold">Sem 6</th>
                    <th className="py-2.5 px-3 w-20 text-right border-r border-slate-300 bg-slate-200/60 font-extrabold text-slate-900">Rata-Rata</th>
                    <th className="py-2.5 px-3 w-16 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {multiSemesterSummary.rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Belum ada data nilai yang diunggah oleh guru pengampu untuk peserta didik ini.
                      </td>
                    </tr>
                  ) : (
                    multiSemesterSummary.rows.map((row, idx) => {
                      const pred = row.average ? getPredicateForScore(row.average, schoolSettings.predicates) : null;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                            {row.name}
                          </td>
                          <td className="py-2 px-3 text-slate-600 border-r border-slate-200 hidden md:table-cell text-[11px]">
                            {row.category}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[1] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[1])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[2] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[2])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[3] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[3])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[4] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[4])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[5] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[5])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                            {row.semScores[6] !== undefined ? (
                              <span className="font-bold text-slate-900">
                                {formatIndonesianNumber(row.semScores[6])}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-900 border-r border-slate-200 bg-slate-50/50">
                            {row.average !== null ? formatIndonesianNumber(row.average) : '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {pred ? (
                              <span className="font-bold text-blue-800">{pred.predicate}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-800">
                    <td colSpan={2} className="py-2.5 px-4 font-extrabold uppercase text-[11px] border-r border-slate-300 text-slate-900">
                      Rata-Rata Tiap Semester
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 hidden md:table-cell"></td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-blue-900 border-r border-slate-300 bg-blue-50/40">
                      {multiSemesterSummary.semesterAverages[1]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[1].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-blue-900 border-r border-slate-300 bg-blue-50/40">
                      {multiSemesterSummary.semesterAverages[2]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[2].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-indigo-900 border-r border-slate-300 bg-indigo-50/40">
                      {multiSemesterSummary.semesterAverages[3]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[3].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-indigo-900 border-r border-slate-300 bg-indigo-50/40">
                      {multiSemesterSummary.semesterAverages[4]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[4].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-purple-900 border-r border-slate-300 bg-purple-50/40">
                      {multiSemesterSummary.semesterAverages[5]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[5].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold text-purple-900 border-r border-slate-300 bg-purple-50/40">
                      {multiSemesterSummary.semesterAverages[6]?.average
                        ? formatIndonesianNumber(multiSemesterSummary.semesterAverages[6].average)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-950 border-r border-slate-300 bg-slate-200">
                      {multiSemesterSummary.cumulativeAverage > 0
                        ? formatIndonesianNumber(multiSemesterSummary.cumulativeAverage)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-blue-900">
                      {multiSemesterSummary.cumulativeAverage > 0
                        ? getPredicateForScore(multiSemesterSummary.cumulativeAverage, schoolSettings.predicates).predicate
                        : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cumulative Summary Footer Box */}
            <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-700">
                  Jumlah Semester Terisi:{' '}
                  <strong className="text-slate-900">
                    {multiSemesterSummary.completedSemestersCount} dari 6 Semester
                  </strong>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  * Seluruh nilai diambil dari rekapan unggahan guru pengampu mata pelajaran yang tercatat resmi dalam sistem SIRNA.
                </p>
              </div>

              <div className="flex items-center gap-6 text-right shrink-0">
                <div>
                  <span className="text-[11px] text-slate-500 block">Rata-Rata Kumulatif (IPK):</span>
                  <strong className="text-xl font-extrabold text-blue-900">
                    {multiSemesterSummary.cumulativeAverage > 0
                      ? formatIndonesianNumber(multiSemesterSummary.cumulativeAverage)
                      : '-'}
                  </strong>
                </div>

                {/* Directive 1d: Peringkat Eligible di Box Footer */}
                <div>
                  <span className="text-[11px] text-amber-800 font-bold block">Peringkat Eligible:</span>
                  <strong className="text-xl font-black text-amber-600">
                    {eligibleRank ? `Ke-${eligibleRank}` : '-'}
                  </strong>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">Predikat Kumulatif:</span>
                  <strong className="text-xl font-extrabold text-slate-800">
                    {multiSemesterSummary.cumulativeAverage > 0
                      ? getPredicateForScore(multiSemesterSummary.cumulativeAverage, schoolSettings.predicates).predicate
                      : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Print date notice */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dicetak secara mandiri melalui Portal Nilai Peserta Didik (SIRNA)</span>
              <span>Tanggal: {formatIndonesianDate(new Date())}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: RANGKUMAN NILAI PER SEMESTER                           */}
      {/* ============================================================== */}
      {viewMode === 'semester' && (
        <div className="space-y-6">
          {/* Directive 1a: Periode Tahun Pelajaran & Semester di dalam kolom halaman peserta didik */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Pilihan Periode Tahun Pelajaran & Semester
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tentukan periode semester yang ingin ditampilkan pada rangkuman nilai Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden md:inline">Semester:</span>
              <select
                value={activeSemId}
                onChange={(e) => setActiveSemId(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-blue-200 font-bold text-xs text-blue-950 bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                {availableSemesters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === 'published' ? '(Resmi Terbit)' : `(${s.status})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Cards (Screen only) - Directive 1e: Peringkat Kelas & Paralel Manual Input */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Rata-Rata Semester</span>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">
                {studentSummary?.averageScore ? formatIndonesianNumber(studentSummary.averageScore) : '-'}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {studentGrades.length} Mapel Selesai
              </span>
            </div>

            {schoolSettings.portalShowRank && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Peringkat Kelas</span>
                <div className="text-2xl font-extrabold text-amber-600 mt-1 flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>{studentSummary?.classRank ? `Ke-${studentSummary.classRank}` : '-'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {studentSummary?.classRank ? 'Ditetapkan Pihak Sekolah' : 'Belum Ditetapkan'}
                </span>
              </div>
            )}

            {schoolSettings.portalShowRank && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Peringkat Paralel</span>
                <div className="text-2xl font-extrabold text-indigo-600 mt-1 flex items-center gap-1.5">
                  <Trophy className="w-5 h-5 text-indigo-500" />
                  <span>{studentSummary?.parallelRank ? `Ke-${studentSummary.parallelRank}` : '-'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {studentSummary?.parallelRank ? 'Peringkat Seluruh Tingkat' : 'Belum Ditetapkan'}
                </span>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Status Kelengkapan</span>
              <div className="mt-1">
                {studentSummary?.isComplete ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    ✓ Lengkap
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Menunggu Nilai
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Mata Pelajaran Wajib</span>
            </div>
          </div>

          {/* Official Report Card Sheet (Printed and Screen) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
            <PrintHeader
              documentTitle="REKAPITULASI HASIL BELAJAR PESERTA DIDIK"
              subTitle={`Tahun Pelajaran: ${schoolSettings.schoolName} | ${activeSemester?.name || ''}`}
            />

            {/* Student Identity Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-slate-200">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-36 text-slate-500">Nama Peserta Didik</span>
                  <strong className="text-slate-900">: {verifiedStudent.name}</strong>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500">Nomor Induk Siswa (NIS)</span>
                  <strong className="text-slate-900 font-mono">: {verifiedStudent.nis}</strong>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500">NISN</span>
                  <strong className="text-slate-900 font-mono">: {verifiedStudent.nisn}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-36 text-slate-500">Rombongan Belajar</span>
                  <strong className="text-slate-900">: {studentClass?.name || verifiedStudent.currentClassName}</strong>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500">Tingkat / Fase</span>
                  <strong className="text-slate-900">: Kelas {studentClass?.gradeLevel || '10'}</strong>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500">Semester</span>
                  <strong className="text-slate-900">: {activeSemester?.name}</strong>
                </div>
              </div>
            </div>

            {/* Mobile swipe hint */}
            <div className="block sm:hidden px-3.5 py-2 mb-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-medium no-print">
              ↔ Geser tabel ke kanan/kiri untuk melihat seluruh rincian nilai
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border border-slate-300 print-table min-w-[620px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-800 tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No.</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Mata Pelajaran</th>
                    <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">Nilai Akhir</th>
                    <th className="py-2.5 px-3 w-20 text-center border-r border-slate-300">Predikat</th>
                    <th className="py-2.5 px-4">Capaian Kompetensi / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentGrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nilai akhir untuk semester ini masih dalam tahap pengolahan / verifikasi dan belum dipublikasikan oleh pihak sekolah.
                      </td>
                    </tr>
                  ) : (
                    studentGrades.map((g, idx) => {
                      const pred = getPredicateForScore(g.finalScore, schoolSettings.predicates);
                      return (
                        <tr key={g.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                            {g.subjectName}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                            {formatIndonesianNumber(g.finalScore)}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">
                            {pred.predicate}
                          </td>
                          <td className="py-2 px-4 text-slate-700">{pred.description}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            {studentGrades.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-slate-600">
                    Jumlah Mata Pelajaran Selesai:{' '}
                    <strong className="text-slate-900">{studentGrades.length} Mata Pelajaran</strong>
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Status Kelengkapan:{' '}
                    <strong className={studentSummary?.isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                      {studentSummary?.isComplete ? 'Lengkap' : 'Menunggu Kelengkapan Nilai'}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Rata-Rata Semester:</span>
                    <strong className="text-lg font-extrabold text-blue-900">
                      {studentSummary?.averageScore ? formatIndonesianNumber(studentSummary.averageScore) : '-'}
                    </strong>
                  </div>

                  {schoolSettings.portalShowRank && studentSummary?.classRank && (
                    <div>
                      <span className="text-[11px] text-slate-400 block">Peringkat Kelas:</span>
                      <strong className="text-lg font-extrabold text-amber-600">
                        Ke-{studentSummary.classRank}
                      </strong>
                    </div>
                  )}

                  {schoolSettings.portalShowRank && studentSummary?.parallelRank && (
                    <div>
                      <span className="text-[11px] text-slate-400 block">Peringkat Paralel:</span>
                      <strong className="text-lg font-extrabold text-indigo-600">
                        Ke-{studentSummary.parallelRank}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Print date notice */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dicetak secara mandiri melalui Portal Nilai Peserta Didik (SIRNA)</span>
              <span>Tanggal: {formatIndonesianDate(new Date())}</span>
            </div>
          </div>

          {/* Historical Progress */}
          {historicalProgress.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Riwayat Capaian Nilai & Peringkat per Semester</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rata-rata nilai dan peringkat kelas serta paralel yang ditetapkan pihak sekolah
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Total {historicalProgress.length} Semester Terdata
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden min-w-[640px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No.</th>
                      <th className="py-3 px-4">Semester & Tahun Pelajaran</th>
                      <th className="py-3 px-3 text-right">Rata-Rata</th>
                      <th className="py-3 px-4 text-center">Peringkat Kelas</th>
                      <th className="py-3 px-4 text-center">Peringkat Paralel</th>
                      <th className="py-3 px-3 text-center">Kelengkapan</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicalProgress.map((item, idx) => {
                      const isActive = item.semesterId === activeSemId;
                      return (
                        <tr
                          key={item.semesterId}
                          className={`transition ${isActive ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{item.semesterName}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                                  Aktif Dilihat
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{item.subjectCount} Mata Pelajaran</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-900 text-sm">
                            {item.averageScore > 0 ? formatIndonesianNumber(item.averageScore) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {schoolSettings.portalShowRank ? (
                              item.classRank ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Award className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Ke-{item.classRank}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">-</span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[11px]">Privat</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {schoolSettings.portalShowRank ? (
                              item.parallelRank ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Trophy className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Ke-{item.parallelRank}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">-</span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[11px]">Privat</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.isComplete ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✓ Lengkap
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Proses
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setActiveSemId(item.semesterId)}
                              disabled={isActive}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isActive
                                  ? 'bg-slate-200 text-slate-500 cursor-default'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer'
                              }`}
                            >
                              {isActive ? 'Sedang Dibuka' : 'Buka Nilai'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
