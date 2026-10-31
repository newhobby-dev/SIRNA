import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  Printer,
  Download,
  Trophy,
  Save,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  FileDown,
  Table as TableIcon,
  Check,
  X,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  getPredicateForScore,
  sortStudentsAlphabetically,
  getStudentsForPeriod,
  getClassStudentsWithHistory,
} from '../../lib/utils';

interface ParsedRankRow {
  studentId: string;
  nis: string;
  nisn: string;
  name: string;
  className: string;
  totalScore?: number;
  averageScore?: number;
  classRank?: number | null;
  parallelRank?: number | null;
  eligibleRank?: number | null;
}

export interface RankingsViewProps {
  initialScope?: 'class_parallel' | 'eligible';
}

export const RankingsView: React.FC<RankingsViewProps> = ({
  initialScope = 'class_parallel',
}) => {
  const {
    students,
    classes,
    gradeEntries,
    academicSummaries,
    semesters,
    selectedYearId,
    selectedSemesterId,
    setSelectedSemesterId,
    currentSemester,
    schoolSettings,
    saveManualRanks,
    isSyncing,
  } = useAcademic();

  const periodStudents = useMemo(() => {
    return getStudentsForPeriod({
      students,
      classes,
      semesters,
      gradeEntries,
      academicYearId: selectedYearId,
      semesterId: selectedSemesterId,
    });
  }, [students, classes, semesters, gradeEntries, selectedYearId, selectedSemesterId]);

  const [activeViewMode, setActiveViewMode] = useState<'table' | 'upload'>('table');
  const [rankingType, setRankingType] = useState<'class' | 'parallel' | 'eligible'>(
    initialScope === 'eligible' ? 'eligible' : 'class'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('10');
  const [eligibleGradeFilter, setEligibleGradeFilter] = useState<string>('12');

  // Sync rankingType when initialScope prop changes (switching between Peringkat Kelas & Paralel vs Peringkat Eligible menu)
  useEffect(() => {
    if (initialScope === 'eligible') {
      setRankingType('eligible');
    } else if (rankingType === 'eligible') {
      setRankingType('class');
    }
    setActiveViewMode('table');
    setParsedUploadRows([]);
    setUploadedFileName('');
    setUploadError(null);
  }, [initialScope]);

  // Ensure selectedClassId is valid when classes load
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Input states for manual ranks per student ID
  const [inputRanks, setInputRanks] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Upload template states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parsedUploadRows, setParsedUploadRows] = useState<ParsedRankRow[]>([]);
  const [unmatchedUploadRows, setUnmatchedUploadRows] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSavingUpload, setIsSavingUpload] = useState<boolean>(false);

  const currentClass = classes.find(c => c.id === selectedClassId);
  const activeSemester = semesters.find(s => s.id === selectedSemesterId) || currentSemester;

  // Dynamic labels based on active rankingType
  const modeLabel =
    rankingType === 'class'
      ? 'Peringkat Kelas'
      : rankingType === 'parallel'
      ? 'Peringkat Paralel'
      : 'Peringkat Eligible';

  // Compute items list based on mode
  const rankingItems = useMemo(() => {
    if (rankingType === 'class') {
      let classStudents = periodStudents.filter(
        s => s.status === 'aktif' && s.currentClassId === selectedClassId
      );
      if (classStudents.length === 0 && selectedClassId) {
        classStudents = getClassStudentsWithHistory({
          classId: selectedClassId,
          semesterId: selectedSemesterId,
          students,
          gradeEntries,
        }).map(s => ({
          ...s,
          currentClassId: selectedClassId,
          currentClassName: currentClass?.name || s.currentClassName,
        }));
      }

      return classStudents.map(st => {
        const summary =
          academicSummaries.find(
            s =>
              s.studentId === st.id &&
              s.semesterId === selectedSemesterId &&
              s.classId === selectedClassId
          ) ||
          academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
        return {
          studentId: st.id,
          nis: st.nis,
          nisn: st.nisn,
          name: st.name,
          classId: selectedClassId || st.currentClassId,
          className: currentClass?.name || st.currentClassName || 'Kelas',
          gradeLevel: currentClass?.gradeLevel || '10',
          averageScore: summary?.averageScore ?? 0,
          totalScore: summary?.totalScore ?? 0,
          completedCount: summary?.completedCount ?? 0,
          mandatoryCount: summary?.mandatoryCount ?? 0,
          isComplete: summary?.isComplete ?? false,
          currentRank: summary?.classRank ?? null,
          classRank: summary?.classRank ?? null,
          parallelRank: summary?.parallelRank ?? null,
          eligibleRank: summary?.eligibleRank ?? st.eligibleRank ?? null,
        };
      });
    } else if (rankingType === 'parallel') {
      const levelClasses = classes.filter(c => c.gradeLevel === selectedGradeLevel);
      const levelClassIds = new Set(levelClasses.map(c => c.id));

      const levelStudents = periodStudents.filter(
        s =>
          s.status === 'aktif' &&
          (levelClassIds.has(s.currentClassId) || s.currentClassName.includes(selectedGradeLevel))
      );

      return levelStudents.map(st => {
        const summary =
          academicSummaries.find(
            s =>
              s.studentId === st.id &&
              s.semesterId === selectedSemesterId &&
              s.classId === st.currentClassId
          ) ||
          academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
        const stClass = classes.find(c => c.id === st.currentClassId);
        return {
          studentId: st.id,
          nis: st.nis,
          nisn: st.nisn,
          name: st.name,
          classId: st.currentClassId,
          className: stClass?.name || st.currentClassName || 'Kelas',
          gradeLevel: selectedGradeLevel,
          averageScore: summary?.averageScore ?? 0,
          totalScore: summary?.totalScore ?? 0,
          completedCount: summary?.completedCount ?? 0,
          mandatoryCount: summary?.mandatoryCount ?? 0,
          isComplete: summary?.isComplete ?? false,
          currentRank: summary?.parallelRank ?? null,
          classRank: summary?.classRank ?? null,
          parallelRank: summary?.parallelRank ?? null,
          eligibleRank: summary?.eligibleRank ?? st.eligibleRank ?? null,
        };
      });
    } else {
      let eligibleStudents = periodStudents.filter(s => s.status === 'aktif');
      if (eligibleGradeFilter !== 'all') {
        const filterClasses = classes.filter(c => c.gradeLevel === eligibleGradeFilter);
        const filterClassIds = new Set(filterClasses.map(c => c.id));
        eligibleStudents = eligibleStudents.filter(
          s =>
            filterClassIds.has(s.currentClassId) ||
            s.currentClassName.includes(eligibleGradeFilter)
        );
      }

      return eligibleStudents.map(st => {
        const summary =
          academicSummaries.find(
            s =>
              s.studentId === st.id &&
              s.semesterId === selectedSemesterId &&
              s.classId === st.currentClassId
          ) ||
          academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
        const stClass = classes.find(c => c.id === st.currentClassId);
        const eligibleRank = summary?.eligibleRank ?? st.eligibleRank ?? null;
        return {
          studentId: st.id,
          nis: st.nis,
          nisn: st.nisn,
          name: st.name,
          classId: st.currentClassId,
          className: stClass?.name || st.currentClassName || 'Kelas',
          gradeLevel: stClass?.gradeLevel || '12',
          averageScore: summary?.averageScore ?? 0,
          totalScore: summary?.totalScore ?? 0,
          completedCount: summary?.completedCount ?? 0,
          mandatoryCount: summary?.mandatoryCount ?? 0,
          isComplete: summary?.isComplete ?? false,
          currentRank: eligibleRank,
          classRank: summary?.classRank ?? null,
          parallelRank: summary?.parallelRank ?? null,
          eligibleRank,
        };
      });
    }
  }, [
    rankingType,
    selectedClassId,
    selectedGradeLevel,
    eligibleGradeFilter,
    periodStudents,
    students,
    gradeEntries,
    classes,
    academicSummaries,
    selectedSemesterId,
    currentClass,
  ]);

  // Synchronize input fields whenever active scope or underlying currentRank changes
  useEffect(() => {
    const initialMap: Record<string, string> = {};
    rankingItems.forEach(item => {
      initialMap[item.studentId] =
        item.currentRank !== null && item.currentRank !== undefined
          ? String(item.currentRank)
          : '';
    });
    setInputRanks(initialMap);
  }, [
    rankingType,
    selectedClassId,
    selectedGradeLevel,
    eligibleGradeFilter,
    selectedSemesterId,
    academicSummaries,
  ]);

  // Handle single student rank input change
  const handleRankInputChange = (studentId: string, val: string) => {
    setInputRanks(prev => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Helper function to draft ranking numbers based on averageScore descending
  const handleAutoDraftFromAverage = () => {
    const sorted = [...rankingItems].sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return a.name.localeCompare(b.name, 'id');
    });

    const newInputs: Record<string, string> = {};
    sorted.forEach((item, index) => {
      newInputs[item.studentId] = String(index + 1);
    });
    setInputRanks(newInputs);
    setSaveSuccessMsg(
      `Draf nomor urut ${modeLabel} berdasarkan rata-rata telah diisi. Silakan cek dan klik "Simpan ${modeLabel}" untuk menetapkannya.`
    );
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Clear draft ranks
  const handleClearRanks = () => {
    const newInputs: Record<string, string> = {};
    rankingItems.forEach(item => {
      newInputs[item.studentId] = '';
    });
    setInputRanks(newInputs);
  };

  // Save manual rankings to database
  const handleSaveManualRanks = async () => {
    const updates = rankingItems.map(item => {
      const valStr = inputRanks[item.studentId]?.trim();
      const parsed = valStr && !isNaN(Number(valStr)) ? parseInt(valStr, 10) : null;

      if (rankingType === 'class') {
        return {
          studentId: item.studentId,
          semesterId: selectedSemesterId,
          classRank: parsed,
        };
      } else if (rankingType === 'parallel') {
        return {
          studentId: item.studentId,
          semesterId: selectedSemesterId,
          parallelRank: parsed,
        };
      } else {
        return {
          studentId: item.studentId,
          semesterId: selectedSemesterId,
          eligibleRank: parsed,
        };
      }
    });

    await saveManualRanks(updates);
    setSaveSuccessMsg(`Berhasil! ${modeLabel} telah disimpan secara manual oleh Admin.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Sort rows for presentation: by assigned rank ascending, then by averageScore descending, then name
  const sortedItemsForDisplay = useMemo(() => {
    return [...rankingItems].sort((a, b) => {
      const rankAStr = inputRanks[a.studentId];
      const rankBStr = inputRanks[b.studentId];
      const rankA = rankAStr && !isNaN(Number(rankAStr)) ? Number(rankAStr) : null;
      const rankB = rankBStr && !isNaN(Number(rankBStr)) ? Number(rankBStr) : null;

      if (rankA !== null && rankB !== null) {
        if (rankA !== rankB) return rankA - rankB;
      } else if (rankA !== null) {
        return -1;
      } else if (rankB !== null) {
        return 1;
      }

      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return a.name.localeCompare(b.name, 'id');
    });
  }, [rankingItems, inputRanks]);

  const handlePrint = () => {
    window.print();
  };

  // ============================================================================
  // EKSPOR PERINGKAT SESUAI HALAMAN AKTIF (KELAS / PARALEL / ELIGIBLE)
  // ============================================================================

  // 1. Ekspor Peringkat Filter Saat Ini (1 Kelas / 1 Tingkat / 1 Jenjang Eligible)
  const handleExportCurrentRanking = () => {
    if (rankingType === 'class') {
      const dataToExport = sortedItemsForDisplay.map((item, index) => {
        const rankVal = inputRanks[item.studentId] || item.classRank || '-';
        return {
          No: index + 1,
          'Peringkat Kelas': rankVal,
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          'Total Nilai': formatIndonesianNumber(item.totalScore),
          'Rata-Rata Nilai': formatIndonesianNumber(item.averageScore),
          Predikat: getPredicateForScore(item.averageScore, schoolSettings.predicates).predicate,
          'Status Kelengkapan': item.isComplete ? 'Lengkap' : 'Belum Lengkap',
        };
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Kelas_${currentClass?.name || 'Kelas'}_${activeSemester?.name || 'Semester'}`,
        [{ sheetName: `Peringkat ${currentClass?.name || 'Kelas'}`, data: dataToExport }]
      );
    } else if (rankingType === 'parallel') {
      const dataToExport = sortedItemsForDisplay.map((item, index) => {
        const rankVal = inputRanks[item.studentId] || item.parallelRank || '-';
        return {
          No: index + 1,
          'Peringkat Paralel': rankVal,
          'Peringkat Kelas': item.classRank ?? '-',
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          Tingkat: `Tingkat ${selectedGradeLevel}`,
          'Total Nilai': formatIndonesianNumber(item.totalScore),
          'Rata-Rata Nilai': formatIndonesianNumber(item.averageScore),
          Predikat: getPredicateForScore(item.averageScore, schoolSettings.predicates).predicate,
          'Status Kelengkapan': item.isComplete ? 'Lengkap' : 'Belum Lengkap',
        };
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Paralel_Tingkat_${selectedGradeLevel}_${activeSemester?.name || 'Semester'}`,
        [{ sheetName: `Paralel Tingkat ${selectedGradeLevel}`, data: dataToExport }]
      );
    } else {
      const filterTitle =
        eligibleGradeFilter === 'all' ? 'Semua_Tingkat' : `Tingkat_${eligibleGradeFilter}`;
      const dataToExport = sortedItemsForDisplay.map((item, index) => {
        const rankVal = inputRanks[item.studentId] || item.eligibleRank || '-';
        return {
          No: index + 1,
          'Peringkat Eligible': rankVal,
          'Peringkat Paralel': item.parallelRank ?? '-',
          'Peringkat Kelas': item.classRank ?? '-',
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          Tingkat: `Tingkat ${item.gradeLevel}`,
          'Total Nilai': formatIndonesianNumber(item.totalScore),
          'Rata-Rata Nilai': formatIndonesianNumber(item.averageScore),
          Predikat: getPredicateForScore(item.averageScore, schoolSettings.predicates).predicate,
          'Status Kelengkapan': item.isComplete ? 'Lengkap' : 'Belum Lengkap',
        };
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Eligible_${filterTitle}_${activeSemester?.name || 'Semester'}`,
        [{ sheetName: `Eligible ${filterTitle}`.substring(0, 31), data: dataToExport }]
      );
    }
  };

  // 2. Ekspor Massal Peringkat Sesuai Halaman (Semua Kelas / Semua Tingkat Paralel / Semua Eligible)
  const handleExportAllRankingsForCurrentType = () => {
    const activeClasses = classes.filter(c => c.isActive);
    const activeStudentsList = periodStudents.filter(s => s.status === 'aktif');
    const sheets: { sheetName: string; data: Record<string, any>[] }[] = [];

    if (rankingType === 'class') {
      // Gabungan seluruh kelas + Sheet per Kelas khusus Peringkat Kelas
      const allClassRankRows: Record<string, any>[] = [];
      let globalNo = 1;

      activeClasses.forEach(cls => {
        const clsStudents = activeStudentsList.filter(s => s.currentClassId === cls.id);
        if (clsStudents.length === 0) return;

        const rowsWithRank = clsStudents.map(st => {
          const summary = academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
          return {
            st,
            classRank: summary?.classRank ?? null,
            totalScore: summary?.totalScore ?? 0,
            averageScore: summary?.averageScore ?? 0,
            isComplete: summary?.isComplete ?? false,
          };
        });

        rowsWithRank.sort((a, b) => {
          if (a.classRank !== null && b.classRank !== null) {
            if (a.classRank !== b.classRank) return a.classRank - b.classRank;
          } else if (a.classRank !== null) {
            return -1;
          } else if (b.classRank !== null) {
            return 1;
          }
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return a.st.name.localeCompare(b.st.name, 'id');
        });

        const sheetRows = rowsWithRank.map((r, idx) => {
          const rowObj = {
            No: idx + 1,
            'Peringkat Kelas': r.classRank ?? '-',
            NIS: r.st.nis,
            NISN: r.st.nisn,
            'Nama Peserta Didik': r.st.name,
            Kelas: cls.name,
            'Total Nilai': formatIndonesianNumber(r.totalScore),
            'Rata-Rata Nilai': formatIndonesianNumber(r.averageScore),
            Predikat: getPredicateForScore(r.averageScore, schoolSettings.predicates).predicate,
            'Status Kelengkapan': r.isComplete ? 'Lengkap' : 'Belum Lengkap',
          };
          allClassRankRows.push({
            ...rowObj,
            No: globalNo++,
          });
          return rowObj;
        });

        sheets.push({
          sheetName: `Kelas ${cls.name}`.substring(0, 31),
          data: sheetRows,
        });
      });

      sheets.unshift({
        sheetName: 'Semua Peringkat Kelas',
        data:
          allClassRankRows.length > 0
            ? allClassRankRows
            : [{ Info: 'Belum ada data peserta didik aktif' }],
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Kelas_Semua_Rombel_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    } else if (rankingType === 'parallel') {
      // Ekspor Peringkat Paralel untuk Semua Tingkat (Tingkat 10, 11, 12)
      const allParallelRows: Record<string, any>[] = [];
      let globalNo = 1;

      (['10', '11', '12'] as const).forEach(level => {
        const levelClassIds = new Set(
          activeClasses.filter(c => c.gradeLevel === level).map(c => c.id)
        );
        const levelStudents = activeStudentsList.filter(
          s => levelClassIds.has(s.currentClassId) || s.currentClassName.includes(level)
        );
        if (levelStudents.length === 0) return;

        const rowsWithSummary = levelStudents.map(st => {
          const summary = academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
          const cls = activeClasses.find(c => c.id === st.currentClassId);
          return {
            st,
            clsName: cls?.name || st.currentClassName || '-',
            totalScore: summary?.totalScore ?? 0,
            averageScore: summary?.averageScore ?? 0,
            classRank: summary?.classRank ?? null,
            parallelRank: summary?.parallelRank ?? null,
            isComplete: summary?.isComplete ?? false,
          };
        });

        rowsWithSummary.sort((a, b) => {
          if (a.parallelRank !== null && b.parallelRank !== null) {
            if (a.parallelRank !== b.parallelRank) return a.parallelRank - b.parallelRank;
          } else if (a.parallelRank !== null) {
            return -1;
          } else if (b.parallelRank !== null) {
            return 1;
          }
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return a.st.name.localeCompare(b.st.name, 'id');
        });

        const sheetData = rowsWithSummary.map((r, idx) => {
          const rowObj = {
            No: idx + 1,
            'Peringkat Paralel': r.parallelRank ?? '-',
            'Peringkat Kelas': r.classRank ?? '-',
            NIS: r.st.nis,
            NISN: r.st.nisn,
            'Nama Peserta Didik': r.st.name,
            Kelas: r.clsName,
            Tingkat: `Tingkat ${level}`,
            'Total Nilai': formatIndonesianNumber(r.totalScore),
            'Rata-Rata Nilai': formatIndonesianNumber(r.averageScore),
            Predikat: getPredicateForScore(r.averageScore, schoolSettings.predicates).predicate,
            'Status Kelengkapan': r.isComplete ? 'Lengkap' : 'Belum Lengkap',
          };
          allParallelRows.push({
            ...rowObj,
            No: globalNo++,
          });
          return rowObj;
        });

        sheets.push({
          sheetName: `Paralel Tingkat ${level}`,
          data: sheetData,
        });
      });

      sheets.unshift({
        sheetName: 'Semua Peringkat Paralel',
        data:
          allParallelRows.length > 0
            ? allParallelRows
            : [{ Info: 'Belum ada data peserta didik aktif' }],
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Paralel_Semua_Tingkat_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    } else {
      // Ekspor Peringkat Eligible (Tingkat 12, 11, 10 & Gabungan)
      const allEligibleRows: Record<string, any>[] = [];
      let globalNo = 1;

      (['12', '11', '10'] as const).forEach(level => {
        const levelClassIds = new Set(
          activeClasses.filter(c => c.gradeLevel === level).map(c => c.id)
        );
        const levelStudents = activeStudentsList.filter(
          s => levelClassIds.has(s.currentClassId) || s.currentClassName.includes(level)
        );
        if (levelStudents.length === 0) return;

        const rowsWithSummary = levelStudents.map(st => {
          const summary = academicSummaries.find(
            s => s.studentId === st.id && s.semesterId === selectedSemesterId
          );
          const cls = activeClasses.find(c => c.id === st.currentClassId);
          const eligibleRank = summary?.eligibleRank ?? st.eligibleRank ?? null;
          return {
            st,
            clsName: cls?.name || st.currentClassName || '-',
            totalScore: summary?.totalScore ?? 0,
            averageScore: summary?.averageScore ?? 0,
            classRank: summary?.classRank ?? null,
            parallelRank: summary?.parallelRank ?? null,
            eligibleRank,
            isComplete: summary?.isComplete ?? false,
          };
        });

        rowsWithSummary.sort((a, b) => {
          if (a.eligibleRank !== null && b.eligibleRank !== null) {
            if (a.eligibleRank !== b.eligibleRank) return a.eligibleRank - b.eligibleRank;
          } else if (a.eligibleRank !== null) {
            return -1;
          } else if (b.eligibleRank !== null) {
            return 1;
          }
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return a.st.name.localeCompare(b.st.name, 'id');
        });

        const sheetData = rowsWithSummary.map((r, idx) => {
          const rowObj = {
            No: idx + 1,
            'Peringkat Eligible': r.eligibleRank ?? '-',
            'Peringkat Paralel': r.parallelRank ?? '-',
            'Peringkat Kelas': r.classRank ?? '-',
            NIS: r.st.nis,
            NISN: r.st.nisn,
            'Nama Peserta Didik': r.st.name,
            Kelas: r.clsName,
            Tingkat: `Tingkat ${level}`,
            'Total Nilai': formatIndonesianNumber(r.totalScore),
            'Rata-Rata Nilai': formatIndonesianNumber(r.averageScore),
            Predikat: getPredicateForScore(r.averageScore, schoolSettings.predicates).predicate,
            'Status Kelengkapan': r.isComplete ? 'Lengkap' : 'Belum Lengkap',
          };
          allEligibleRows.push({
            ...rowObj,
            No: globalNo++,
          });
          return rowObj;
        });

        sheets.push({
          sheetName: `Eligible Tingkat ${level}`,
          data: sheetData,
        });
      });

      sheets.unshift({
        sheetName: 'Daftar Siswa Eligible',
        data:
          allEligibleRows.length > 0
            ? allEligibleRows
            : [{ Info: 'Belum ada data peserta didik aktif' }],
      });

      exportExcelWorkbook(
        `Ekspor_Peringkat_Eligible_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    }
  };

  // ============================================================================
  // TEMPLATE UNGGAH SESUAI HALAMAN AKTIF (PERINGKAT KELAS / PARALEL / ELIGIBLE)
  // ============================================================================

  const handleDownloadUploadTemplate = (scope: 'all' | 'current' = 'all') => {
    const activeClasses = classes.filter(c => c.isActive);
    const activeStudentsList = periodStudents.filter(s => s.status === 'aktif');
    const sheets: { sheetName: string; data: Record<string, any>[] }[] = [];

    if (rankingType === 'class') {
      if (scope === 'current') {
        const templateRows = sortedItemsForDisplay.map((item, idx) => ({
          No: idx + 1,
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          'Total Nilai': item.totalScore || 0,
          'Rata-Rata Nilai': item.averageScore || 0,
          'Peringkat Kelas': item.classRank ?? '',
        }));

        sheets.push({
          sheetName: `Template_${currentClass?.name || 'Kelas'}`.substring(0, 31),
          data:
            templateRows.length > 0
              ? templateRows
              : [
                  {
                    No: 1,
                    NIS: '1001',
                    NISN: '0081001',
                    'Nama Peserta Didik': 'Contoh Nama Siswa',
                    Kelas: currentClass?.name || 'X-A',
                    'Total Nilai': 1250,
                    'Rata-Rata Nilai': 89.29,
                    'Peringkat Kelas': 1,
                  },
                ],
        });
      } else {
        // Semua Kelas (Gabungan + Sheet per Rombel)
        const allRows: Record<string, any>[] = [];
        let no = 1;

        activeClasses.forEach(cls => {
          const clsStudents = sortStudentsAlphabetically(
            activeStudentsList.filter(s => s.currentClassId === cls.id)
          );
          if (clsStudents.length === 0) return;

          const clsRows = clsStudents.map((st, idx) => {
            const summary = academicSummaries.find(
              s => s.studentId === st.id && s.semesterId === selectedSemesterId
            );
            const rowObj = {
              No: idx + 1,
              NIS: st.nis,
              NISN: st.nisn,
              'Nama Peserta Didik': st.name,
              Kelas: cls.name,
              'Total Nilai': summary?.totalScore ?? 0,
              'Rata-Rata Nilai': summary?.averageScore ?? 0,
              'Peringkat Kelas': summary?.classRank ?? '',
            };
            allRows.push({ ...rowObj, No: no++ });
            return rowObj;
          });

          sheets.push({
            sheetName: (cls.code || cls.name || 'Kelas').substring(0, 31),
            data: clsRows,
          });
        });

        sheets.unshift({
          sheetName: 'Template_Semua_Kelas',
          data:
            allRows.length > 0
              ? allRows
              : [
                  {
                    No: 1,
                    NIS: '1001',
                    NISN: '0081001',
                    'Nama Peserta Didik': 'Contoh Nama Siswa',
                    Kelas: 'X-A',
                    'Total Nilai': 1250,
                    'Rata-Rata Nilai': 89.29,
                    'Peringkat Kelas': 1,
                  },
                ],
        });
      }

      sheets.push({
        sheetName: 'Panduan_Unggah',
        data: [
          {
            Kolom: 'NIS / NISN / Nama Peserta Didik',
            Keterangan: 'Digunakan sebagai kunci pencocokan siswa. Jangan mengubah NIS siswa.',
          },
          {
            Kolom: 'Peringkat Kelas',
            Keterangan:
              'Isi dengan angka bulat (1, 2, 3, dst) untuk menetapkan Peringkat Kelas pada semester ini.',
          },
        ],
      });

      const suffix =
        scope === 'current' ? `Kelas_${currentClass?.name || 'Aktif'}` : 'Semua_Kelas';
      exportExcelWorkbook(
        `Template_Unggah_Peringkat_Kelas_${suffix}_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    } else if (rankingType === 'parallel') {
      if (scope === 'current') {
        const templateRows = sortedItemsForDisplay.map((item, idx) => ({
          No: idx + 1,
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          Tingkat: item.gradeLevel,
          'Total Nilai': item.totalScore || 0,
          'Rata-Rata Nilai': item.averageScore || 0,
          'Peringkat Paralel': item.parallelRank ?? '',
        }));

        sheets.push({
          sheetName: `Template_Paralel_${selectedGradeLevel}`,
          data:
            templateRows.length > 0
              ? templateRows
              : [
                  {
                    No: 1,
                    NIS: '1001',
                    NISN: '0081001',
                    'Nama Peserta Didik': 'Contoh Nama Siswa',
                    Kelas: 'X-A',
                    Tingkat: selectedGradeLevel,
                    'Total Nilai': 1250,
                    'Rata-Rata Nilai': 89.29,
                    'Peringkat Paralel': 1,
                  },
                ],
        });
      } else {
        // Semua Tingkat (10, 11, 12)
        const allRows: Record<string, any>[] = [];
        let no = 1;

        (['10', '11', '12'] as const).forEach(level => {
          const levelClassIds = new Set(
            activeClasses.filter(c => c.gradeLevel === level).map(c => c.id)
          );
          const levelStudents = sortStudentsAlphabetically(
            activeStudentsList.filter(
              s => levelClassIds.has(s.currentClassId) || s.currentClassName.includes(level)
            )
          );
          if (levelStudents.length === 0) return;

          const levelRows = levelStudents.map((st, idx) => {
            const summary = academicSummaries.find(
              s => s.studentId === st.id && s.semesterId === selectedSemesterId
            );
            const cls = activeClasses.find(c => c.id === st.currentClassId);
            const rowObj = {
              No: idx + 1,
              NIS: st.nis,
              NISN: st.nisn,
              'Nama Peserta Didik': st.name,
              Kelas: cls?.name || st.currentClassName || '-',
              Tingkat: level,
              'Total Nilai': summary?.totalScore ?? 0,
              'Rata-Rata Nilai': summary?.averageScore ?? 0,
              'Peringkat Paralel': summary?.parallelRank ?? '',
            };
            allRows.push({ ...rowObj, No: no++ });
            return rowObj;
          });

          sheets.push({
            sheetName: `Paralel Tingkat ${level}`,
            data: levelRows,
          });
        });

        sheets.unshift({
          sheetName: 'Template_Semua_Paralel',
          data:
            allRows.length > 0
              ? allRows
              : [
                  {
                    No: 1,
                    NIS: '1001',
                    NISN: '0081001',
                    'Nama Peserta Didik': 'Contoh Nama Siswa',
                    Kelas: 'X-A',
                    Tingkat: '10',
                    'Total Nilai': 1250,
                    'Rata-Rata Nilai': 89.29,
                    'Peringkat Paralel': 1,
                  },
                ],
        });
      }

      sheets.push({
        sheetName: 'Panduan_Unggah',
        data: [
          {
            Kolom: 'NIS / NISN / Nama Peserta Didik',
            Keterangan: 'Digunakan sebagai kunci pencocokan siswa. Jangan mengubah NIS siswa.',
          },
          {
            Kolom: 'Peringkat Paralel',
            Keterangan:
              'Isi dengan angka bulat (1, 2, 3, dst) untuk menetapkan Peringkat Paralel satu angkatan/tingkat.',
          },
        ],
      });

      const suffix =
        scope === 'current' ? `Tingkat_${selectedGradeLevel}` : 'Semua_Tingkat';
      exportExcelWorkbook(
        `Template_Unggah_Peringkat_Paralel_${suffix}_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    } else {
      // Template Peringkat Eligible
      if (scope === 'current') {
        const templateRows = sortedItemsForDisplay.map((item, idx) => ({
          No: idx + 1,
          NIS: item.nis,
          NISN: item.nisn,
          'Nama Peserta Didik': item.name,
          Kelas: item.className,
          Tingkat: item.gradeLevel,
          'Total Nilai': item.totalScore || 0,
          'Rata-Rata Nilai': item.averageScore || 0,
          'Peringkat Eligible': item.eligibleRank ?? '',
        }));

        sheets.push({
          sheetName: `Template_Eligible_${eligibleGradeFilter}`.substring(0, 31),
          data:
            templateRows.length > 0
              ? templateRows
              : [
                  {
                    No: 1,
                    NIS: '1201',
                    NISN: '0061201',
                    'Nama Peserta Didik': 'Contoh Siswa Eligible',
                    Kelas: 'XII-A',
                    Tingkat: '12',
                    'Total Nilai': 1320,
                    'Rata-Rata Nilai': 91.5,
                    'Peringkat Eligible': 1,
                  },
                ],
        });
      } else {
        const allRows: Record<string, any>[] = [];
        let no = 1;

        (['12', '11', '10'] as const).forEach(level => {
          const levelClassIds = new Set(
            activeClasses.filter(c => c.gradeLevel === level).map(c => c.id)
          );
          const levelStudents = sortStudentsAlphabetically(
            activeStudentsList.filter(
              s => levelClassIds.has(s.currentClassId) || s.currentClassName.includes(level)
            )
          );
          if (levelStudents.length === 0) return;

          const levelRows = levelStudents.map((st, idx) => {
            const summary = academicSummaries.find(
              s => s.studentId === st.id && s.semesterId === selectedSemesterId
            );
            const cls = activeClasses.find(c => c.id === st.currentClassId);
            const eligibleRank = summary?.eligibleRank ?? st.eligibleRank ?? '';
            const rowObj = {
              No: idx + 1,
              NIS: st.nis,
              NISN: st.nisn,
              'Nama Peserta Didik': st.name,
              Kelas: cls?.name || st.currentClassName || '-',
              Tingkat: level,
              'Total Nilai': summary?.totalScore ?? 0,
              'Rata-Rata Nilai': summary?.averageScore ?? 0,
              'Peringkat Eligible': eligibleRank,
            };
            allRows.push({ ...rowObj, No: no++ });
            return rowObj;
          });

          sheets.push({
            sheetName: `Eligible Tingkat ${level}`,
            data: levelRows,
          });
        });

        sheets.unshift({
          sheetName: 'Template_Peringkat_Eligible',
          data:
            allRows.length > 0
              ? allRows
              : [
                  {
                    No: 1,
                    NIS: '1201',
                    NISN: '0061201',
                    'Nama Peserta Didik': 'Contoh Siswa Eligible',
                    Kelas: 'XII-A',
                    Tingkat: '12',
                    'Total Nilai': 1320,
                    'Rata-Rata Nilai': 91.5,
                    'Peringkat Eligible': 1,
                  },
                ],
        });
      }

      sheets.push({
        sheetName: 'Panduan_Unggah',
        data: [
          {
            Kolom: 'NIS / NISN / Nama Peserta Didik',
            Keterangan: 'Digunakan sebagai kunci pencocokan siswa. Jangan mengubah NIS siswa.',
          },
          {
            Kolom: 'Peringkat Eligible',
            Keterangan:
              'Isi dengan angka bulat (1, 2, 3, dst) untuk menetapkan Peringkat Eligible seleksi perguruan tinggi (SNBP). Kosongkan jika tidak masuk kuota eligible.',
          },
        ],
      });

      const suffix =
        scope === 'current' ? `Tingkat_${eligibleGradeFilter}` : 'Semua_Tingkat';
      exportExcelWorkbook(
        `Template_Unggah_Peringkat_Eligible_${suffix}_${activeSemester?.name || 'Semester'}`,
        sheets
      );
    }
  };

  // Helper parse number (supports Indonesian comma decimal like "88,50")
  const parseNumericCell = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '' || val === '-') return undefined;
    if (typeof val === 'number') return isNaN(val) ? undefined : val;
    const cleaned = String(val).trim().replace(',', '.');
    if (!cleaned || cleaned === '-') return undefined;
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const parseRankCell = (val: any): number | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null || val === '' || val === '-') return null;
    if (typeof val === 'number') return isNaN(val) ? null : Math.round(val);
    const cleaned = String(val).trim().replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    const num = parseInt(cleaned, 10);
    return isNaN(num) || num <= 0 ? null : num;
  };

  // Proses File Unggahan Excel Template Peringkat
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadError(null);
    setParsedUploadRows([]);
    setUnmatchedUploadRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const activeStudentsList = students.filter(s => s.status === 'aktif');
      const matchedMap = new Map<string, ParsedRankRow>();
      const unmatchedNames: string[] = [];

      workbook.SheetNames.forEach(sheetName => {
        if (sheetName.toLowerCase().includes('panduan')) return;

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        rows.forEach(row => {
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            normRow[k.trim().toLowerCase()] = row[k];
          });

          const rawNis = String(
            normRow['nis'] ?? normRow['no. induk'] ?? normRow['nomor induk'] ?? ''
          ).trim();
          const rawNisn = String(normRow['nisn'] ?? '').trim();
          const rawName = String(
            normRow['nama peserta didik'] ??
              normRow['nama lengkap peserta didik'] ??
              normRow['nama siswa'] ??
              normRow['nama lengkap'] ??
              normRow['nama'] ??
              ''
          ).trim();

          if (!rawNis && !rawNisn && !rawName) return;
          if (rawName.toLowerCase().includes('contoh')) return;

          // Match student by NIS first, then NISN, then exact name
          let matchedStudent = activeStudentsList.find(
            s => rawNis && String(s.nis).trim().toLowerCase() === rawNis.toLowerCase()
          );
          if (!matchedStudent && rawNisn) {
            matchedStudent = activeStudentsList.find(
              s => String(s.nisn).trim().toLowerCase() === rawNisn.toLowerCase()
            );
          }
          if (!matchedStudent && rawName) {
            matchedStudent = activeStudentsList.find(
              s => s.name.trim().toLowerCase() === rawName.toLowerCase()
            );
          }

          if (!matchedStudent) {
            const label = rawName || rawNis || rawNisn;
            if (label && !unmatchedNames.includes(label)) {
              unmatchedNames.push(label);
            }
            return;
          }

          const stClass = classes.find(c => c.id === matchedStudent!.currentClassId);

          const hasClassRankCol =
            'peringkat kelas' in normRow ||
            'ranking kelas' in normRow ||
            (rankingType === 'class' && 'peringkat' in normRow);
          const hasParallelRankCol =
            'peringkat paralel' in normRow ||
            'ranking paralel' in normRow ||
            (rankingType === 'parallel' && 'peringkat' in normRow);
          const hasEligibleRankCol =
            'peringkat eligible' in normRow ||
            'ranking eligible' in normRow ||
            'eligible' in normRow ||
            (rankingType === 'eligible' && 'peringkat' in normRow);

          const classRankVal = hasClassRankCol
            ? parseRankCell(
                normRow['peringkat kelas'] ??
                  normRow['ranking kelas'] ??
                  normRow['peringkat']
              )
            : undefined;

          const parallelRankVal = hasParallelRankCol
            ? parseRankCell(
                normRow['peringkat paralel'] ??
                  normRow['ranking paralel'] ??
                  normRow['peringkat']
              )
            : undefined;

          const eligibleRankVal = hasEligibleRankCol
            ? parseRankCell(
                normRow['peringkat eligible'] ??
                  normRow['ranking eligible'] ??
                  normRow['eligible'] ??
                  normRow['peringkat']
              )
            : undefined;

          const totalScoreVal = parseNumericCell(
            normRow['total nilai'] ?? normRow['jumlah nilai'] ?? normRow['total']
          );
          const avgScoreVal = parseNumericCell(
            normRow['rata-rata nilai'] ?? normRow['rata-rata'] ?? normRow['rerata']
          );

          const prev = matchedMap.get(matchedStudent.id);
          matchedMap.set(matchedStudent.id, {
            studentId: matchedStudent.id,
            nis: matchedStudent.nis,
            nisn: matchedStudent.nisn,
            name: matchedStudent.name,
            className: stClass?.name || matchedStudent.currentClassName || '-',
            totalScore: totalScoreVal !== undefined ? totalScoreVal : prev?.totalScore,
            averageScore: avgScoreVal !== undefined ? avgScoreVal : prev?.averageScore,
            classRank: classRankVal !== undefined ? classRankVal : prev?.classRank,
            parallelRank: parallelRankVal !== undefined ? parallelRankVal : prev?.parallelRank,
            eligibleRank: eligibleRankVal !== undefined ? eligibleRankVal : prev?.eligibleRank,
          });
        });
      });

      const parsedList = Array.from(matchedMap.values());
      if (parsedList.length === 0) {
        setUploadError(
          `Tidak ditemukan data peserta didik yang cocok pada file Excel tersebut. Pastikan menggunakan Template Unggah ${modeLabel} yang resmi.`
        );
      } else {
        setParsedUploadRows(parsedList);
        setUnmatchedUploadRows(unmatchedNames);
      }
    } catch (err: any) {
      setUploadError(
        'Gagal membaca file Excel: ' + (err.message || 'Format file tidak didukung.')
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Simpan hasil unggahan template ke Firestore
  const handleSaveUploadedRanks = async () => {
    if (parsedUploadRows.length === 0) return;
    setIsSavingUpload(true);
    try {
      const updates = parsedUploadRows.map(row => ({
        studentId: row.studentId,
        semesterId: selectedSemesterId,
        classRank: row.classRank,
        parallelRank: row.parallelRank,
        eligibleRank: row.eligibleRank,
        totalScore: row.totalScore,
        averageScore: row.averageScore,
      }));

      await saveManualRanks(updates);
      setSaveSuccessMsg(
        `Berhasil mengunggah dan menyimpan data ${modeLabel} untuk ${updates.length} peserta didik!`
      );
      setParsedUploadRows([]);
      setUploadedFileName('');
      setActiveViewMode('table');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      setUploadError('Gagal menyimpan hasil unggahan: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsSavingUpload(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header (Hidden in Print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          {initialScope === 'eligible' ? (
            <>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span>Peringkat Siswa Eligible (SNBP / Seleksi PTN)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola pemeringkatan siswa eligible secara <strong>manual oleh Admin</strong>, unduh <strong>Template Peringkat Eligible</strong>, unggah Excel, atau <strong>Ekspor Peringkat Eligible</strong>.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>
                  {rankingType === 'class'
                    ? 'Peringkat Kelas Peserta Didik (Semester)'
                    : 'Peringkat Paralel Peserta Didik (Satu Angkatan/Tingkat)'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {rankingType === 'class' ? (
                  <>
                    Kelola <strong>Peringkat Kelas</strong> secara manual oleh Admin, unduh <strong>Template Peringkat Kelas</strong>, atau lakukan <strong>Ekspor Peringkat Kelas</strong>.
                  </>
                ) : (
                  <>
                    Kelola <strong>Peringkat Paralel</strong> secara manual oleh Admin, unduh <strong>Template Peringkat Paralel</strong>, atau lakukan <strong>Ekspor Peringkat Paralel</strong>.
                  </>
                )}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Mode Tabel vs Unggah Template */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Tabel {modeLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewMode === 'upload'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah {modeLabel}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadUploadTemplate('all')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 transition shadow-xs cursor-pointer"
            title={`Unduh Template Excel untuk mengunggah ${modeLabel}`}
          >
            <FileDown className="w-4 h-4 text-purple-600" />
            <span>Template {modeLabel} (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllRankingsForCurrentType}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
            title={
              rankingType === 'class'
                ? 'Ekspor Peringkat Kelas untuk seluruh rombel/kelas sekaligus'
                : rankingType === 'parallel'
                ? 'Ekspor Peringkat Paralel untuk seluruh tingkat (10, 11, 12) sekaligus'
                : 'Ekspor Peringkat Eligible untuk seluruh tingkat sekaligus'
            }
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {rankingType === 'class'
                ? 'Ekspor Peringkat Kelas (Semua Kelas)'
                : rankingType === 'parallel'
                ? 'Ekspor Peringkat Paralel (Semua Tingkat)'
                : 'Ekspor Peringkat Eligible (Semua Tingkat)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportCurrentRanking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            title={`Ekspor ${modeLabel} yang sedang ditampilkan pada tabel`}
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>
              {rankingType === 'class'
                ? `Ekspor Peringkat Kelas (${currentClass?.name || 'Ini'})`
                : rankingType === 'parallel'
                ? `Ekspor Peringkat Paralel (Tingkat ${selectedGradeLevel})`
                : `Ekspor Peringkat Eligible (${
                    eligibleGradeFilter === 'all' ? 'Semua' : `Tingkat ${eligibleGradeFilter}`
                  })`}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md shadow-amber-900/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs for Class vs Parallel when inside "Peringkat Kelas & Paralel" */}
      {initialScope === 'class_parallel' && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Pilih Halaman Peringkat:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRankingType('class');
                  setParsedUploadRows([]);
                  setUploadedFileName('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rankingType === 'class'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Halaman Peringkat Kelas (Semester)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRankingType('parallel');
                  setParsedUploadRows([]);
                  setUploadedFileName('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rankingType === 'parallel'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Halaman Peringkat Paralel (Tingkat)
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Menu ekspor dan template otomatis menyesuaikan dengan halaman <strong>{modeLabel}</strong> yang sedang aktif.
          </div>
        </div>
      )}

      {/* MODE UNGGAH TEMPLATE EXCEL */}
      {activeViewMode === 'upload' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                <span>Unggah Template {modeLabel} (.xlsx)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Unduh <strong>Template {modeLabel}</strong> yang sudah berisi daftar siswa terurut abjad beserta nilai total & rata-rata, isi kolom <strong>{modeLabel}</strong>, lalu unggah kembali ke sistem.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600">Target Semester:</span>
                <select
                  value={selectedSemesterId}
                  onChange={e => setSelectedSemesterId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadUploadTemplate('all')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-xs cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>
                  {rankingType === 'class'
                    ? 'Unduh Template Peringkat Kelas (Semua Kelas)'
                    : rankingType === 'parallel'
                    ? 'Unduh Template Peringkat Paralel (Semua Tingkat)'
                    : 'Unduh Template Peringkat Eligible (Semua Tingkat)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadUploadTemplate('current')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>
                  {rankingType === 'class'
                    ? `Template Kelas ${currentClass?.name || 'Ini'}`
                    : rankingType === 'parallel'
                    ? `Template Paralel Tingkat ${selectedGradeLevel}`
                    : `Template Eligible (${
                        eligibleGradeFilter === 'all' ? 'Semua' : `Tingkat ${eligibleGradeFilter}`
                      })`}
                </span>
              </button>
            </div>
          </div>

          {/* Dropzone / File Input */}
          <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-2xl p-8 text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUploadChange}
              className="hidden"
              id="ranking-excel-upload-input"
            />
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Pilih File Template Excel {modeLabel} (.xlsx)
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
                Sistem mendukung unggahan satu sheet gabungan maupun banyak sheet sekaligus. Pencocokan dilakukan otomatis berdasarkan NIS, NISN, atau Nama Lengkap Peserta Didik.
              </p>
            </div>
            <div className="pt-2">
              <label
                htmlFor="ranking-excel-upload-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih File Excel {modeLabel}</span>
              </label>
            </div>
            {uploadedFileName && (
              <p className="text-xs font-semibold text-purple-800">
                File terpilih: <span className="underline">{uploadedFileName}</span>
              </p>
            )}
          </div>

          {uploadError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {unmatchedUploadRows.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-bold">
                Perhatian: Terdapat {unmatchedUploadRows.length} baris yang tidak ditemukan kecocokan NIS/Namanya di database aktif:
              </p>
              <p className="mt-1 text-amber-800">
                {unmatchedUploadRows.slice(0, 10).join(', ')}
                {unmatchedUploadRows.length > 10
                  ? ` ...dan ${unmatchedUploadRows.length - 10} lainnya.`
                  : ''}
              </p>
            </div>
          )}

          {/* Pratinjau Hasil Parsing Excel */}
          {parsedUploadRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Pratinjau Unggahan {modeLabel}: {parsedUploadRows.length} Peserta Didik Siap Disimpan
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Periksa kembali data di bawah ini, lalu klik tombol <strong>"Simpan Unggahan {modeLabel}"</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedUploadRows([]);
                      setUploadedFileName('');
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUploadedRanks}
                    disabled={isSavingUpload || isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSavingUpload || isSyncing
                        ? 'Menyimpan...'
                        : `Simpan Unggahan ${modeLabel} (${parsedUploadRows.length} Siswa)`}
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 border-b border-slate-200">No</th>
                      <th className="py-2.5 px-3 border-b border-slate-200">NIS</th>
                      <th className="py-2.5 px-3 border-b border-slate-200">Nama Peserta Didik</th>
                      <th className="py-2.5 px-3 border-b border-slate-200">Kelas</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 text-right">Total Nilai</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 text-right">Rata-Rata</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 text-center">Peringkat Kelas</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 text-center">Peringkat Paralel</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 text-center">Peringkat Eligible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedUploadRows.map((r, idx) => (
                      <tr key={r.studentId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{r.nis}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                        <td className="py-2 px-3 text-slate-700">{r.className}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {r.totalScore !== undefined ? formatIndonesianNumber(r.totalScore) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                          {r.averageScore !== undefined ? formatIndonesianNumber(r.averageScore) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {r.classRank ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-indigo-700">
                          {r.parallelRank ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-purple-700">
                          {r.eligibleRank ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE TABEL & INPUT MANUAL */}
      {activeViewMode === 'table' && (
        <>
          {/* Filter & Dedicated Export/Template Bar per Page (Screen Only) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Contextual Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Semester:</span>
                  <select
                    value={selectedSemesterId}
                    onChange={e => setSelectedSemesterId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {rankingType === 'class' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600">Pilih Rombel / Kelas:</span>
                    <select
                      value={selectedClassId}
                      onChange={e => setSelectedClassId(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Tingkat {c.gradeLevel})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {rankingType === 'parallel' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600">Pilih Tingkat Paralel:</span>
                    <select
                      value={selectedGradeLevel}
                      onChange={e => setSelectedGradeLevel(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="10">Tingkat 10 (Fase E)</option>
                      <option value="11">Tingkat 11 (Fase F)</option>
                      <option value="12">Tingkat 12 (Fase F)</option>
                    </select>
                  </div>
                )}

                {rankingType === 'eligible' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600">Filter Jenjang Eligible:</span>
                    <select
                      value={eligibleGradeFilter}
                      onChange={e => setEligibleGradeFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="12">Tingkat 12 (Calon Peserta SNBP)</option>
                      <option value="11">Tingkat 11</option>
                      <option value="10">Tingkat 10</option>
                      <option value="all">Semua Siswa Terdaftar</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Dedicated Page Export & Template Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadUploadTemplate('current')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 transition cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {rankingType === 'class'
                      ? `Template Peringkat Kelas (${currentClass?.name || 'Ini'})`
                      : rankingType === 'parallel'
                      ? `Template Peringkat Paralel (Tingkat ${selectedGradeLevel})`
                      : `Template Peringkat Eligible (${
                          eligibleGradeFilter === 'all' ? 'Semua' : `Tingkat ${eligibleGradeFilter}`
                        })`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCurrentRanking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {rankingType === 'class'
                      ? `Ekspor Peringkat Kelas ${currentClass?.name || ''}`
                      : rankingType === 'parallel'
                      ? `Ekspor Peringkat Paralel Tingkat ${selectedGradeLevel}`
                      : `Ekspor Peringkat Eligible ${
                          eligibleGradeFilter === 'all' ? 'Semua' : `Tingkat ${eligibleGradeFilter}`
                        }`}
                  </span>
                </button>
              </div>
            </div>

            {/* Action Bar for Manual Input */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Mode Input Manual: Masukkan nomor urut <strong>{modeLabel}</strong> pada tabel atau gunakan tombol <strong>Unggah {modeLabel}</strong>
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoDraftFromAverage}
                  type="button"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold transition cursor-pointer"
                  title="Mengisi otomatis nomor 1, 2, 3... berdasarkan rata-rata nilai tertinggi sebagai draf awal yang dapat Anda edit"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bantu Draf Urutan Nilai</span>
                </button>

                <button
                  onClick={handleClearRanks}
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium transition cursor-pointer"
                  title="Kosongkan nomor urut yang sedang diedit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Kolom</span>
                </button>

                <button
                  onClick={handleSaveManualRanks}
                  disabled={isSyncing}
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSyncing ? 'Menyimpan...' : `Simpan ${modeLabel}`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Podium Top 3 (Screen only preview) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
            {sortedItemsForDisplay
              .filter(i => inputRanks[i.studentId] && Number(inputRanks[i.studentId]) <= 3)
              .slice(0, 3)
              .map(item => {
                const rankVal = inputRanks[item.studentId];
                return (
                  <div
                    key={item.studentId}
                    className={`p-5 rounded-2xl border text-center transition flex flex-col items-center justify-between shadow-xs ${
                      rankVal === '1'
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                        : rankVal === '2'
                        ? 'bg-slate-100/70 border-slate-300'
                        : 'bg-orange-50/70 border-orange-200'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shadow-sm mb-2 ${
                          rankVal === '1'
                            ? 'bg-amber-400 text-slate-950 shadow-amber-300'
                            : rankVal === '2'
                            ? 'bg-slate-300 text-slate-900'
                            : 'bg-orange-300 text-slate-950'
                        }`}
                      >
                        {rankVal}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {rankingType === 'eligible'
                          ? `Eligible Ke-${rankVal}`
                          : rankVal === '1'
                          ? 'Peringkat Pertama'
                          : rankVal === '2'
                          ? 'Peringkat Kedua'
                          : 'Peringkat Ketiga'}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">{item.name}</h3>
                      <p className="text-xs text-slate-500">
                        {item.className} • NIS: {item.nis}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 w-full flex items-center justify-around text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Rata-Rata</span>
                        <strong className="text-base font-extrabold text-slate-900">
                          {formatIndonesianNumber(item.averageScore)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Nilai</span>
                        <strong className="text-slate-700 font-mono">
                          {formatIndonesianNumber(item.totalScore)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Official Printable Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
            <PrintHeader
              documentTitle={
                rankingType === 'eligible'
                  ? 'DAFTAR PERINGKAT SISWA ELIGIBLE SELEKSI NASIONAL'
                  : rankingType === 'parallel'
                  ? 'DAFTAR PERINGKAT PARALEL HASIL BELAJAR PESERTA DIDIK'
                  : 'DAFTAR PERINGKAT KELAS HASIL BELAJAR PESERTA DIDIK'
              }
              subTitle={
                rankingType === 'class'
                  ? `Kelas: ${currentClass?.name || ''} | ${activeSemester?.name || ''}`
                  : rankingType === 'parallel'
                  ? `Paralel Tingkat: ${selectedGradeLevel} | ${activeSemester?.name || ''}`
                  : `Peringkat Eligible Kuota Seleksi Perguruan Tinggi (SNBP) | ${activeSemester?.name || ''}`
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300 print-table">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 text-center w-24 border-r border-slate-300">
                      {modeLabel}
                    </th>
                    <th className="py-2.5 px-3 w-24 border-r border-slate-300">NIS</th>
                    <th className="py-2.5 px-3 w-28 border-r border-slate-300">NISN</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">
                      Nama Lengkap Peserta Didik
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-300">
                      Total Nilai
                    </th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/70 border-r border-slate-300">
                      Rata-Rata
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-300">Predikat</th>
                    <th className="py-2.5 px-3 text-center">Status Kelengkapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedItemsForDisplay.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Belum ada data peserta didik untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    sortedItemsForDisplay.map(item => {
                      const rankVal = inputRanks[item.studentId] || '';
                      const pred = getPredicateForScore(
                        item.averageScore,
                        schoolSettings.predicates
                      );

                      return (
                        <tr key={item.studentId} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <div className="no-print flex items-center justify-center">
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={rankVal}
                                onChange={e =>
                                  handleRankInputChange(item.studentId, e.target.value)
                                }
                                placeholder="-"
                                className={`w-14 py-1 text-center font-bold text-xs rounded-lg border transition focus:outline-none focus:ring-2 ${
                                  rankVal === '1'
                                    ? 'bg-amber-100 border-amber-300 text-amber-950 focus:ring-amber-500'
                                    : rankVal === '2'
                                    ? 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-slate-500'
                                    : rankVal === '3'
                                    ? 'bg-orange-100 border-orange-300 text-orange-950 focus:ring-orange-500'
                                    : 'border-slate-200 text-slate-900 focus:ring-blue-500'
                                }`}
                              />
                            </div>
                            <div className="hidden print:block font-bold font-mono text-center">
                              {rankVal || '-'}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">
                            {item.nis}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">
                            {item.nisn}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                            {item.className}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                            {formatIndonesianNumber(item.totalScore)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                            {formatIndonesianNumber(item.averageScore)}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-800">
                            {pred.predicate}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.isComplete ? (
                              <span className="text-[10px] font-bold text-emerald-700">Lengkap</span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600">
                                Belum Lengkap
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Save reminder button beneath table (Screen only) */}
            <div className="mt-4 flex items-center justify-between no-print text-xs text-slate-500">
              <p>
                * Catatan: Nilai nomor urut pada kolom pertama adalah{' '}
                <strong>input manual Admin</strong>. Jangan lupa klik tombol{' '}
                <strong>"Simpan {modeLabel}"</strong> setelah melakukan perubahan.
              </p>
              <button
                onClick={handleSaveManualRanks}
                disabled={isSyncing}
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Simpan {modeLabel}</span>
              </button>
            </div>

            {/* Official Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end text-xs text-slate-800">
              <div className="text-center min-w-[240px]">
                <p className="text-slate-500">
                  {schoolSettings.city}, {formatIndonesianDate(new Date())}
                </p>
                <p className="font-semibold text-slate-900">
                  Kepala {schoolSettings.schoolName}
                </p>
                <div className="h-20 flex items-end justify-center">
                  <span className="font-bold underline text-slate-950">
                    {schoolSettings.principalName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">NIP. {schoolSettings.principalNip}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
