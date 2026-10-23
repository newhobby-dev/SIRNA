import React, { useState, useMemo } from 'react';
import { Award, Printer, Download, Filter, Trophy, Medal, Star } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  getPredicateForScore,
} from '../../lib/utils';

export const RankingsView: React.FC = () => {
  const {
    students,
    classes,
    academicSummaries,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
  } = useAcademic();

  const [rankingType, setRankingType] = useState<'class' | 'parallel'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('10');

  // Filter and sort ranking items
  const rankedItems = useMemo(() => {
    let summaries = academicSummaries.filter(s => s.semesterId === selectedSemesterId);

    if (rankingType === 'class') {
      summaries = summaries.filter(s => s.classId === selectedClassId);
      // Urutkan berdasarkan classRank jika lengkap, lalu nama
      return [...summaries].sort((a, b) => {
        if (a.classRank !== null && b.classRank !== null) {
          if (a.classRank !== b.classRank) return a.classRank - b.classRank;
        } else if (a.classRank !== null) return -1;
        else if (b.classRank !== null) return 1;

        return a.studentName.localeCompare(b.studentName, 'id');
      });
    } else {
      summaries = summaries.filter(s => s.gradeLevel === selectedGradeLevel);
      // Urutkan berdasarkan parallelRank
      return [...summaries].sort((a, b) => {
        if (a.parallelRank !== null && b.parallelRank !== null) {
          if (a.parallelRank !== b.parallelRank) return a.parallelRank - b.parallelRank;
        } else if (a.parallelRank !== null) return -1;
        else if (b.parallelRank !== null) return 1;

        return a.studentName.localeCompare(b.studentName, 'id');
      });
    }
  }, [academicSummaries, selectedSemesterId, rankingType, selectedClassId, selectedGradeLevel]);

  const currentClass = classes.find(c => c.id === selectedClassId);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const title = rankingType === 'class'
      ? `Peringkat_Kelas_${currentClass?.code}`
      : `Peringkat_Paralel_Tingkat_${selectedGradeLevel}`;

    const dataToExport = rankedItems.map((item, idx) => ({
      'Peringkat': rankingType === 'class' ? (item.classRank ?? 'Belum Lengkap') : (item.parallelRank ?? 'Belum Lengkap'),
      'NIS': item.studentNis,
      'NISN': item.studentNisn,
      'Nama Peserta Didik': item.studentName,
      'Kelas': item.className,
      'Rata-Rata Nilai': formatIndonesianNumber(item.averageScore),
      'Total Nilai': formatIndonesianNumber(item.totalScore),
      'Mapel Selesai': `${item.completedCount} dari ${item.mandatoryCount}`,
      'Status': item.isComplete ? 'Lengkap' : 'Menunggu Nilai',
    }));

    exportExcelWorkbook(`${title}_${currentSemester?.name}`, [
      { sheetName: 'Peringkat', data: dataToExport },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Controls header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Peringkat Akademik (Metode Kompetisi Standar)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Peringkat kelas dan paralel dihitung berdasarkan rata-rata semester resmi (metode 1, 1, 3, 4...)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md shadow-amber-900/20"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* Filter Options (Screen only) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Jenis Peringkat:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setRankingType('class')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                rankingType === 'class' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peringkat Kelas
            </button>
            <button
              onClick={() => setRankingType('parallel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                rankingType === 'parallel' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peringkat Paralel (Tingkat)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rankingType === 'class' ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-600">Pilih Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-600">Pilih Tingkat:</span>
              <select
                value={selectedGradeLevel}
                onChange={(e) => setSelectedGradeLevel(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="10">Tingkat 10 (Fase E)</option>
                <option value="11">Tingkat 11 (Fase F)</option>
                <option value="12">Tingkat 12 (Fase F)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Podium Top 3 (Screen only preview) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {rankedItems.filter(i => i.isComplete).slice(0, 3).map((item, idx) => {
          const rank = rankingType === 'class' ? item.classRank : item.parallelRank;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border text-center transition flex flex-col items-center justify-between shadow-xs ${
                idx === 0
                  ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                  : idx === 1
                  ? 'bg-slate-100/70 border-slate-300'
                  : 'bg-orange-50/70 border-orange-200'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shadow-sm mb-2 ${
                  idx === 0
                    ? 'bg-amber-400 text-slate-950 shadow-amber-300'
                    : idx === 1
                    ? 'bg-slate-300 text-slate-900'
                    : 'bg-orange-300 text-slate-950'
                }`}>
                  {rank}
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {idx === 0 ? 'Peringkat Pertama' : idx === 1 ? 'Peringkat Kedua' : 'Peringkat Ketiga'}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">{item.studentName}</h3>
                <p className="text-xs text-slate-500">{item.className} • NIS: {item.studentNis}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 w-full flex items-center justify-around text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Rata-Rata</span>
                  <strong className="text-base font-extrabold text-slate-900">{formatIndonesianNumber(item.averageScore)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Nilai</span>
                  <strong className="text-slate-700 font-mono">{formatIndonesianNumber(item.totalScore)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Printable Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
        <PrintHeader
          documentTitle={`DAFTAR PERINGKAT HASIL BELAJAR PESERTA DIDIK`}
          subTitle={`${rankingType === 'class' ? `Kelas: ${currentClass?.name}` : `Paralel Tingkat: ${selectedGradeLevel}`} | ${currentSemester?.name || ''}`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 print-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 text-center w-14 border-r border-slate-300">Peringkat</th>
                <th className="py-2.5 px-3 w-24 border-r border-slate-300">NIS</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">NISN</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Nama Lengkap Peserta Didik</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                <th className="py-2.5 px-3 text-right border-r border-slate-300">Total Nilai</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/70 border-r border-slate-300">Rata-Rata</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-300">Predikat</th>
                <th className="py-2.5 px-3 text-center">Status Kelengkapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rankedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada data rekapitulasi nilai untuk periode ini.
                  </td>
                </tr>
              ) : (
                rankedItems.map((item) => {
                  const rank = rankingType === 'class' ? item.classRank : item.parallelRank;
                  const pred = getPredicateForScore(item.averageScore, schoolSettings.predicates);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {rank ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            rank <= 3 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'font-mono text-slate-800'
                          }`}>
                            {rank}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">{item.studentNis}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">{item.studentNisn}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{item.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{item.className}</td>
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

        {/* Official Signatures */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div className="text-center">
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-semibold text-slate-900">Kepala {schoolSettings.schoolName}</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">{schoolSettings.principalName}</span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. {schoolSettings.principalNip}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-500">
              {schoolSettings.city}, {formatIndonesianDate(new Date())}
            </p>
            <p className="font-semibold text-slate-900">
              {rankingType === 'class' ? `Wali Kelas ${currentClass?.name}` : 'Wakil Kepala Sekolah Bidang Kurikulum'}
            </p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">
                {rankingType === 'class' ? (currentClass?.homeroomTeacherName || '...........................................') : 'Aris Wicaksono, S.Pd.'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. 19850415 201001 1 018</p>
          </div>
        </div>
      </div>
    </div>
  );
};
