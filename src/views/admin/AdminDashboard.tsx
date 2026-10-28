import React from 'react';
import {
  Users,
  School,
  UserCheck,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Share2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianNumber } from '../../lib/utils';
import { ActiveTab } from '../../components/layout/Sidebar';
import { GradeStatus } from '../../types';

interface AdminDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const {
    students,
    classes,
    teachers,
    subjects,
    teachingAssignments,
    gradeEntries,
    semesters,
    selectedSemesterId,
    currentSemester,
  } = useAcademic();

  // Statistics calculations for currently selected semester
  const activeStudents = students.filter(s => s.status === 'aktif');
  const activeClasses = classes.filter(c => c.isActive);
  const activeTeachers = teachers.filter(t => t.isActive);
  const activeSubjects = subjects.filter(s => s.isActive);

  const currentSemesterGrades = gradeEntries.filter(g => g.semesterId === selectedSemesterId);

  const pendingVerificationGrades = currentSemesterGrades.filter(g => g.status === 'submitted');
  const finalGrades = currentSemesterGrades.filter(g => g.status === 'final');
  const publishedGrades = currentSemesterGrades.filter(g => g.status === 'published');

  // Completeness rate: Total active assignments for this semester vs completed
  const semesterAssignments = teachingAssignments.filter(
    a => a.isActive && (a.semesterId === selectedSemesterId || !a.semesterId)
  );

  let completedAssignmentsCount = 0;
  const assignmentStatusList = semesterAssignments.map(assignment => {
    const classStudentCount = activeStudents.filter(s => s.currentClassId === assignment.classId).length;
    const grades = currentSemesterGrades.filter(
      g => g.classId === assignment.classId && g.subjectId === assignment.subjectId
    );
    const hasGrades = grades.length > 0;
    const isFull = hasGrades && grades.length >= classStudentCount;
    if (isFull && grades[0]?.status !== 'draft') {
      completedAssignmentsCount++;
    }
    return {
      assignment,
      gradesCount: grades.length,
      studentCount: classStudentCount,
      status: (grades[0]?.status || 'unfilled') as GradeStatus | 'unfilled',
    };
  });

  const completenessPercentage = semesterAssignments.length > 0
    ? Math.round((completedAssignmentsCount / semesterAssignments.length) * 100)
    : 0;

  // Pending verification assignments
  const pendingAssignments = assignmentStatusList.filter(a => a.status === 'submitted');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
            Periode Berjalan: {currentSemester?.name || 'Semester Aktif'}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dashboard Administrator Sekolah
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Pantau rekapitulasi nilai akhir guru, validasi pengajuan nilai, hitung rata-rata & peringkat otomatis, dan publikasi ke portal siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin_upload_export_grades')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-purple-900/40 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unggah & Ekspor Semua Mapel</span>
          </button>

          {pendingAssignments.length > 0 && (
            <button
              onClick={() => onNavigate('admin_verification')}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-amber-900/30 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Verifikasi ({pendingAssignments.length}) Nilai</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('admin_publish')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-blue-900/40 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Publikasi Nilai Siswa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Siswa Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeStudents.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Seluruh Rombel</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Rombel / Kelas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeClasses.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tingkat 10, 11, 12</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Guru Pendidik</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeTeachers.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Aktif Mengajar</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Mata Pelajaran</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeSubjects.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Wajib & Peminatan</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Kelengkapan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{completenessPercentage}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{completedAssignmentsCount} dari {semesterAssignments.length} mapel</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Entri Nilai</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{currentSemesterGrades.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{publishedGrades.length} telah dipublikasi</div>
        </div>
      </div>

      {/* Grid: Pending Verifications & Completeness Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Pengajuan Nilai Menunggu Verifikasi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai akhir yang telah dikirimkan guru mata pelajaran untuk disahkan
              </p>
            </div>
            <button
              onClick={() => onNavigate('admin_verification')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingAssignments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-slate-600">Tidak ada pengajuan nilai yang tertunda.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua nilai yang dikirim sudah diverifikasi atau belum diajukan.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingAssignments.slice(0, 5).map(({ assignment, gradesCount, studentCount }) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200/70"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900">
                      {assignment.className} - {assignment.subjectName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Guru: {assignment.teacherName} • {gradesCount} dari {studentCount} siswa
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('admin_verification')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition"
                  >
                    Periksa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completeness by Class */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Progress Penginputan per Kelas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelengkapan nilai mata pelajaran pada masing-masing rombongan belajar
              </p>
            </div>
            <button
              onClick={() => onNavigate('admin_completeness')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Detail Matriks <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeClasses.map((cls) => {
              const classAssignments = semesterAssignments.filter(a => a.classId === cls.id);
              const classCompleted = assignmentStatusList.filter(
                a => a.assignment.classId === cls.id && a.status !== 'unfilled' && a.status !== 'draft'
              ).length;
              const pct = classAssignments.length > 0 ? Math.round((classCompleted / classAssignments.length) * 100) : 0;

              return (
                <div key={cls.id} className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800">{cls.name}</span>
                    <span className="font-semibold text-slate-600">
                      {classCompleted}/{classAssignments.length} Mapel ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
