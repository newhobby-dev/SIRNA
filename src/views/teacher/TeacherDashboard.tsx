import React from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Printer,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianDate } from '../../lib/utils';
import { ActiveTab } from '../../components/layout/Sidebar';

interface TeacherDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const {
    teachingAssignments,
    gradeEntries,
    students,
    selectedSemesterId,
    currentSemester,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_aris';

  // Filter assignments for this teacher
  const myAssignments = teachingAssignments.filter(
    a => a.teacherId === currentTeacherId && a.isActive
  );

  // Status per assignment
  const assignmentsOverview = myAssignments.map(a => {
    const classStudents = students.filter(s => s.currentClassId === a.classId && s.status === 'aktif');
    const grades = gradeEntries.filter(
      g => g.classId === a.classId && g.subjectId === a.subjectId && g.semesterId === selectedSemesterId
    );

    const filledCount = grades.filter(g => g.finalScore !== null && g.finalScore !== undefined).length;
    const isSubmitted = grades.length > 0 && grades[0].status === 'submitted';
    const isFinal = grades.length > 0 && (grades[0].status === 'final' || grades[0].status === 'published');
    const isRevision = grades.length > 0 && grades[0].status === 'revision_requested';
    const isDraft = grades.length > 0 && grades[0].status === 'draft';

    return {
      assignment: a,
      classStudents,
      grades,
      filledCount,
      totalStudents: classStudents.length,
      status: isFinal ? 'final' : isSubmitted ? 'submitted' : isRevision ? 'revision' : isDraft ? 'draft' : 'unfilled',
      revisionNote: grades[0]?.revisionNote || '',
    };
  });

  const revisionItems = assignmentsOverview.filter(a => a.status === 'revision');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-6 rounded-2xl text-white shadow-lg border border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
            Guru Mata Pelajaran: {profile?.name}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Portal Input Nilai Akhir Mandiri
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Prinsip: Anda memasukkan nilai akhir yang sudah diolah dan ditetapkan secara mandiri. Aplikasi menghitung rata-rata & peringkat secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('teacher_input_manual')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Input Nilai Manual</span>
          </button>
          <button
            onClick={() => onNavigate('teacher_input_excel')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Unggah Excel</span>
          </button>
        </div>
      </div>

      {/* Revision Alerts */}
      {revisionItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Perhatian: Ada Pengajuan Nilai yang Memerlukan Revisi</span>
          </div>
          <div className="space-y-2">
            {revisionItems.map(item => (
              <div
                key={item.assignment.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <strong className="text-slate-900">{item.assignment.className} - {item.assignment.subjectName}</strong>
                  <p className="text-rose-700 mt-1 italic">
                    Catatan Verifikator: "{item.revisionNote || 'Mohon periksa kembali kelengkapan nilai'}"
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('teacher_input_manual')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shrink-0"
                >
                  Perbaiki Nilai Sekarang
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary of My Classes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Kelas & Mata Pelajaran yang Diampu ({myAssignments.length} Rombel)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Batas Akhir Pengumpulan: <strong>{formatIndonesianDate(currentSemester?.gradeSubmissionDeadline)}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignmentsOverview.map(item => {
            const pct = item.totalStudents > 0 ? Math.round((item.filledCount / item.totalStudents) * 100) : 0;
            return (
              <div
                key={item.assignment.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition flex flex-col justify-between bg-slate-50/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-900">
                      {item.assignment.className}
                    </span>

                    {item.status === 'final' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✓ Disahkan (Final)
                      </span>
                    ) : item.status === 'submitted' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Menunggu Verifikasi
                      </span>
                    ) : item.status === 'revision' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Perlu Revisi
                      </span>
                    ) : item.status === 'draft' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Draft Belum Diajukan
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                        Belum Diisi
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{item.assignment.subjectName}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>Kelengkapan Siswa:</span>
                    <strong className="text-slate-800">{item.filledCount} dari {item.totalStudents} siswa ({pct}%)</strong>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onNavigate('teacher_input_manual')}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition text-center shadow-xs"
                  >
                    Input Nilai
                  </button>
                  <button
                    onClick={() => onNavigate('teacher_input_excel')}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                    title="Unggah Berkas Excel"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigate('teacher_recap')}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                    title="Cetak Rekap Nilai"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
