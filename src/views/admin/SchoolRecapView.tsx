import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  sortStudentsAlphabetically,
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  getPredicateForScore,
} from '../../lib/utils';

export const SchoolRecapView: React.FC = () => {
  const {
    students,
    classes,
    subjects,
    gradeEntries,
    academicSummaries,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
  } = useAcademic();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const currentClass = classes.find(c => c.id === selectedClassId);

  // Active students in the chosen class, sorted alphabetically
  const classStudents = useMemo(() => {
    const list = students.filter(s => s.currentClassId === selectedClassId && s.status === 'aktif');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return sortStudentsAlphabetically(
        list.filter(s => s.name.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q))
      );
    }
    return sortStudentsAlphabetically(list);
  }, [students, selectedClassId, searchQuery]);

  // Mandatory and active subjects
  const activeSubjects = subjects.filter(s => s.isActive);

  // Grades map for this class & semester
  const gradesMap = useMemo(() => {
    const map = new Map<string, number>();
    gradeEntries
      .filter(g => g.classId === selectedClassId && g.semesterId === selectedSemesterId)
      .forEach(g => {
        map.set(`${g.studentId}_${g.subjectId}`, g.finalScore);
      });
    return map;
  }, [gradeEntries, selectedClassId, selectedSemesterId]);

  // Summaries map for this class & semester
  const summaryMap = useMemo(() => {
    const map = new Map<string, any>();
    academicSummaries
      .filter(s => s.classId === selectedClassId && s.semesterId === selectedSemesterId)
      .forEach(s => {
        map.set(s.studentId, s);
      });
    return map;
  }, [academicSummaries, selectedClassId, selectedSemesterId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!currentClass) return;

    const rows = classStudents.map((st, idx) => {
      const sum = summaryMap.get(st.id);
      const row: Record<string, any> = {
        'No.': idx + 1,
        'NIS': st.nis,
        'NISN': st.nisn,
        'Nama Peserta Didik': st.name,
      };

      activeSubjects.forEach(sub => {
        const score = gradesMap.get(`${st.id}_${sub.id}`);
        row[sub.code] = score !== undefined ? score : '-';
      });

      row['Rata-Rata'] = sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-';
      row['Status'] = sum?.isComplete ? 'Lengkap' : 'Belum Lengkap';
      row['Peringkat Kelas'] = sum?.classRank ?? '-';
      row['Peringkat Paralel'] = sum?.parallelRank ?? '-';

      return row;
    });

    exportExcelWorkbook(`Rekap_Akademik_${currentClass.code}_${currentSemester?.name}`, [
      { sheetName: currentClass.code, data: rows },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Rekap Nilai Akademik Seluruh Kelas (Leger Lengkap)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar nilai akhir setiap mata pelajaran, kalkulasi rata-rata semester otomatis, dan peringkat kelas
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Resmi</span>
          </button>
        </div>
      </div>

      {/* Class Selector & Search (Hidden during print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Pilih Kelas:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.major})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa dalam kelas..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Document / Table Container (Formatted for both screen & official print) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
        {/* Official Letterhead Header for print */}
        <PrintHeader
          documentTitle={`BUKU REKAPITULASI NILAI AKADEMIK PESERTA DIDIK`}
          subTitle={`Kelas: ${currentClass?.name || ''} | Tahun Pelajaran: ${schoolSettings.schoolName} | ${currentSemester?.name || ''}`}
        />

        {/* Identity block for print & screen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4 pb-3 border-b border-slate-200">
          <div>
            <span className="text-slate-500 block text-[11px]">Rombongan Belajar:</span>
            <strong className="text-slate-900">{currentClass?.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Tingkat / Jurusan:</span>
            <strong className="text-slate-900">Kelas {currentClass?.gradeLevel} • {currentClass?.major}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Wali Kelas:</span>
            <strong className="text-slate-900">{currentClass?.homeroomTeacherName || '-'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Jumlah Siswa:</span>
            <strong className="text-slate-900">{classStudents.length} Peserta Didik</strong>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 print-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">No.</th>
                <th className="py-2.5 px-2 w-20 border-r border-slate-300">NIS</th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-300">Nama Siswa (A-Z)</th>
                {activeSubjects.map(sub => (
                  <th key={sub.id} className="py-2.5 px-2 text-center border-r border-slate-300" title={sub.name}>
                    {sub.code}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center bg-blue-50/70 border-r border-slate-300">Rata-Rata</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Status</th>
                <th className="py-2.5 px-2 text-center bg-amber-50/70">Peringkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {classStudents.map((st, idx) => {
                const sum = summaryMap.get(st.id);
                return (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 font-mono text-slate-700 border-r border-slate-200">
                      {st.nis}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 truncate max-w-[180px]">
                      {st.name}
                    </td>
                    {activeSubjects.map(sub => {
                      const score = gradesMap.get(`${st.id}_${sub.id}`);
                      return (
                        <td
                          key={sub.id}
                          className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200"
                        >
                          {score !== undefined ? formatIndonesianNumber(score) : (
                            <span className="text-slate-300 italic">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-mono font-extrabold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                      {sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-'}
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200">
                      {sum?.isComplete ? (
                        <span className="text-[10px] font-bold text-emerald-700">Lengkap</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600">Belum Lengkap</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/30">
                      {sum?.classRank ? (
                        <span className="inline-flex items-center gap-1 justify-center">
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>{sum.classRank}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Section (Visible in Print & Screen) */}
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
            <p className="font-semibold text-slate-900">Wali Kelas {currentClass?.name}</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">
                {currentClass?.homeroomTeacherName || '...........................................'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. ...........................................</p>
          </div>
        </div>
      </div>
    </div>
  );
};
