import React, { useState } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianDate } from '../../lib/utils';

export const BackupRestoreView: React.FC = () => {
  const {
    exportBackupJson,
    importBackupJson,
    seedInitialDataToFirestore,
    lastSyncTime,
    students,
    gradeEntries,
    classes,
  } = useAcademic();

  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadBackup = () => {
    const jsonString = exportBackupJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SIRNA_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Peringatan: Pemulihan data akan memperbarui data database sekolah sesuai isi berkas cadangan. Lanjutkan?')) {
      return;
    }

    setIsProcessing(true);
    setRestoreMessage(null);
    try {
      const text = await file.text();
      const res = await importBackupJson(text);
      if (res.success) {
        setRestoreMessage({ type: 'success', text: res.message });
      } else {
        setRestoreMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setRestoreMessage({ type: 'error', text: 'Gagal memproses file: ' + err.message });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleReSeed = async () => {
    if (!confirm('Apakah Anda ingin memuat ulang dataset contoh lengkap sekolah (Siswa X-A, X-B, Nilai Akhir Matematika, Bahasa Indonesia, Bahasa Inggris)?')) {
      return;
    }
    setIsProcessing(true);
    setRestoreMessage(null);
    try {
      await seedInitialDataToFirestore(true);
      setRestoreMessage({ type: 'success', text: 'Dataset contoh sekolah berhasil dimuat ulang ke cloud!' });
    } catch (err: any) {
      setRestoreMessage({ type: 'error', text: 'Gagal inisialisasi: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Pencadangan & Pemulihan Basis Data (Backup & Restore)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ekspor arsip akademik ke format standar JSON atau pulihkan data riwayat nilai terdokumentasi
          </p>
        </div>
      </div>

      {restoreMessage && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs ${
          restoreMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {restoreMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{restoreMessage.text}</span>
        </div>
      )}

      {/* Grid: Backup vs Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Ekspor Cadangan Data (JSON)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Unduh seluruh snapshot basis data mencakup data siswa, rombel, guru, penugasan, semester, dan seluruh mutasi nilai akhir.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Total Siswa:</span>
                <strong className="text-slate-900">{students.length} Orang</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Rombel:</span>
                <strong className="text-slate-900">{classes.length} Kelas</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Entri Nilai:</span>
                <strong className="text-slate-900">{gradeEntries.length} Rekor</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Waktu Sinkronisasi Terakhir:</span>
                <strong className="text-slate-900">{lastSyncTime ? lastSyncTime.toLocaleTimeString('id-ID') : '-'}</strong>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Berkas Cadangan (.json)</span>
            </button>
          </div>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Pemulihan Data (Restore)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Unggah berkas `.json` cadangan SIRNA resmi untuk memulihkan seluruh struktur dan rekaman nilai ke Firestore.
            </p>

            <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 hover:bg-slate-50 transition">
              <FileJson className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Pilih Berkas JSON Cadangan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Maksimal ukuran berkas 10MB</p>
              <label className="mt-3 inline-block px-4 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer shadow-xs">
                Pilih Berkas
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick re-seed button */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleReSeed}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Sampel Data Lengkap Sekolah</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
