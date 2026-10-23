import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  FileCheck,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { TeachingAssignment, GradeEntry } from '../../types';
import { formatIndonesianNumber, sortStudentsAlphabetically } from '../../lib/utils';

export const VerificationFinalization: React.FC = () => {
  const {
    teachingAssignments,
    gradeEntries,
    students,
    selectedSemesterId,
    currentSemester,
    verifyAssignmentGrades,
    schoolSettings,
  } = useAcademic();

  const [selectedAssignment, setSelectedAssignment] = useState<TeachingAssignment | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Group teaching assignments with grade submission details
  const assignmentSubmissions = teachingAssignments.map(a => {
    const grades = gradeEntries.filter(
      g => g.classId === a.classId && g.subjectId === a.subjectId && g.semesterId === selectedSemesterId
    );
    const classStudents = students.filter(s => s.currentClassId === a.classId && s.status === 'aktif');

    const submittedCount = grades.filter(g => g.status === 'submitted').length;
    const finalCount = grades.filter(g => g.status === 'final').length;
    const draftCount = grades.filter(g => g.status === 'draft').length;
    const revisionCount = grades.filter(g => g.status === 'revision_requested').length;
    const publishedCount = grades.filter(g => g.status === 'published').length;

    let overallStatus: 'unfilled' | 'draft' | 'submitted' | 'revision_requested' | 'final' | 'published' = 'unfilled';
    if (publishedCount > 0) overallStatus = 'published';
    else if (finalCount > 0) overallStatus = 'final';
    else if (submittedCount > 0) overallStatus = 'submitted';
    else if (revisionCount > 0) overallStatus = 'revision_requested';
    else if (draftCount > 0) overallStatus = 'draft';

    return {
      assignment: a,
      grades,
      totalStudents: classStudents.length,
      gradedCount: grades.length,
      overallStatus,
      submittedAt: grades[0]?.submittedAt,
    };
  });

  const selectedGrades = selectedAssignment
    ? gradeEntries.filter(
        g =>
          g.classId === selectedAssignment.classId &&
          g.subjectId === selectedAssignment.subjectId &&
          g.semesterId === selectedSemesterId
      )
    : [];

  const sortedSelectedGrades = sortStudentsAlphabetically(selectedGrades, 'studentName', 'studentNis');

  const handleApprove = async () => {
    if (!selectedAssignment) return;
    setIsProcessing(true);
    try {
      await verifyAssignmentGrades(selectedAssignment.id, true);
      alert(`Nilai ${selectedAssignment.className} - ${selectedAssignment.subjectName} berhasil disahkan (Final)!`);
      setSelectedAssignment(null);
    } catch (err: any) {
      alert('Gagal menyetujui nilai: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !revisionNote.trim()) return;

    setIsProcessing(true);
    try {
      await verifyAssignmentGrades(selectedAssignment.id, false, revisionNote.trim());
      alert(`Permintaan revisi berhasil dikirimkan ke guru pengampu.`);
      setShowRevisionModal(false);
      setRevisionNote('');
      setSelectedAssignment(null);
    } catch (err: any) {
      alert('Gagal mengirim revisi: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Verifikasi & Finalisasi Nilai Akhir</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemeriksaan hasil input nilai akhir guru mandiri, pengesahan nilai, atau permintaan perbaikan/revisi
          </p>
        </div>
      </div>

      {/* Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Pengajuan Nilai ({assignmentSubmissions.length} Penugasan)
          </h2>
          <span className="text-xs text-slate-500">
            Periode: <strong>{currentSemester?.name}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3">Kelas / Rombel</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-3 text-center">Kelengkapan</th>
                <th className="py-3 px-3 text-center">Status Nilai</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignmentSubmissions.map(({ assignment, gradedCount, totalStudents, overallStatus }, idx) => (
                <tr key={assignment.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{assignment.className}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{assignment.subjectName}</td>
                  <td className="py-3 px-4 text-slate-600">{assignment.teacherName}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-slate-700">
                      {gradedCount}/{totalStudents} Siswa
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {overallStatus === 'submitted' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Menunggu Verifikasi
                      </span>
                    )}
                    {overallStatus === 'final' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Final (Disahkan)
                      </span>
                    )}
                    {overallStatus === 'published' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Dipublikasikan
                      </span>
                    )}
                    {overallStatus === 'revision_requested' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Perlu Revisi
                      </span>
                    )}
                    {overallStatus === 'draft' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Draft Guru
                      </span>
                    )}
                    {overallStatus === 'unfilled' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                        Belum Diisi
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      disabled={gradedCount === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition flex items-center gap-1.5 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Periksa Nilai</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Inspection of Student Grades */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pemeriksaan Nilai: {selectedAssignment.className} - {selectedAssignment.subjectName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guru Pengampu: <strong>{selectedAssignment.teacherName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Students Grades List */}
            <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                    <th className="py-2.5 px-3 w-10 text-center">No.</th>
                    <th className="py-2.5 px-3">NIS</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-4">Nama Peserta Didik</th>
                    <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSelectedGrades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada data nilai yang tersimpan untuk penugasan ini.
                      </td>
                    </tr>
                  ) : (
                    sortedSelectedGrades.map((g, idx) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{g.studentNis}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{g.studentNisn}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{g.studentName}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                          {formatIndonesianNumber(g.finalScore)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Total <strong>{sortedSelectedGrades.length}</strong> nilai peserta didik siap diproses
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Minta Revisi Nilai</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Sahkan & Finalisasi Nilai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {showRevisionModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Kirim Catatan Revisi</h2>
              <button onClick={() => setShowRevisionModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan untuk Guru ({selectedAssignment.teacherName}) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Contoh: Mohon periksa kembali nilai siswa Bagus Setiawan yang belum lengkap atau di bawah standar sebelum diajukan kembali..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Kirim Permintaan Revisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
