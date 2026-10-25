import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Printer,
  Download,
  Filter,
  Trophy,
  Medal,
  Star,
  Save,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  getPredicateForScore,
} from '../../lib/utils';
import { AcademicSummary } from '../../types';

export const RankingsView: React.FC = () => {
  const {
    students,
    classes,
    academicSummaries,
    semesters,
    selectedSemesterId,
    setSelectedSemesterId,
    currentSemester,
    schoolSettings,
    saveManualRanks,
    isSyncing,
  } = useAcademic();

  const [rankingType, setRankingType] = useState<'class' | 'parallel' | 'eligible'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('10');
  const [eligibleGradeFilter, setEligibleGradeFilter] = useState<string>('12');

  // Input states for manual ranks per student ID
  const [inputRanks, setInputRanks] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filter students / summaries for the chosen mode
  const currentClass = classes.find(c => c.id === selectedClassId);
  const activeSemester = semesters.find(s => s.id === selectedSemesterId) || currentSemester;

  // Compute items list based on mode
  const rankingItems = useMemo(() => {
    if (rankingType === 'class') {
      // Siswa dalam kelas yang dipilih
      const classStudents = students.filter(
        s => s.status === 'aktif' && s.currentClassId === selectedClassId
      );

      return classStudents.map(st => {
        const summary = academicSummaries.find(
          s => s.studentId === st.id && s.semesterId === selectedSemesterId
        );
        return {
          studentId: st.id,
          nis: st.nis,
          nisn: st.nisn,
          name: st.name,
          classId: st.currentClassId,
          className: currentClass?.name || st.currentClassName || 'Kelas',
          gradeLevel: currentClass?.gradeLevel || '10',
          averageScore: summary?.averageScore ?? 0,
          totalScore: summary?.totalScore ?? 0,
          completedCount: summary?.completedCount ?? 0,
          mandatoryCount: summary?.mandatoryCount ?? 0,
          isComplete: summary?.isComplete ?? false,
          currentRank: summary?.classRank ?? null,
        };
      });
    } else if (rankingType === 'parallel') {
      // Siswa dalam tingkat paralel yang dipilih
      const levelClasses = classes.filter(c => c.gradeLevel === selectedGradeLevel);
      const levelClassIds = new Set(levelClasses.map(c => c.id));

      const levelStudents = students.filter(
        s => s.status === 'aktif' && (levelClassIds.has(s.currentClassId) || s.currentClassName.includes(selectedGradeLevel))
      );

      return levelStudents.map(st => {
        const summary = academicSummaries.find(
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
        };
      });
    } else {
      // rankingType === 'eligible' (Peringkat Siswa Eligible SNBP / Kuota PTN)
      let eligibleStudents = students.filter(s => s.status === 'aktif');
      if (eligibleGradeFilter !== 'all') {
        const filterClasses = classes.filter(c => c.gradeLevel === eligibleGradeFilter);
        const filterClassIds = new Set(filterClasses.map(c => c.id));
        eligibleStudents = eligibleStudents.filter(
          s => filterClassIds.has(s.currentClassId) || s.currentClassName.includes(eligibleGradeFilter)
        );
      }

      return eligibleStudents.map(st => {
        const summary = academicSummaries.find(
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
        };
      });
    }
  }, [
    rankingType,
    selectedClassId,
    selectedGradeLevel,
    eligibleGradeFilter,
    students,
    classes,
    academicSummaries,
    selectedSemesterId,
    currentClass,
  ]);

  // Synchronize input fields whenever active scope or underlying currentRank changes
  useEffect(() => {
    const initialMap: Record<string, string> = {};
    rankingItems.forEach(item => {
      initialMap[item.studentId] = item.currentRank !== null && item.currentRank !== undefined
        ? String(item.currentRank)
        : '';
    });
    setInputRanks(initialMap);
  }, [rankingType, selectedClassId, selectedGradeLevel, eligibleGradeFilter, selectedSemesterId]);

  // Handle single student rank input change
  const handleRankInputChange = (studentId: string, val: string) => {
    setInputRanks(prev => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Helper function to draft ranking numbers based on averageScore descending
  const handleAutoDraftFromAverage = () => {
    // Sort items by average score descending
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
    setSaveSuccessMsg('Draf nomor urut berdasarkan rata-rata telah diisi. Silakan cek dan klik "Simpan Peringkat Manual" untuk menetapkannya.');
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
    const label =
      rankingType === 'class'
        ? 'Peringkat Kelas'
        : rankingType === 'parallel'
        ? 'Peringkat Paralel'
        : 'Peringkat Eligible';
    setSaveSuccessMsg(`Berhasil! ${label} telah disimpan secara manual oleh Admin.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Sort rows for presentation: by assigned rank ascending, then by name
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

      // If no ranks, sort by average score descending or name
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return a.name.localeCompare(b.name, 'id');
    });
  }, [rankingItems, inputRanks]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const typeLabel =
      rankingType === 'class'
        ? `Peringkat_Kelas_${currentClass?.code || 'Kelas'}`
        : rankingType === 'parallel'
        ? `Peringkat_Paralel_Tingkat_${selectedGradeLevel}`
        : `Peringkat_Eligible_${eligibleGradeFilter}`;

    const dataToExport = sortedItemsForDisplay.map(item => {
      const rankVal = inputRanks[item.studentId] || '-';
      return {
        'Peringkat (Input Manual)': rankVal,
        'NIS': item.nis,
        'NISN': item.nisn,
        'Nama Peserta Didik': item.name,
        'Kelas': item.className,
        'Rata-Rata Nilai': formatIndonesianNumber(item.averageScore),
        'Total Nilai': formatIndonesianNumber(item.totalScore),
        'Status Nilai': item.isComplete ? 'Lengkap' : 'Menunggu Nilai',
      };
    });

    exportExcelWorkbook(`${typeLabel}_${activeSemester?.name || 'Semester'}`, [
      { sheetName: 'Peringkat', data: dataToExport },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Controls Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Manajemen Peringkat Peserta Didik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuai arahan: Peringkat Kelas, Peringkat Paralel, dan Peringkat Eligible diinput secara <strong>manual oleh Admin</strong> (tidak otomatis ditimpa sistem).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md shadow-amber-900/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* Mode & Filter Tabs (Screen Only) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Jenis Peringkat:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setRankingType('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rankingType === 'class'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Peringkat Kelas (Semester)
              </button>
              <button
                onClick={() => setRankingType('parallel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rankingType === 'parallel'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Peringkat Paralel (Tingkat)
              </button>
              <button
                onClick={() => setRankingType('eligible')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  rankingType === 'eligible'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>3. Peringkat Eligible (SNBP)</span>
              </button>
            </div>
          </div>

          {/* Contextual Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Semester selector for class / parallel / eligible */}
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
                      {c.name} ({c.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rankingType === 'parallel' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600">Pilih Tingkat:</span>
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
                <span className="font-semibold text-slate-600">Filter Jenjang:</span>
                <select
                  value={eligibleGradeFilter}
                  onChange={e => setEligibleGradeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="12">Tingkat 12 (Calon Peserta SNBP)</option>
                  <option value="11">Tingkat 11</option>
                  <option value="10">Tingkat 10</option>
                  <option value="all">Semua Siswa Terdaftar</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar for Manual Input */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Mode Input Manual: Masukkan nomor urut peringkat langsung pada kolom tabel di bawah
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
              <span>{isSyncing ? 'Menyimpan...' : 'Simpan Peringkat Manual'}</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Podium Top 3 (Screen only preview) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {sortedItemsForDisplay
          .filter(i => inputRanks[i.studentId] && Number(inputRanks[i.studentId]) <= 3)
          .slice(0, 3)
          .map((item, idx) => {
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
              : 'DAFTAR PERINGKAT HASIL BELAJAR PESERTA DIDIK'
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
                  {rankingType === 'eligible'
                    ? 'Peringkat Eligible'
                    : rankingType === 'parallel'
                    ? 'Peringkat Paralel'
                    : 'Peringkat Kelas'}
                </th>
                <th className="py-2.5 px-3 w-24 border-r border-slate-300">NIS</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">NISN</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Nama Lengkap Peserta Didik</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                <th className="py-2.5 px-3 text-right border-r border-slate-300">Total Nilai</th>
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
                sortedItemsForDisplay.map((item, idx) => {
                  const rankVal = inputRanks[item.studentId] || '';
                  const pred = getPredicateForScore(item.averageScore, schoolSettings.predicates);

                  return (
                    <tr key={item.studentId} className="hover:bg-slate-50 transition">
                      {/* Manual Rank Input Column (Interactive on screen, Static on Print) */}
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        {/* Screen View: Input box */}
                        <div className="no-print flex items-center justify-center">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={rankVal}
                            onChange={e => handleRankInputChange(item.studentId, e.target.value)}
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

                        {/* Print View: Clean printed rank */}
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
                          <span className="text-[10px] font-bold text-amber-600">Belum Lengkap</span>
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
            * Catatan: Nilai nomor urut pada kolom pertama adalah <strong>input manual Admin</strong>. Jangan lupa klik tombol <strong>"Simpan Peringkat Manual"</strong> setelah melakukan perubahan.
          </p>
          <button
            onClick={handleSaveManualRanks}
            disabled={isSyncing}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Peringkat Manual</span>
          </button>
        </div>

        {/* Official Signatures - Di menu cetak cukup tampilkan tanda tangan kepala sekolah di sebelah kanan bawah surat */}
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
    </div>
  );
};
