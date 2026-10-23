import React from 'react';
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Printer,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianNumber } from '../../lib/utils';
import { ActiveTab } from '../../components/layout/Sidebar';

interface HomeroomDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const HomeroomDashboard: React.FC<HomeroomDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const {
    classes,
    students,
    academicSummaries,
    teachingAssignments,
    gradeEntries,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_sri';

  // Find class where this user is homeroom teacher (or default to first class)
  const myClass = classes.find(c => c.homeroomTeacherId === currentTeacherId) || classes[0];

  const classStudents = students.filter(s => s.currentClassId === myClass?.id && s.status === 'aktif');

  const classSummaries = academicSummaries.filter(
    s => s.classId === myClass?.id && s.semesterId === selectedSemesterId
  );

  // Completed averages
  const completedSummaries = classSummaries.filter(s => s.isComplete);
  const classAverage = completedSummaries.length > 0
    ? Math.round(
        (completedSummaries.reduce((sum, s) => sum + s.averageScore, 0) / completedSummaries.length) * 100
      ) / 100
    : 0;

  // Highest and lowest score
  const highestScore = completedSummaries.length > 0
    ? Math.max(...completedSummaries.map(s => s.averageScore))
    : 0;
  const lowestScore = completedSummaries.length > 0
    ? Math.min(...completedSummaries.map(s => s.averageScore))
    : 0;

  // Students needing academic assistance (e.g. average below passing score or incomplete)
  const studentsNeedingGuidance = classSummaries.filter(
    s => s.averageScore < schoolSettings.passingScore || !s.isComplete
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-yellow-950 p-6 rounded-2xl text-white shadow-lg border border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 mb-2">
            Wali Kelas: {myClass?.name} ({myClass?.homeroomTeacherName})
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dashboard Wali Kelas & Guru BK
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Pantau rekap capaian nilai seluruh mata pelajaran siswa perwalian, peringkat kelas resmi, dan peserta didik yang memerlukan pendampingan belajar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin_school_recap')}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-amber-900/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Buku Leger Nilai Kelas</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Siswa Perwalian</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{classStudents.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{myClass?.name}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Rata-Rata Kelas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {classAverage > 0 ? formatIndonesianNumber(classAverage) : '-'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Seluruh Mata Pelajaran</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Nilai Tertinggi</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {highestScore > 0 ? formatIndonesianNumber(highestScore) : '-'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Peringkat 1 Kelas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Perlu Pendampingan</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{studentsNeedingGuidance.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Di bawah KKM / Belum Lengkap</div>
        </div>
      </div>

      {/* Grid: Top Ranked Students & Guidance Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Students */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Peringkat Teratas Kelas {myClass?.name}</span>
            </h2>
            <button
              onClick={() => onNavigate('admin_rankings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {completedSummaries
              .sort((a, b) => (a.classRank || 99) - (b.classRank || 99))
              .slice(0, 5)
              .map(s => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-xs">
                      {s.classRank}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{s.studentName}</div>
                      <div className="text-[11px] text-slate-500">NIS: {s.studentNis}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Rata-Rata:</span>
                    <strong className="text-sm font-extrabold text-blue-900">
                      {formatIndonesianNumber(s.averageScore)}
                    </strong>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Guidance Alert */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Pemantauan Akademik & Remedial</span>
            </h2>
            <button
              onClick={() => onNavigate('homeroom_monitoring')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              Detail Pendampingan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {studentsNeedingGuidance.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-slate-600">Seluruh peserta didik tuntas melampaui KKM.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {studentsNeedingGuidance.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{s.studentName}</div>
                    <div className="text-[11px] text-slate-500">
                      Capaian: <strong>{formatIndonesianNumber(s.averageScore)}</strong> (KKM: {schoolSettings.passingScore})
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                    {!s.isComplete ? 'Nilai Belum Lengkap' : 'Perlu Penguatan'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
