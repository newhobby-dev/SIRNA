import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  KeyRound,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Calendar,
  Award,
  TrendingUp,
  LogOut,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  formatIndonesianNumber,
  formatIndonesianDate,
  getPredicateForScore,
  exportExcelWorkbook,
} from '../../lib/utils';
import { Student, GradeEntry, AcademicSummary, Semester } from '../../types';

export const StudentPortal: React.FC = () => {
  const {
    students,
    gradeEntries,
    academicSummaries,
    semesters,
    selectedSemesterId,
    currentSemester,
    schoolSettings,
    classes,
  } = useAcademic();

  // Verification Form State
  const [nisnInput, setNisnInput] = useState('0081234561'); // Pre-fill with sample student for instant demonstration
  const [pinInput, setPinInput] = useState('123456');
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [verificationError, setVerificationError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Chosen semester inside portal
  const [activeSemId, setActiveSemId] = useState<string>(selectedSemesterId);

  // Semesters that have published grades or active
  const availableSemesters = useMemo(() => {
    return semesters.filter(s => s.status === 'published' || s.id === selectedSemesterId);
  }, [semesters, selectedSemesterId]);

  const activeSemester = semesters.find(s => s.id === activeSemId) || currentSemester;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');

    if (attemptCount >= 5) {
      setVerificationError('Terlalu banyak percobaan yang gagal. Silakan tunggu beberapa saat atau hubungi administrator sekolah.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      const cleanNisn = nisnInput.trim();
      const cleanPin = pinInput.trim();

      // Look up student by NISN and verify PIN (Two-Factor authentication as mandated in Section 3 & 13)
      const found = students.find(s => s.nisn === cleanNisn && s.portalPin === cleanPin);

      if (found) {
        setVerifiedStudent(found);
        setAttemptCount(0);
        // Default to published semester if available
        const publishedSem = semesters.find(s => s.status === 'published');
        if (publishedSem) {
          setActiveSemId(publishedSem.id);
        } else {
          setActiveSemId(selectedSemesterId);
        }
      } else {
        setAttemptCount(prev => prev + 1);
        // Generic message that does not leak whether NISN exists (Section 3 security requirement)
        setVerificationError('Verifikasi identitas gagal. Periksa kembali NISN dan PIN akses yang diberikan oleh pihak sekolah.');
      }
      setIsVerifying(false);
    }, 400);
  };

  const handleLogout = () => {
    setVerifiedStudent(null);
    setNisnInput('');
    setPinInput('');
    setVerificationError('');
  };

  // Only get published grades for this student and active semester
  const studentGrades = useMemo(() => {
    if (!verifiedStudent) return [];
    return gradeEntries.filter(
      g =>
        g.studentId === verifiedStudent.id &&
        g.semesterId === activeSemId &&
        g.status === 'published' // Strict rule: only published grades are visible to students
    );
  }, [verifiedStudent, activeSemId, gradeEntries]);

  // Student summary for this semester
  const studentSummary = useMemo(() => {
    if (!verifiedStudent) return null;
    return academicSummaries.find(
      s => s.studentId === verifiedStudent.id && s.semesterId === activeSemId
    );
  }, [verifiedStudent, activeSemId, academicSummaries]);

  // Historical progress: all semesters with published summary for this student
  const historicalProgress = useMemo(() => {
    if (!verifiedStudent) return [];
    return semesters
      .map(sem => {
        const sum = academicSummaries.find(
          s => s.studentId === verifiedStudent.id && s.semesterId === sem.id
        );
        const gradesForSem = gradeEntries.filter(
          g => g.studentId === verifiedStudent.id && g.semesterId === sem.id && g.status === 'published'
        );
        const avg = sum?.averageScore || (gradesForSem.length > 0 ? gradesForSem.reduce((a, b) => a + b.finalScore, 0) / gradesForSem.length : 0);
        return {
          semesterId: sem.id,
          semesterName: sem.name,
          academicYearId: sem.academicYearId,
          averageScore: avg,
          classRank: sum?.classRank ?? null,
          parallelRank: sum?.parallelRank ?? null,
          isComplete: sum?.isComplete ?? (gradesForSem.length >= 6),
          subjectCount: gradesForSem.length,
          hasGrades: gradesForSem.length > 0 || (sum?.averageScore ?? 0) > 0,
        };
      })
      .filter(item => item.hasGrades || item.semesterId === activeSemId);
  }, [verifiedStudent, academicSummaries, semesters, gradeEntries, activeSemId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!verifiedStudent) return;
    const dataToExport = studentGrades.map((g, idx) => {
      const pred = getPredicateForScore(g.finalScore, schoolSettings.predicates);
      return {
        'No.': idx + 1,
        'Mata Pelajaran': g.subjectName,
        'Nilai Akhir': formatIndonesianNumber(g.finalScore),
        'Predikat': pred.predicate,
        'Keterangan': pred.description,
      };
    });

    exportExcelWorkbook(`Rapor_Nilai_${verifiedStudent.name}_${activeSemester?.name}`, [
      { sheetName: 'Nilai Rapor', data: dataToExport },
    ]);
  };

  // Masked NISN for display privacy (e.g. 0081****61)
  const maskedNisn = verifiedStudent
    ? `${verifiedStudent.nisn.substring(0, 4)}****${verifiedStudent.nisn.substring(verifiedStudent.nisn.length - 2)}`
    : '';

  const studentClass = classes.find(c => c.id === verifiedStudent?.currentClassId);

  // If not verified, show verification login screen
  if (!verifiedStudent) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg mx-auto mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PORTAL NILAI SAYA</h1>
            <p className="text-xs text-blue-200 mt-1">{schoolSettings.schoolName}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Nilai Resmi Peserta Didik</span>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 space-y-5">
            {verificationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nomor Induk Siswa Nasional (NISN) *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={nisnInput}
                    onChange={(e) => setNisnInput(e.target.value)}
                    placeholder="Masukkan 10 digit NISN Anda..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  PIN Akses Portal Sekolah (6 Digit) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    maxLength={10}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN yang diberikan sekolah..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Untuk keamanan privasi, NISN dipadukan dengan PIN akses sekolah (contoh bawaan: 123456).
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Memverifikasi Identitas...' : 'Cari & Buka Nilai Saya'}</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-500">
              Butuh bantuan dengan NISN atau PIN akses Anda? Hubungi bagian Kurikulum atau Wali Kelas sekolah.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified Student View
  return (
    <div className="space-y-6">
      {/* Top Header Controls (Hidden in print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {verifiedStudent.name.charAt(0)}
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">{verifiedStudent.name}</h1>
              <p className="text-xs text-slate-500">
                NIS: <strong className="font-mono text-slate-700">{verifiedStudent.nis}</strong> • NISN:{' '}
                <strong className="font-mono text-slate-700">{maskedNisn}</strong> • Rombel:{' '}
                <strong>{verifiedStudent.currentClassName}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Semester Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeSemId}
              onChange={(e) => setActiveSemId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {availableSemesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'published' ? '(Resmi)' : `(${s.status})`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rapor</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Keluar Sesi Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards (Screen only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Rata-Rata Semester</span>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">
            {studentSummary?.averageScore ? formatIndonesianNumber(studentSummary.averageScore) : '-'}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {studentGrades.length} Mapel Selesai
          </span>
        </div>

        {schoolSettings.portalShowRank && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Peringkat Kelas</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-500" />
              <span>{studentSummary?.classRank ? `Ke-${studentSummary.classRank}` : '-'}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {studentSummary?.isComplete ? 'Peringkat Resmi' : 'Menunggu Kelengkapan'}
            </span>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Status Kelengkapan</span>
          <div className="mt-1">
            {studentSummary?.isComplete ? (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                ✓ Lengkap
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Menunggu Kelengkapan
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Mata Pelajaran Wajib</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Tanggal Publikasi</span>
          <div className="text-xs font-bold text-slate-800 mt-2">
            {formatIndonesianDate(activeSemester?.publicationDate || new Date())}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Telah Diverifikasi Resmi</span>
        </div>
      </div>

      {/* Official Report Card Sheet (Printed and Screen) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
        <PrintHeader
          documentTitle="SURAT KETERANGAN REKAPITULASI HASIL BELAJAR PESERTA DIDIK"
          subTitle={`Tahun Pelajaran: ${schoolSettings.schoolName} | ${activeSemester?.name || ''}`}
        />

        {/* Student Identity Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-36 text-slate-500">Nama Peserta Didik</span>
              <strong className="text-slate-900">: {verifiedStudent.name}</strong>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-500">Nomor Induk Siswa (NIS)</span>
              <strong className="text-slate-900 font-mono">: {verifiedStudent.nis}</strong>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-500">NISN</span>
              <strong className="text-slate-900 font-mono">: {verifiedStudent.nisn}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-36 text-slate-500">Rombongan Belajar</span>
              <strong className="text-slate-900">: {studentClass?.name || verifiedStudent.currentClassName}</strong>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-500">Tingkat / Fase</span>
              <strong className="text-slate-900">: Kelas {studentClass?.gradeLevel || '10'}</strong>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-500">Semester</span>
              <strong className="text-slate-900">: {activeSemester?.name}</strong>
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 print-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-800 tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No.</th>
                <th className="py-2.5 px-4 border-r border-slate-300">Mata Pelajaran</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">Nilai Akhir</th>
                <th className="py-2.5 px-3 w-20 text-center border-r border-slate-300">Predikat</th>
                <th className="py-2.5 px-4">Capaian Kompetensi / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {studentGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nilai akhir untuk semester ini masih dalam tahap pengolahan / verifikasi dan belum dipublikasikan oleh pihak sekolah.
                  </td>
                </tr>
              ) : (
                studentGrades.map((g, idx) => {
                  const pred = getPredicateForScore(g.finalScore, schoolSettings.predicates);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                        {g.subjectName}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                        {formatIndonesianNumber(g.finalScore)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">
                        {pred.predicate}
                      </td>
                      <td className="py-2 px-4 text-slate-700">{pred.description}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {studentGrades.length > 0 && (
          <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              <p className="text-slate-600">
                Jumlah Mata Pelajaran Selesai:{' '}
                <strong className="text-slate-900">{studentGrades.length} Mata Pelajaran</strong>
              </p>
              <p className="text-slate-600 mt-0.5">
                Status Kelengkapan:{' '}
                <strong className={studentSummary?.isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                  {studentSummary?.isComplete ? 'Lengkap' : 'Menunggu Kelengkapan Nilai'}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[11px] text-slate-400 block">Rata-Rata Semester:</span>
                <strong className="text-lg font-extrabold text-blue-900">
                  {studentSummary?.averageScore ? formatIndonesianNumber(studentSummary.averageScore) : '-'}
                </strong>
              </div>

              {schoolSettings.portalShowRank && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Peringkat Kelas:</span>
                  <strong className="text-lg font-extrabold text-amber-600">
                    {studentSummary?.classRank ? `Peringkat ${studentSummary.classRank}` : '-'}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Official Signatures */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div className="text-center">
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-semibold text-slate-900">Orang Tua / Wali Peserta Didik</p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">...........................................</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-500">
              {schoolSettings.city}, {formatIndonesianDate(activeSemester?.publicationDate || new Date())}
            </p>
            <p className="font-semibold text-slate-900">
              Kepala {schoolSettings.schoolName}
            </p>
            <div className="h-20 flex items-end justify-center">
              <span className="font-bold underline text-slate-950">{schoolSettings.principalName}</span>
            </div>
            <p className="text-[11px] text-slate-600">NIP. {schoolSettings.principalNip}</p>
          </div>
        </div>
      </div>

      {/* Historical Progress: Ranking displayed inline on the same row as each semester (Directive 5) */}
      {historicalProgress.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Riwayat Capaian Nilai & Peringkat per Semester</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rata-rata nilai dan peringkat kelas serta paralel ditampilkan sejajar dalam satu baris per semester
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Total {historicalProgress.length} Semester Terdata
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No.</th>
                  <th className="py-3 px-4">Semester & Tahun Pelajaran</th>
                  <th className="py-3 px-3 text-right">Rata-Rata</th>
                  <th className="py-3 px-4 text-center">Peringkat Kelas</th>
                  <th className="py-3 px-4 text-center">Peringkat Paralel</th>
                  <th className="py-3 px-3 text-center">Kelengkapan</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historicalProgress.map((item, idx) => {
                  const isActive = item.semesterId === activeSemId;
                  return (
                    <tr
                      key={item.semesterId}
                      className={`transition ${isActive ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{item.semesterName}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                              Aktif Dilihat
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{item.subjectCount} Mata Pelajaran</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-900 text-sm">
                        {item.averageScore > 0 ? formatIndonesianNumber(item.averageScore) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {schoolSettings.portalShowRank ? (
                          item.classRank ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              <Award className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ke-{item.classRank}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum Dihitung</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">Privat</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {schoolSettings.portalShowRank ? (
                          item.parallelRank ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Award className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Ke-{item.parallelRank}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum Dihitung</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">Privat</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isComplete ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ✓ Lengkap
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Proses
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setActiveSemId(item.semesterId)}
                          disabled={isActive}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isActive
                              ? 'bg-slate-200 text-slate-500 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer'
                          }`}
                        >
                          {isActive ? 'Sedang Dibuka' : 'Buka Rapor'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
