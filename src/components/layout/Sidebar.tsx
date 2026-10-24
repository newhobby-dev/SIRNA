import React from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  UserCheck,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  Share2,
  Award,
  BarChart3,
  ClipboardList,
  ShieldAlert,
  Settings,
  Database,
  Upload,
  UserMinus,
  Sparkles,
  FileText,
  HelpCircle,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab =
  | 'admin_dashboard'
  | 'admin_students'
  | 'admin_classes'
  | 'admin_subjects'
  | 'admin_teachers'
  | 'admin_assignments'
  | 'admin_periods'
  | 'admin_verification'
  | 'admin_publish'
  | 'admin_school_recap'
  | 'admin_rankings'
  | 'admin_analytics'
  | 'admin_completeness'
  | 'admin_audit'
  | 'admin_settings'
  | 'admin_cloud'
  | 'admin_backup'
  | 'admin_users'
  // Guru
  | 'teacher_dashboard'
  | 'teacher_input_manual'
  | 'teacher_input_excel'
  | 'teacher_recap'
  | 'teacher_completeness'
  // Wali Kelas
  | 'homeroom_dashboard'
  | 'homeroom_leger'
  | 'homeroom_rankings'
  | 'homeroom_monitoring'
  // Siswa
  | 'student_portal'
  | 'student_history';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { role } = useAuth();

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const navItemClass = (tab: ActiveTab) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
      activeTab === tab
        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-900/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs no-print"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Admin Navigation */}
          {role === 'admin' && (
            <>
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Ringkasan & Analisis
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('admin_dashboard')} className={navItemClass('admin_dashboard')}>
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                    <span>Dashboard Utama</span>
                  </button>
                  <button onClick={() => handleSelect('admin_analytics')} className={navItemClass('admin_analytics')}>
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>Analitik Akademik</span>
                  </button>
                  <button onClick={() => handleSelect('admin_completeness')} className={navItemClass('admin_completeness')}>
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                    <span>Kelengkapan Nilai</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Data Master
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('admin_students')} className={navItemClass('admin_students')}>
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Data Peserta Didik</span>
                  </button>
                  <button onClick={() => handleSelect('admin_classes')} className={navItemClass('admin_classes')}>
                    <School className="w-4 h-4 text-purple-400" />
                    <span>Data Kelas / Rombel</span>
                  </button>
                  <button onClick={() => handleSelect('admin_subjects')} className={navItemClass('admin_subjects')}>
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Data Mata Pelajaran</span>
                  </button>
                  <button onClick={() => handleSelect('admin_teachers')} className={navItemClass('admin_teachers')}>
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    <span>Data Guru</span>
                  </button>
                  <button onClick={() => handleSelect('admin_assignments')} className={navItemClass('admin_assignments')}>
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <span>Penugasan Mengajar</span>
                  </button>
                  <button onClick={() => handleSelect('admin_periods')} className={navItemClass('admin_periods')}>
                    <CalendarDays className="w-4 h-4 text-rose-400" />
                    <span>Tahun & Semester</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Verifikasi & Publikasi
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('admin_verification')} className={navItemClass('admin_verification')}>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>Verifikasi & Finalisasi</span>
                  </button>
                  <button onClick={() => handleSelect('admin_publish')} className={navItemClass('admin_publish')}>
                    <Share2 className="w-4 h-4 text-pink-400" />
                    <span>Publikasi Nilai Siswa</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rekap & Peringkat
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('admin_school_recap')} className={navItemClass('admin_school_recap')}>
                    <FileText className="w-4 h-4 text-yellow-400" />
                    <span>Rekap Seluruh Kelas</span>
                  </button>
                  <button onClick={() => handleSelect('admin_rankings')} className={navItemClass('admin_rankings')}>
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>Peringkat Kelas & Paralel</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Sistem & Keamanan
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('admin_users')} className={navItemClass('admin_users')}>
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Manajemen Akun</span>
                  </button>
                  <button onClick={() => handleSelect('admin_settings')} className={navItemClass('admin_settings')}>
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Pengaturan Sekolah & Kop</span>
                  </button>
                  <button onClick={() => handleSelect('admin_cloud')} className={navItemClass('admin_cloud')}>
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>Koneksi Cloud</span>
                  </button>
                  <button onClick={() => handleSelect('admin_backup')} className={navItemClass('admin_backup')}>
                    <Database className="w-4 h-4 text-blue-300" />
                    <span>Backup & Restore</span>
                  </button>
                  <button onClick={() => handleSelect('admin_audit')} className={navItemClass('admin_audit')}>
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span>Audit Aktivitas</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Guru BK (Bimbingan Konseling) Navigation - Directive 2 */}
          {role === 'bk' && (
            <>
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Layanan BK & Konseling
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('homeroom_dashboard')} className={navItemClass('homeroom_dashboard')}>
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    <span>Dashboard Konseling</span>
                  </button>
                  <button onClick={() => handleSelect('homeroom_monitoring')} className={navItemClass('homeroom_monitoring')}>
                    <UserMinus className="w-4 h-4 text-rose-400" />
                    <span>Pendampingan Siswa</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rekap & Pemantauan Akademik
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('homeroom_leger')} className={navItemClass('homeroom_leger')}>
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span>Buku Leger Nilai</span>
                  </button>
                  <button onClick={() => handleSelect('admin_rankings')} className={navItemClass('admin_rankings')}>
                    <Award className="w-4 h-4 text-yellow-300" />
                    <span>Peringkat Nilai Siswa</span>
                  </button>
                  <button onClick={() => handleSelect('admin_analytics')} className={navItemClass('admin_analytics')}>
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>Analisis & Perkembangan</span>
                  </button>
                  <button onClick={() => handleSelect('admin_completeness')} className={navItemClass('admin_completeness')}>
                    <ClipboardList className="w-4 h-4 text-teal-400" />
                    <span>Status Kelengkapan Nilai</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Guru Mata Pelajaran Navigation */}
          {role === 'teacher' && (
            <>
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Menu Utama Guru
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('teacher_dashboard')} className={navItemClass('teacher_dashboard')}>
                    <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                    <span>Dashboard Guru</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Penginputan Nilai
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('teacher_input_manual')} className={navItemClass('teacher_input_manual')}>
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span>Input Nilai Manual</span>
                  </button>
                  <button onClick={() => handleSelect('teacher_input_excel')} className={navItemClass('teacher_input_excel')}>
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Unggah Excel (.xlsx)</span>
                  </button>
                  <button onClick={() => handleSelect('teacher_completeness')} className={navItemClass('teacher_completeness')}>
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                    <span>Status Kelengkapan</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Laporan & Rekap
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('teacher_recap')} className={navItemClass('teacher_recap')}>
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Rekap & Cetak Nilai</span>
                  </button>
                </div>
              </div>
            </>
          )}


          {/* Siswa Navigation */}
          {role === 'student' && (
            <>
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Portal Siswa
                </p>
                <div className="space-y-1">
                  <button onClick={() => handleSelect('student_portal')} className={navItemClass('student_portal')}>
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                    <span>Nilai Semester Ini</span>
                  </button>
                  <button onClick={() => handleSelect('student_history')} className={navItemClass('student_history')}>
                    <CalendarDays className="w-4 h-4 text-indigo-400" />
                    <span>Riwayat Nilai Lampau</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>SIRNA Versi 2.0</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Prinsip: Nilai Akhir murni diunggah guru mandiri. Rata-rata & peringkat dihitung otomatis.
          </p>
        </div>
      </aside>
    </>
  );
};
