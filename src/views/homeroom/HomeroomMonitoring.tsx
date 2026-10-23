import React from 'react';
import { UserMinus, Printer, Download, AlertCircle, CheckCircle2, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import { formatIndonesianNumber, formatIndonesianDate, exportExcelWorkbook } from '../../lib/utils';

export const HomeroomMonitoring: React.FC = () => {
  const { profile } = useAuth();
  const {
    classes,
    students,
    academicSummaries,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
    gradeEntries,
    subjects,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_sri';
  const myClass = classes.find(c => c.homeroomTeacherId === currentTeacherId) || classes[0];

  const classSummaries = academicSummaries.filter(
    s => s.classId === myClass?.id && s.semesterId === selectedSemesterId
  );

  // Filter students needing guidance
  const guidanceList = classSummaries.filter(
    s => s.averageScore < schoolSettings.passingScore || !s.isComplete
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const dataToExport = guidanceList.map((item, idx) => ({
      'No.': idx + 1,
      'NIS': item.studentNis,
      'NISN': item.studentNisn,
      'Nama Peserta Didik': item.studentName,
      'Rata-Rata Saat Ini': formatIndonesianNumber(item.averageScore),
      'Batas KKM': schoolSettings.passingScore,
      'Kelengkapan Mapel': `${item.completedCount} dari ${item.mandatoryCount}`,
      'Status': !item.isComplete ? 'Nilai Belum Lengkap' : 'Perlu Pendampingan Tambahan',
    }));

    exportExcelWorkbook(`Daftar_Pendampingan_Akademik_${myClass?.code}`, [
      { sheetName: 'Pendampingan', data: dataToExport },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-600" />
            <span>Pemantauan Akademik & Program Pendampingan Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar peserta didik yang memerlukan pendampingan belajar, remedial, atau konsultasi akademik (Kelas {myClass?.name})
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar Pemantauan</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
        <PrintHeader
          documentTitle="LEMBAR PEMANTAUAN AKADEMIK & PROGRAM PENDAMPINGAN SISWA"
          subTitle={`Kelas: ${myClass?.name} | Wali Kelas: ${myClass?.homeroomTeacherName} | ${currentSemester?.name || ''}`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 print-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No.</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">NIS</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-300">NISN</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Nama Peserta Didik</th>
                <th className="py-2.5 px-3 text-right border-r border-slate-300">Rata-Rata</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-300">KKM Sekolah</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Analisis Kebutuhan</th>
                <th className="py-2.5 px-4">Rekomendasi Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {guidanceList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada siswa yang memerlukan pendampingan khusus. Seluruh nilai tuntas!
                  </td>
                </tr>
              ) : (
                guidanceList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-200">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">{item.studentNis}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">{item.studentNisn}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{item.studentName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                      {formatIndonesianNumber(item.averageScore)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 border-r border-slate-200">
                      {schoolSettings.passingScore}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 border-r border-slate-200">
                      {!item.isComplete
                        ? 'Masih ada mata pelajaran wajib yang belum selesai diunggah'
                        : 'Capaian nilai di bawah kriteria ketuntasan minimal'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 italic">
                      {!item.isComplete
                        ? 'Koordinasi dengan guru mapel terkait kelengkapan nilai'
                        : 'Bimbingan belajar tambahan dan asesmen remedial mandiri'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div className="text-center">
            <p className="text-slate-500">Guru Bimbingan Konseling (BK)</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">...........................................</span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. ...........................................</p>
          </div>

          <div className="text-center">
            <p className="text-slate-500">
              {schoolSettings.city}, {formatIndonesianDate(new Date())}
            </p>
            <p className="font-semibold text-slate-900">Wali Kelas {myClass?.name}</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">
                {myClass?.homeroomTeacherName || '...........................................'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. ...........................................</p>
          </div>
        </div>
      </div>
    </div>
  );
};
