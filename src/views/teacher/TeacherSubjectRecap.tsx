import React, { useState, useMemo } from 'react';
import { FileText, Printer, Download, Filter, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  sortStudentsAlphabetically,
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  getPredicateForScore,
} from '../../lib/utils';

export const TeacherSubjectRecap: React.FC = () => {
  const { profile } = useAuth();
  const {
    teachingAssignments,
    students,
    gradeEntries,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_aris';
  const myAssignments = teachingAssignments.filter(
    a => a.teacherId === currentTeacherId && a.isActive
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    myAssignments[0]?.id || ''
  );

  const selectedAssignment = myAssignments.find(a => a.id === selectedAssignmentId);

  // Class students sorted alphabetically
  const classStudents = useMemo(() => {
    if (!selectedAssignment) return [];
    const list = students.filter(
      s => s.currentClassId === selectedAssignment.classId && s.status === 'aktif'
    );
    return sortStudentsAlphabetically(list);
  }, [students, selectedAssignment]);

  // Grades map
  const gradesMap = useMemo(() => {
    if (!selectedAssignment) return new Map<string, number>();
    const map = new Map<string, number>();
    gradeEntries
      .filter(
        g =>
          g.classId === selectedAssignment.classId &&
          g.subjectId === selectedAssignment.subjectId &&
          g.semesterId === selectedSemesterId
      )
      .forEach(g => {
        map.set(g.studentId, g.finalScore);
      });
    return map;
  }, [selectedAssignment, selectedSemesterId, gradeEntries]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!selectedAssignment) return;

    const dataToExport = classStudents.map((st, idx) => {
      const score = gradesMap.get(st.id);
      const pred = getPredicateForScore(score, schoolSettings.predicates);

      return {
        'No.': idx + 1,
        'NIS': st.nis,
        'NISN': st.nisn,
        'Nama Peserta Didik': st.name,
        'Nilai Akhir': score !== undefined ? formatIndonesianNumber(score) : '-',
        'Predikat': pred.predicate,
        'Keterangan': pred.description,
      };
    });

    exportExcelWorkbook(
      `Rekap_Nilai_${selectedAssignment.subjectName}_${selectedAssignment.className}`,
      [{ sheetName: 'Nilai Akhir', data: dataToExport }]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            <span>Rekapitulasi Nilai Akhir Mata Pelajaran</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar resmi nilai akhir mata pelajaran yang Anda ampu, siap dicetak atau diekspor ke Excel
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* Assignment selector (Screen only) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs no-print">
        <span className="font-semibold text-slate-600">Pilih Kelas & Mapel:</span>
        <select
          value={selectedAssignmentId}
          onChange={(e) => setSelectedAssignmentId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
        >
          {myAssignments.map(a => (
            <option key={a.id} value={a.id}>
              {a.className} - {a.subjectName}
            </option>
          ))}
        </select>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
        <PrintHeader
          documentTitle={`DAFTAR NILAI AKHIR MATA PELAJARAN`}
          subTitle={`Mata Pelajaran: ${selectedAssignment?.subjectName} | Kelas: ${selectedAssignment?.className} | ${currentSemester?.name || ''}`}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4 pb-3 border-b border-slate-200">
          <div>
            <span className="text-slate-500 block text-[11px]">Mata Pelajaran:</span>
            <strong className="text-slate-900">{selectedAssignment?.subjectName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Kelas:</span>
            <strong className="text-slate-900">{selectedAssignment?.className}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Guru Pengampu:</span>
            <strong className="text-slate-900">{selectedAssignment?.teacherName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">KKM / Batas Tuntas:</span>
            <strong className="text-slate-900">{schoolSettings.passingScore}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 print-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No.</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">NIS</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-300">NISN</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Nama Lengkap Peserta Didik</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">Nilai Akhir</th>
                <th className="py-2.5 px-3 w-20 text-center border-r border-slate-300">Predikat</th>
                <th className="py-2.5 px-4">Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {classStudents.map((st, idx) => {
                const score = gradesMap.get(st.id);
                const pred = getPredicateForScore(score, schoolSettings.predicates);

                return (
                  <tr key={st.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">{st.nis}</td>
                    <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">{st.nisn}</td>
                    <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">{st.name}</td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                      {score !== undefined ? formatIndonesianNumber(score) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">
                      {pred.predicate}
                    </td>
                    <td className="py-2 px-4 text-slate-700">{pred.description}</td>
                  </tr>
                );
              })}
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
            <p className="font-semibold text-slate-900">Guru Mata Pelajaran</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">{selectedAssignment?.teacherName}</span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. 19850415 201001 1 018</p>
          </div>
        </div>
      </div>
    </div>
  );
};
