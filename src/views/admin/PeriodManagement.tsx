import React, { useState } from 'react';
import { CalendarDays, Plus, Edit2, X, CheckCircle, Clock, ShieldCheck, Share2, Lock } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Semester, SemesterStatus } from '../../types';
import { formatIndonesianDate } from '../../lib/utils';

export const PeriodManagement: React.FC = () => {
  const {
    academicYears,
    semesters,
    selectedSemesterId,
    setSelectedSemesterId,
    saveSemester,
    saveAcademicYear,
  } = useAcademic();

  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const [formData, setFormData] = useState<Partial<Semester>>({
    name: '',
    semesterType: '1',
    startDate: '',
    gradeSubmissionDeadline: '',
    verificationDate: '',
    finalizationDate: '',
    publicationDate: '',
    status: 'input',
    isActive: true,
  });

  const getStatusBadge = (status: SemesterStatus) => {
    switch (status) {
      case 'preparation':
        return { label: 'Persiapan', color: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'input':
        return { label: 'Input Nilai Guru', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'verification':
        return { label: 'Verifikasi & Audit', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'finalized':
        return { label: 'Finalisasi Nilai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'published':
        return { label: 'Dipublikasikan ke Siswa', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'closed':
        return { label: 'Ditutup (Arsip Resmi)', color: 'bg-slate-200 text-slate-600 border-slate-300' };
    }
  };

  const handleOpenEditSemester = (sem: Semester) => {
    setEditingSemester(sem);
    setFormData(sem);
    setIsSemesterModalOpen(true);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSemester) return;

    const updatedSemester: Semester = {
      ...editingSemester,
      ...formData,
      status: formData.status as SemesterStatus,
    };

    await saveSemester(updatedSemester);
    setIsSemesterModalOpen(false);
  };

  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [createDefaultSemesters, setCreateDefaultSemesters] = useState(true);

  const handleSaveAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;

    const cleanName = newYearName.trim();
    const yearId = 'ay_' + cleanName.replace(/[^0-9]/g, '_');
    const newYear = {
      id: yearId,
      name: cleanName,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await saveAcademicYear(newYear);

    if (createDefaultSemesters) {
      const parts = cleanName.split('/');
      const startYear = parts[0] || '2027';
      const endYear = parts[1] || '2028';

      const sem1: Semester = {
        id: `${yearId}_sem1`,
        academicYearId: yearId,
        semesterType: '1',
        name: `Semester Ganjil ${cleanName}`,
        startDate: `${startYear}-07-15`,
        gradeSubmissionDeadline: `${startYear}-12-10`,
        verificationDate: `${startYear}-12-15`,
        finalizationDate: `${startYear}-12-18`,
        publicationDate: `${startYear}-12-20`,
        status: 'input',
        isActive: true,
      };

      const sem2: Semester = {
        id: `${yearId}_sem2`,
        academicYearId: yearId,
        semesterType: '2',
        name: `Semester Genap ${cleanName}`,
        startDate: `${endYear}-01-05`,
        gradeSubmissionDeadline: `${endYear}-06-10`,
        verificationDate: `${endYear}-06-15`,
        finalizationDate: `${endYear}-06-18`,
        publicationDate: `${endYear}-06-20`,
        status: 'preparation',
        isActive: false,
      };

      await saveSemester(sem1);
      await saveSemester(sem2);
    }

    setNewYearName('');
    setIsYearModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-600" />
            <span>Manajemen Periode Akademik & Semester</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola siklus semester (Persiapan, Input Nilai, Verifikasi, Finalisasi, Publikasi) dan jadwal batas akhir
          </p>
        </div>

        <button
          onClick={() => {
            setNewYearName('2027/2028');
            setIsYearModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tahun Pelajaran</span>
        </button>
      </div>

      {/* Modal Tambah Tahun Pelajaran */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Tambah Tahun Pelajaran Baru</h2>
              <button onClick={() => setIsYearModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademicYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Format Tahun Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2027/2028"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Gunakan format tahun akademik resmi, misal 2027/2028</p>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={createDefaultSemesters}
                    onChange={(e) => setCreateDefaultSemesters(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  <span>Otomatis buatkan Semester Ganjil & Genap</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Simpan Tahun Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semesters Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {semesters.map((sem) => {
          const badge = getStatusBadge(sem.status);
          const isCurrentSelected = sem.id === selectedSemesterId;

          return (
            <div
              key={sem.id}
              className={`bg-white rounded-2xl p-5 border transition shadow-xs flex flex-col justify-between ${
                isCurrentSelected ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                    {badge.label}
                  </span>
                  <button
                    onClick={() => handleOpenEditSemester(sem)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Ubah Jadwal & Status Periode"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900">{sem.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semester {sem.semesterType === '1' ? 'Ganjil' : 'Genap'}
                </p>

                {/* Deadlines list */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Batas Pengumpulan Nilai:</span>
                    <strong className="text-slate-800">{formatIndonesianDate(sem.gradeSubmissionDeadline)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Jadwal Verifikasi:</span>
                    <strong className="text-slate-800">{formatIndonesianDate(sem.verificationDate)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Jadwal Finalisasi:</span>
                    <strong className="text-slate-800">{formatIndonesianDate(sem.finalizationDate)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Jadwal Publikasi Siswa:</span>
                    <strong className="text-slate-800">{formatIndonesianDate(sem.publicationDate)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedSemesterId(sem.id)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition text-center ${
                    isCurrentSelected
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isCurrentSelected ? '✓ Semester Terpilih' : 'Pilih Periode Ini'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Semester Modal */}
      {isSemesterModalOpen && editingSemester && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Ubah Status & Jadwal Periode: {editingSemester.name}
              </h2>
              <button onClick={() => setIsSemesterModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveSemester} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Siklus Periode *</label>
                <select
                  value={formData.status || 'input'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SemesterStatus })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="preparation">1. Persiapan (Data master disiapkan)</option>
                  <option value="input">2. Input Nilai Guru (Guru mengisi/mengunggah nilai akhir)</option>
                  <option value="verification">3. Verifikasi (Pemeriksaan & persetujuan kurikulum)</option>
                  <option value="finalized">4. Finalisasi (Nilai resmi disahkan)</option>
                  <option value="published">5. Dipublikasikan (Siswa dapat melihat di portal)</option>
                  <option value="closed">6. Ditutup / Arsip (Riwayat permanen terkunci)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Input Nilai Guru</label>
                  <input
                    type="date"
                    value={formData.gradeSubmissionDeadline || ''}
                    onChange={(e) => setFormData({ ...formData, gradeSubmissionDeadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jadwal Verifikasi</label>
                  <input
                    type="date"
                    value={formData.verificationDate || ''}
                    onChange={(e) => setFormData({ ...formData, verificationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jadwal Finalisasi</label>
                  <input
                    type="date"
                    value={formData.finalizationDate || ''}
                    onChange={(e) => setFormData({ ...formData, finalizationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jadwal Publikasi Portal</label>
                  <input
                    type="date"
                    value={formData.publicationDate || ''}
                    onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSemesterModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Perbarui Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
