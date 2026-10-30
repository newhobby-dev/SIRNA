import React, { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  Cloud,
  RefreshCw,
  AlertCircle,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Menu,
  Shield,
  BookOpen,
  Users,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onNavigate?: (tab: any) => void;
  onExitStudentPortal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen, onNavigate, onExitStudentPortal }) => {
  const { currentUser, profile, role, signOut, switchDemoRole } = useAuth();
  const {
    schoolSettings,
    academicYears,
    selectedYearId,
    setSelectedYearId,
    semesters,
    selectedSemesterId,
    setSelectedSemesterId,
    isSyncing,
    lastSyncTime,
    networkOnline,
    syncToCloudNow,
  } = useAcademic();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    try {
      const res = await syncToCloudNow();
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e: any) {
      setSyncFeedback('Gagal: ' + (e.message || 'Koneksi error'));
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Available semesters for the chosen academic year (strictly 1 Ganjil & 1 Genap, sorted Ganjil -> Genap)
  const filteredSemesters = React.useMemo(() => {
    const yearSems = semesters.filter(s => s.academicYearId === selectedYearId);
    const byType = new Map<string, (typeof semesters)[0]>();
    yearSems.forEach(s => {
      const key = s.semesterType || s.id;
      const existing = byType.get(key);
      // Prefer the currently selected semester if duplicate exists
      if (!existing || s.id === selectedSemesterId) {
        byType.set(key, s);
      }
    });
    return Array.from(byType.values()).sort((a, b) =>
      String(a.semesterType).localeCompare(String(b.semesterType))
    );
  }, [semesters, selectedYearId, selectedSemesterId]);

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Administrator Sekolah';
      case 'bk':
        return 'Guru BK (Konseling)';
      case 'teacher':
        return 'Guru Mata Pelajaran';
      case 'student':
        return 'Peserta Didik (Portal)';
    }
  };

  const getShortRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Admin';
      case 'bk':
        return 'Guru BK';
      case 'teacher':
        return 'Guru';
      case 'student':
        return 'Siswa';
    }
  };

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'bk':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'teacher':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'student':
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 no-print w-full">
      <div className="px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            title="Buka/Tutup Menu"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/40 shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">SIRNA</span>
                <span className="hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/80">
                  {schoolSettings.level || 'SMA'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[100px] xs:max-w-[150px] sm:max-w-xs">
                {schoolSettings.schoolName}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Academic Period Selectors (Hidden on Student Portal) */}
        {role !== 'student' && (
          <div className="hidden lg:flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800 text-xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Periode:</span>
            <select
              value={selectedYearId}
              onChange={(e) => {
                const newYearId = e.target.value;
                setSelectedYearId(newYearId);
                const matching = semesters
                  .filter(s => s.academicYearId === newYearId)
                  .sort((a, b) => String(a.semesterType).localeCompare(String(b.semesterType)))[0];
                if (matching) setSelectedSemesterId(matching.id);
              }}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {academicYears.map((ay) => {
                const isCurrentOpenYear = ay.id === selectedYearId;
                return (
                  <option key={ay.id} value={ay.id} className="bg-slate-900 text-white">
                    TP {ay.name} {isCurrentOpenYear ? '(Aktif)' : ''}
                  </option>
                );
              })}
            </select>

            <span className="text-slate-600">|</span>

            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="bg-transparent text-blue-300 font-semibold focus:outline-none cursor-pointer"
            >
              {filteredSemesters.map((s) => {
                const isCurrentOpenSem = s.id === selectedSemesterId;
                const cleanSemName = s.name.replace(/\s*\(Aktif\)/gi, '').trim();
                return (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {cleanSemName} {isCurrentOpenSem ? '(Aktif)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Right: Cloud Sync, Role Switcher & User Profile or Exit Student Portal */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {role === 'student' ? (
            <button
              onClick={async () => {
                if (onExitStudentPortal) {
                  onExitStudentPortal();
                } else {
                  await signOut();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer whitespace-nowrap"
              title="Kembali ke Menu Login"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline">Kembali ke Menu Login</span>
              <span className="xs:hidden">Kembali</span>
            </button>
          ) : (
            <>
              {/* Cloud Sync Status & Manual Trigger */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-semibold bg-blue-600/90 hover:bg-blue-600 text-white transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                  title="Sinkronisasi seluruh data ke Cloud Firestore & Penyimpanan Lokal"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : 'text-blue-200'}`} />
                  <span className="hidden md:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('admin_cloud')}
                  className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition cursor-pointer"
                  title="Buka Pengaturan Koneksi Cloud & Status Sinkronisasi Firebase"
                >
                  {networkOnline ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[11px] text-slate-300">Cloud Terhubung</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] text-amber-300">Offline</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toast Feedback */}
              {syncFeedback && (
                <div className="fixed top-14 right-4 z-50 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 transition animate-in fade-in slide-in-from-top-2">
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Quick Role Switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border transition ${getRoleBadgeColor(
                    role
                  )} hover:brightness-110 shrink-0`}
                  title="Ganti Peran Pengguna untuk Pengujian"
                >
                  <span className="sm:hidden">{getShortRoleLabel(role)}</span>
                  <span className="hidden sm:inline truncate max-w-[130px]">{getRoleLabel(role)}</span>
                  <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                </button>

                {isRoleMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsRoleMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                      <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                        <span>Ganti Peran (Pengujian)</span>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      </div>

                      <button
                        onClick={() => {
                          switchDemoRole('admin');
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800 ${
                          role === 'admin' ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-300'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-purple-400" />
                        <div>
                          <div>Administrator Sekolah</div>
                          <div className="text-[10px] text-slate-500 font-normal">Akses penuh seluruh modul & kontrol</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          switchDemoRole('bk');
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800 ${
                          role === 'bk' ? 'text-amber-400 font-bold bg-slate-800/50' : 'text-slate-300'
                        }`}
                      >
                        <Users className="w-4 h-4 text-amber-400" />
                        <div>
                          <div>Guru BK (Bimbingan Konseling)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Leger nilai, peringkat, & pemantauan</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          switchDemoRole('teacher', 't_aris');
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800 ${
                          role === 'teacher' ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-300'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div>Guru Mata Pelajaran</div>
                          <div className="text-[10px] text-slate-500 font-normal">Aris Wicaksono, S.Pd. (Matematika)</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* User Account Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition"
                  title="Profil Pengguna"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-semibold text-xs border border-slate-600">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="font-semibold text-white truncate">{profile?.name || 'Pengguna'}</p>
                        <p className="text-[11px] text-slate-400 truncate">{profile?.email || 'admin@sman1nusantara.sch.id'}</p>
                      </div>

                      <button
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await signOut();
                        }}
                        className="w-full text-left px-3 py-2 text-rose-300 hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Keluar Sistem (Sign Out)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
