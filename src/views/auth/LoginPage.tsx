import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';

interface LoginPageProps {
  onOpenStudentPortal: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenStudentPortal }) => {
  const { loginWithCredentials } = useAuth();
  const { schoolSettings } = useAcademic();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand & School Logo */}
        <div className="text-center space-y-1.5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-900/50 mx-auto mb-2">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-widest">
            SIRNA
          </h1>
          <p className="text-xs sm:text-sm font-bold text-blue-200 tracking-wider uppercase whitespace-nowrap">
            SISTEM INFORMASI REKAP NILAI AKADEMIK
          </p>
          <p className="text-sm font-semibold text-blue-300 pt-0.5">
            {schoolSettings.schoolName}
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
                  placeholder="Masukkan username Anda..."
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

          {/* Direct Student Portal Access */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onOpenStudentPortal}
              className="w-full py-3 px-4 rounded-xl border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-800 font-extrabold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4 text-blue-600 stroke-[2.5]" />
              <span>PORTAL NILAI PESERTA DIDIK</span>
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
