import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Database,
  Server,
  ShieldCheck,
  Activity,
  Laptop,
  ArrowRightLeft,
  Users,
  School,
  BookOpen,
  Award,
  Zap,
  Info,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianDate } from '../../lib/utils';
import firebaseConfig from '../../../firebase-applet-config.json';

export const CloudConnectionView: React.FC = () => {
  const {
    networkOnline,
    lastSyncTime,
    isSyncing,
    syncToCloudNow,
    pullDataFromCloudNow,
    testCloudConnection,
    seedInitialDataToFirestore,
    students,
    classes,
    subjects,
    teachers,
    gradeEntries,
    academicSummaries,
  } = useAcademic();

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [isRunningAction, setIsRunningAction] = useState(false);

  // Test Cloud Connection
  const handleTestConnection = async () => {
    setIsRunningAction(true);
    setTestResult(null);
    try {
      const res = await testCloudConnection();
      setTestResult({
        tested: true,
        connected: res.connected,
        latencyMs: res.latencyMs,
        message: res.message,
      });
    } catch (e: any) {
      setTestResult({
        tested: true,
        connected: false,
        latencyMs: 0,
        message: 'Gagal menguji koneksi: ' + (e.message || 'Error tidak diketahui'),
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  // Push local state to Cloud Firestore
  const handlePushToCloud = async () => {
    setIsRunningAction(true);
    setActionFeedback(null);
    try {
      const res = await syncToCloudNow();
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Gagal sinkronisasi ke Cloud: ' + (err.message || 'Terjadi kesalahan sistem'),
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  // Pull latest documents from Cloud Firestore
  const handlePullFromCloud = async () => {
    setIsRunningAction(true);
    setActionFeedback(null);
    try {
      const res = await pullDataFromCloudNow();
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Gagal mengunduh dari Cloud: ' + (err.message || 'Terjadi kesalahan sistem'),
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  // Seed default dataset
  const handleSeedData = async () => {
    if (
      !confirm(
        'Apakah Anda yakin ingin memuat ulang dataset awal sekolah dan menyinkronkannya ke Cloud Firestore?'
      )
    ) {
      return;
    }
    setIsRunningAction(true);
    setActionFeedback(null);
    try {
      await seedInitialDataToFirestore(true);
      setActionFeedback({
        type: 'success',
        message: 'Dataset awal sekolah berhasil disematkan dan disinkronkan ke Cloud Firestore!',
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Gagal menyematkan data: ' + (err.message || 'Terjadi kesalahan sistem'),
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <span>Pengaturan Koneksi Cloud & Sinkronisasi Multi-Perangkat</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen integrasi Google Firebase Firestore untuk penyimpanan terpusat real-time antar komputer & laptop sekolah
          </p>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold shadow-xs ${
              networkOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                networkOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{networkOnline ? 'Cloud Firestore Terhubung' : 'Mode Offline (Cache Lokal)'}</span>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : actionFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : actionFeedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
          )}
          <span className="flex-1">{actionFeedback.message}</span>
        </div>
      )}

      {/* Top Grid: Status Server & Diagnostic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Cloud Credentials & Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Status Database Cloud Firestore</h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
              Google Cloud Platform
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Database ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs break-all">
                {firebaseConfig.firestoreDatabaseId || 'default'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Firebase Project ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {firebaseConfig.projectId}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Protokol Real-time
              </span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>WebSockets & Firestore onSnapshot</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Waktu Terakhir Sinkronisasi
              </span>
              <span className="font-semibold text-slate-800">
                {lastSyncTime ? formatIndonesianDate(lastSyncTime) : 'Belum pernah'}
              </span>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">Uji Kelayakan Koneksi Cloud</p>
              <p className="text-[11px] text-slate-500">
                Memeriksa respon server, database read ping, dan latensi jaringan sekolah
              </p>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isRunningAction || isSyncing}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Activity className={`w-3.5 h-3.5 ${isRunningAction ? 'animate-spin' : 'text-blue-400'}`} />
              <span>{isRunningAction ? 'Menguji...' : 'Uji Koneksi Cloud'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                testResult.connected
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div className="flex-1">
                <span>{testResult.message}</span>
                {testResult.latencyMs > 0 && (
                  <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 font-bold">
                    {testResult.latencyMs} ms
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Sinkronisasi Multi-Device Explanation */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider mb-2">
              <Laptop className="w-4 h-4" />
              <span>Multi-Perangkat Sekolah</span>
            </div>
            <h3 className="text-base font-extrabold text-white mb-2 leading-snug">
              Buka di Komputer Mana Saja Tanpa Khawatir Data Hilang
            </h3>
            <p className="text-xs text-blue-100/90 leading-relaxed mb-4">
              Setiap kali Admin atau Guru menyimpan nilai, menambahkan peserta didik, atau mengubah kelas di satu komputer, data langsung terkirim ke Cloud Firestore. Komputer lain di sekolah akan menerima pembaruan secara instan.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] text-blue-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Perlindungan Data Offline & Online</span>
            </div>
            <p className="text-[10px] text-blue-100/80 leading-normal">
              Jika internet sekolah melambat, data otomatis dicadangkan di memori lokal peramban (LocalStorage) dan dikirim kembali saat online.
            </p>
          </div>
        </div>
      </div>

      {/* Main Operations: Push & Pull Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ArrowRightLeft className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Aksi Sinkronisasi Data Lintas Komputer
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Push to Cloud */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
                <Upload className="w-4 h-4" />
                <span>Simpan & Sinkronkan Seluruh Data ke Cloud (Push)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kirim seluruh data lokal (pengaturan sekolah, peserta didik, kelas, guru, mata pelajaran, penugasan, dan seluruh rekap nilai) ke Google Cloud Firestore.
              </p>
            </div>

            <button
              onClick={handlePushToCloud}
              disabled={isRunningAction || isSyncing}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Upload className={`w-3.5 h-3.5 ${isRunningAction ? 'animate-spin' : ''}`} />
              <span>{isRunningAction ? 'Menyinkronkan...' : 'Sinkronkan Data ke Cloud Sekarang'}</span>
            </button>
          </div>

          {/* Pull from Cloud */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                <Download className="w-4 h-4" />
                <span>Tarik Data Terbaru dari Cloud (Pull)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unduh salinan data paling mutakhir dari Google Cloud Firestore ke komputer ini. Sangat dianjurkan jika Anda baru saja membuka aplikasi di laptop/komputer lain.
              </p>
            </div>

            <button
              onClick={handlePullFromCloud}
              disabled={isRunningAction || isSyncing}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isRunningAction ? 'animate-spin' : ''}`} />
              <span>{isRunningAction ? 'Mengunduh...' : 'Tarik Data Terbaru dari Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Re-seed Dataset */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xs text-slate-800 block">Inisialisasi / Reset Dataset Contoh Sekolah</span>
            <span className="text-[11px] text-slate-500 block">
              Memuat dataset default (Siswa Kelas X, Kurikulum Merdeka, Mata Pelajaran, dan contoh nilai) langsung ke Cloud Firestore
            </span>
          </div>
          <button
            onClick={handleSeedData}
            disabled={isRunningAction || isSyncing}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningAction ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Data Standar</span>
          </button>
        </div>
      </div>

      {/* Summary of Data Stored */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Ringkasan Objek Data Sekolah yang Tersinkronisasi
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
            <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-black text-blue-900">{students.length}</div>
            <div className="text-[10px] text-blue-600 font-semibold uppercase">Peserta Didik</div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
            <School className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <div className="text-lg font-black text-purple-900">{classes.length}</div>
            <div className="text-[10px] text-purple-600 font-semibold uppercase">Kelas / Rombel</div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <BookOpen className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-lg font-black text-emerald-900">{subjects.length}</div>
            <div className="text-[10px] text-emerald-600 font-semibold uppercase">Mata Pelajaran</div>
          </div>

          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
            <Users className="w-4 h-4 text-teal-600 mx-auto mb-1" />
            <div className="text-lg font-black text-teal-900">{teachers.length}</div>
            <div className="text-[10px] text-teal-600 font-semibold uppercase">Guru / Pendidik</div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <div className="text-lg font-black text-amber-900">{gradeEntries.length}</div>
            <div className="text-[10px] text-amber-600 font-semibold uppercase">Entri Nilai</div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
            <Zap className="w-4 h-4 text-rose-600 mx-auto mb-1" />
            <div className="text-lg font-black text-rose-900">{academicSummaries.length}</div>
            <div className="text-[10px] text-rose-600 font-semibold uppercase">Rekap Rapor</div>
          </div>
        </div>
      </div>
    </div>
  );
};
