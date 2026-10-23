import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';

interface LoginPageProps {
  onOpenStudentPortal: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenStudentPortal }) => {
  const { loginWithCredentials, signInWithGoogle, switchDemoRole } = useAuth();
  const { schoolSettings } = useAcademic();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminGanteng93');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(username, password, rememberMe);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand & School Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-900/50 mx-auto">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Sistem Informasi Rekap Nilai Akademik
          </h1>
          <p className="text-sm font-semibold text-blue-300">
            {schoolSettings.schoolName}
          </p>
          <p className="text-xs text-slate-400">
            {schoolSettings.address}, {schoolSettings.city}
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/10 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan akun Administrator, Guru BK, atau Guru Mata Pelajaran
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Username Pengguna *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Kata Sandi *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Ingat Saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memeriksa Kredensial...' : 'Masuk ke Aplikasi'}</span>
            </button>
          </form>

          {/* Quick Credential Test Buttons */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Akun Default (Klik untuk Coba Cepat):
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'AdminGanteng93')}
                className="p-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 font-bold text-center transition"
              >
                <div>Admin</div>
                <div className="text-[9px] font-normal text-purple-700 font-mono">admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('gurubk', 'BKSelaras26')}
                className="p-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold text-center transition"
              >
                <div>Guru BK</div>
                <div className="text-[9px] font-normal text-amber-700 font-mono">gurubk</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('gurumapel', 'GuruJuara26')}
                className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold text-center transition"
              >
                <div>Guru Mapel</div>
                <div className="text-[9px] font-normal text-emerald-700 font-mono">gurumapel</div>
              </button>
            </div>
          </div>

          {/* Direct Student Portal Access */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onOpenStudentPortal}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>Buka Portal Mandiri Nilai Peserta Didik (NISN)</span>
            </button>
          </div>
        </div>

        {/* Developer Credit UNDER login box - Strictly hidden in print with no-print */}
        <div className="text-center text-xs text-slate-400 font-medium no-print developer-credit">
          Dikembangkan Oleh : <span className="text-sky-300 font-bold">Aris Wicaksono, S.Pd.</span>
        </div>
      </div>
    </div>
  );
};
