import React, { useState } from 'react';
import { Share2, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Eye, Calendar } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianDate } from '../../lib/utils';
import { ActiveTab } from '../../components/layout/Sidebar';

interface PublishManagementProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const PublishManagement: React.FC<PublishManagementProps> = ({ onNavigate }) => {
  const {
    currentSemester,
    selectedSemesterId,
    gradeEntries,
    students,
    subjects,
    teachingAssignments,
    publishSemesterGrades,
    recalculateAveragesAndRanks,
  } = useAcademic();

  const [isPublishing, setIsPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const semGrades = gradeEntries.filter(g => g.semesterId === selectedSemesterId);
  const finalGrades = semGrades.filter(g => g.status === 'final');
  const publishedGrades = semGrades.filter(g => g.status === 'published');
  const submittedGrades = semGrades.filter(g => g.status === 'submitted');

  const isAlreadyPublished = currentSemester?.status === 'published';

  const handlePublish = async () => {
    if (!confirm('Apakah Anda yakin ingin mempublikasikan nilai semester ini ke Portal Siswa? Peserta didik akan dapat melihat nilai akhir dan rapor mereka.')) {
      return;
    }

    setIsPublishing(true);
    setSuccessMessage('');
    try {
      // 1. Recalculate rankings and averages
      await recalculateAveragesAndRanks(selectedSemesterId);
      // 2. Publish semester grades
      await publishSemesterGrades(selectedSemesterId);
      setSuccessMessage('Nilai akademik semester berhasil dipublikasikan secara resmi ke Portal Nilai Siswa!');
    } catch (err: any) {
      alert('Gagal mempublikasikan nilai: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-600" />
            <span>Publikasi Nilai ke Portal Peserta Didik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahap akhir siklus penilaian untuk membuka akses rapor nilai mandiri peserta didik
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Periode Akademik</span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{currentSemester?.name}</h2>
            <p className="text-xs text-slate-500">
              Jadwal Publikasi Resmi: <strong>{formatIndonesianDate(currentSemester?.publicationDate)}</strong>
            </p>
          </div>

          <div>
            {isAlreadyPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Status: Telah Dipublikasikan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Status: Belum Dipublikasikan</span>
              </span>
            )}
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="py-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Daftar Uji Kesiapan Publikasi
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700">Nilai Final Disahkan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{finalGrades.length + publishedGrades.length}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Nilai siap dipublikasi</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700">Menunggu Verifikasi</span>
                {submittedGrades.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-xl font-extrabold text-slate-900">{submittedGrades.length}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Perlu diverifikasi dahulu</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700">Akses Portal Siswa</span>
                <ShieldCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">2-Faktor Aman</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Verifikasi NISN + PIN Siswa</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 max-w-xl">
            Saat dipublikasikan, sistem akan secara otomatis mengkalkulasi ulang seluruh rata-rata semester dan peringkat kompetisi resmi sekolah.
          </p>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{isAlreadyPublished ? 'Publikasikan Ulang (Sinkronkan Rekap)' : 'Publikasikan Nilai ke Portal Siswa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
