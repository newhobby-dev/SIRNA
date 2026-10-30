import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Eye,
  Check,
  X,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Sparkles,
  Filter,
  Search,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { TeachingAssignment, GradeEntry } from '../../types';
import {
  formatIndonesianNumber,
  sortStudentsAlphabetically,
  getClassStudentsWithHistory,
  isSubjectApplicableToStudent,
} from '../../lib/utils';

interface SubmissionRowItem {
  id: string;
  assignment?: TeachingAssignment;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  grades: GradeEntry[];
  totalStudents: number;
  gradedCount: number;
  overallStatus: 'unfilled' | 'draft' | 'submitted' | 'revision_requested' | 'final' | 'published';
  submittedAt?: string;
  isDefaultSample: boolean;
}

export const VerificationFinalization: React.FC = () => {
  const {
    teachingAssignments,
    gradeEntries,
    students,
    classes,
    subjects,
    selectedSemesterId,
    currentSemester,
    verifyAssignmentGrades,
    deleteVerificationSubmission,
    deleteSingleGradeEntry,
    clearVerificationSubmissions,
    isSyncing,
  } = useAcademic();

  const [selectedRow, setSelectedRow] = useState<SubmissionRowItem | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter & search states
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Feedback message (replaces window.alert)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation modal state for deleting a row or clearing built-in data (replaces window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{
    mode: 'single_row' | 'default_only' | 'all_submissions';
    row?: SubmissionRowItem;
    deleteAssignmentToo?: boolean;
  } | null>(null);

  // Combine teachingAssignments and any direct gradeEntries in this semester
  const submissionRows = useMemo<SubmissionRowItem[]>(() => {
    const map = new Map<string, SubmissionRowItem>();
    const defaultIds = new Set(['asg_1', 'asg_2', 'asg_3', 'asg_4', 'asg_5', 'asg_6', 'asg_7', 'asg_8', 'asg_9', 'asg_10']);
    const defaultTeacherIds = new Set(['t_aris', 't_bambang', 't_citra', 't_dewi', 't_eko', 't_farah', 't_gunawan', 't_hendra']);

    // 1. Add rows from teachingAssignments
    teachingAssignments.forEach(a => {
      if (a.semesterId && a.semesterId !== selectedSemesterId) return;
      const key = `${a.classId}_${a.subjectId}`;
      const clsObj = classes.find(c => c.id === a.classId);
      const subjObj = subjects.find(s => s.id === a.subjectId);
      const grades = gradeEntries.filter(
        g => g.classId === a.classId && g.subjectId === a.subjectId && g.semesterId === selectedSemesterId
      );

      const allClassStudents = getClassStudentsWithHistory({
        classId: a.classId,
        semesterId: selectedSemesterId,
        students,
        gradeEntries,
      });
      const applicableStudents = subjObj
        ? allClassStudents.filter(st => isSubjectApplicableToStudent(subjObj, st.id, clsObj))
        : allClassStudents;

      const submittedCount = grades.filter(g => g.status === 'submitted').length;
      const finalCount = grades.filter(g => g.status === 'final').length;
      const draftCount = grades.filter(g => g.status === 'draft').length;
      const revisionCount = grades.filter(g => g.status === 'revision_requested').length;
      const publishedCount = grades.filter(g => g.status === 'published').length;

      let overallStatus: SubmissionRowItem['overallStatus'] = 'unfilled';
      if (publishedCount > 0) overallStatus = 'published';
      else if (finalCount > 0) overallStatus = 'final';
      else if (submittedCount > 0) overallStatus = 'submitted';
      else if (revisionCount > 0) overallStatus = 'revision_requested';
      else if (draftCount > 0) overallStatus = 'draft';

      const isDefaultSample =
        defaultIds.has(a.id) ||
        defaultTeacherIds.has(a.teacherId) ||
        grades.some(g => g.studentId.startsWith('std_') && g.studentId.length <= 7);

      map.set(key, {
        id: a.id,
        assignment: a,
        classId: a.classId,
        className: clsObj?.name || a.className || a.classId,
        subjectId: a.subjectId,
        subjectName: subjObj?.name || a.subjectName || a.subjectId,
        teacherId: a.teacherId,
        teacherName: a.teacherName || 'Guru Mapel',
        grades,
        totalStudents: applicableStudents.length,
        gradedCount: grades.length,
        overallStatus,
        submittedAt: grades[0]?.submittedAt,
        isDefaultSample,
      });
    });

    // 2. Also include any gradeEntries in this semester that don't have an explicit teachingAssignment row
    const semGrades = gradeEntries.filter(g => g.semesterId === selectedSemesterId);
    const groupedByClassSubj = new Map<string, GradeEntry[]>();
    semGrades.forEach(g => {
      const key = `${g.classId}_${g.subjectId}`;
      if (!map.has(key)) {
        const list = groupedByClassSubj.get(key) || [];
        list.push(g);
        groupedByClassSubj.set(key, list);
      }
    });

    groupedByClassSubj.forEach((grades, key) => {
      const first = grades[0];
      const clsObj = classes.find(c => c.id === first.classId);
      const subjObj = subjects.find(s => s.id === first.subjectId);
      const allClassStudents = getClassStudentsWithHistory({
        classId: first.classId,
        semesterId: selectedSemesterId,
        students,
        gradeEntries,
      });
      const applicableStudents = subjObj
        ? allClassStudents.filter(st => isSubjectApplicableToStudent(subjObj, st.id, clsObj))
        : allClassStudents;

      const submittedCount = grades.filter(g => g.status === 'submitted').length;
      const finalCount = grades.filter(g => g.status === 'final').length;
      const draftCount = grades.filter(g => g.status === 'draft').length;
      const revisionCount = grades.filter(g => g.status === 'revision_requested').length;
      const publishedCount = grades.filter(g => g.status === 'published').length;

      let overallStatus: SubmissionRowItem['overallStatus'] = 'unfilled';
      if (publishedCount > 0) overallStatus = 'published';
      else if (finalCount > 0) overallStatus = 'final';
      else if (submittedCount > 0) overallStatus = 'submitted';
      else if (revisionCount > 0) overallStatus = 'revision_requested';
      else if (draftCount > 0) overallStatus = 'draft';

      const isDefaultSample =
        defaultTeacherIds.has(first.teacherId) ||
        grades.some(g => g.studentId.startsWith('std_') && g.studentId.length <= 7);

      map.set(key, {
        id: `virtual_${key}`,
        classId: first.classId,
        className: clsObj?.name || first.className || first.classId,
        subjectId: first.subjectId,
        subjectName: subjObj?.name || first.subjectName || first.subjectId,
        teacherId: first.teacherId || 'admin',
        teacherName: first.teacherName || 'Unggahan Admin / Leger',
        grades,
        totalStudents: applicableStudents.length,
        gradedCount: grades.length,
        overallStatus,
        submittedAt: first.submittedAt,
        isDefaultSample,
      });
    });

    return Array.from(map.values());
  }, [teachingAssignments, gradeEntries, students, classes, subjects, selectedSemesterId]);

  const defaultSampleCount = useMemo(
    () => submissionRows.filter(r => r.isDefaultSample).length,
    [submissionRows]
  );

  const filteredRows = useMemo(() => {
    return submissionRows.filter(r => {
      if (filterClassId !== 'ALL' && r.classId !== filterClassId) return false;
      if (filterStatus !== 'ALL' && r.overallStatus !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.className.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.teacherName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [submissionRows, filterClassId, filterStatus, searchQuery]);

  const selectedGrades = useMemo(() => {
    if (!selectedRow) return [];
    const list = gradeEntries.filter(
      g =>
        g.classId === selectedRow.classId &&
        g.subjectId === selectedRow.subjectId &&
        g.semesterId === selectedSemesterId
    );
    return sortStudentsAlphabetically(list, 'studentName', 'studentNis');
  }, [selectedRow, gradeEntries, selectedSemesterId]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleApprove = async () => {
    if (!selectedRow) return;
    setIsProcessing(true);
    try {
      await verifyAssignmentGrades(selectedRow.id, true, '', {
        classId: selectedRow.classId,
        subjectId: selectedRow.subjectId,
        semesterId: selectedSemesterId,
        className: selectedRow.className,
        subjectName: selectedRow.subjectName,
      });
      showNotice(
        'success',
        `Nilai ${selectedRow.className} - ${selectedRow.subjectName} berhasil disahkan (Final)!`
      );
      setSelectedRow(null);
    } catch (err: any) {
      showNotice('error', 'Gagal menyetujui nilai: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow || !revisionNote.trim()) return;

    setIsProcessing(true);
    try {
      await verifyAssignmentGrades(selectedRow.id, false, revisionNote.trim(), {
        classId: selectedRow.classId,
        subjectId: selectedRow.subjectId,
        semesterId: selectedSemesterId,
        className: selectedRow.className,
        subjectName: selectedRow.subjectName,
      });
      showNotice('success', 'Permintaan revisi berhasil dikirimkan ke guru pengampu.');
      setShowRevisionModal(false);
      setRevisionNote('');
      setSelectedRow(null);
    } catch (err: any) {
      showNotice('error', 'Gagal mengirim revisi: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      if (deleteTarget.mode === 'single_row' && deleteTarget.row) {
        const row = deleteTarget.row;
        await deleteVerificationSubmission({
          assignmentId: row.assignment?.id,
          classId: row.classId,
          subjectId: row.subjectId,
          semesterId: selectedSemesterId,
          deleteAssignmentToo: deleteTarget.deleteAssignmentToo ?? true,
        });
        showNotice(
          'success',
          `Berhasil menghapus data verifikasi "${row.className} - ${row.subjectName}" secara permanen.`
        );
        if (selectedRow?.id === row.id) {
          setSelectedRow(null);
        }
      } else if (deleteTarget.mode === 'default_only') {
        const count = await clearVerificationSubmissions({
          semesterId: selectedSemesterId,
          mode: 'default_only',
        });
        showNotice(
          'success',
          `Berhasil membersihkan ${count} data bawaan / sampel dari daftar Verifikasi & Finalisasi!`
        );
      } else if (deleteTarget.mode === 'all_submissions') {
        const count = await clearVerificationSubmissions({
          semesterId: selectedSemesterId,
          mode: 'all_submissions',
        });
        showNotice(
          'success',
          `Berhasil menghapus seluruh (${count}) data pengajuan & penugasan pada periode ini.`
        );
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showNotice('error', 'Gagal menghapus data: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingleStudentGrade = async (gradeId: string, studentName: string) => {
    setIsProcessing(true);
    try {
      await deleteSingleGradeEntry(gradeId);
      showNotice('success', `Nilai untuk siswa "${studentName}" berhasil dihapus.`);
    } catch (err: any) {
      showNotice('error', 'Gagal menghapus nilai siswa: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Verifikasi & Finalisasi Nilai Akhir</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemeriksaan hasil input nilai akhir guru, pengesahan nilai, revisi, atau penghapusan data bawaan/pengajuan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {defaultSampleCount > 0 && (
            <button
              type="button"
              onClick={() => setDeleteTarget({ mode: 'default_only' })}
              disabled={isProcessing || isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm cursor-pointer"
              title="Hapus seluruh data penugasan dan nilai bawaan (sampel awal aplikasi) sekaligus"
            >
              <Sparkles className="w-4 h-4" />
              <span>Bersihkan Data Bawaan ({defaultSampleCount})</span>
            </button>
          )}

          {submissionRows.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteTarget({ mode: 'all_submissions' })}
              disabled={isProcessing || isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              title="Kosongkan seluruh daftar pengajuan nilai pada semester ini"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Semua Daftar Pengajuan</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">Kelas:</span>
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-600">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="submitted">Menunggu Verifikasi</option>
              <option value="final">Final (Disahkan)</option>
              <option value="published">Dipublikasikan</option>
              <option value="draft">Draft Guru</option>
              <option value="revision_requested">Perlu Revisi</option>
              <option value="unfilled">Belum Diisi</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari kelas, mapel, atau guru..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Pengajuan Nilai ({filteredRows.length} Penugasan)
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
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada daftar pengajuan nilai pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{row.className}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{row.subjectName}</span>
                        {row.isDefaultSample && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Data Bawaan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{row.teacherName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-slate-700">
                        {row.gradedCount}/{row.totalStudents} Siswa
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.overallStatus === 'submitted' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Menunggu Verifikasi
                        </span>
                      )}
                      {row.overallStatus === 'final' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Final (Disahkan)
                        </span>
                      )}
                      {row.overallStatus === 'published' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Dipublikasikan
                        </span>
                      )}
                      {row.overallStatus === 'revision_requested' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Perlu Revisi
                        </span>
                      )}
                      {row.overallStatus === 'draft' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Draft Guru
                        </span>
                      )}
                      {row.overallStatus === 'unfilled' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                          Belum Diisi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRow(row)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa Nilai</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              mode: 'single_row',
                              row,
                              deleteAssignmentToo: true,
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="Hapus baris penugasan dan nilai ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Row or Built-in Data */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteTarget.mode === 'default_only'
                    ? 'Bersihkan Data Bawaan / Sampel?'
                    : deleteTarget.mode === 'all_submissions'
                    ? 'Hapus Seluruh Daftar Pengajuan Nilai?'
                    : `Hapus Data "${deleteTarget.row?.className} - ${deleteTarget.row?.subjectName}"?`}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {deleteTarget.mode === 'default_only' ? (
                    <>
                      Tindakan ini akan menghapus seluruh penugasan dan entri nilai bawaan/sampel aplikasi secara permanen dari Cloud Firestore dan penyimpanan lokal.
                    </>
                  ) : deleteTarget.mode === 'all_submissions' ? (
                    <>
                      Seluruh daftar pengajuan dan entri nilai pada periode <strong>{currentSemester?.name}</strong> akan dihapus hingga bersih.
                    </>
                  ) : (
                    <>
                      Anda dapat memilih untuk menghapus nilai beserta baris penugasannya dari daftar ini, atau hanya mengosongkan nilainya saja.
                    </>
                  )}
                </p>
              </div>
            </div>

            {deleteTarget.mode === 'single_row' && deleteTarget.row?.assignment && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={deleteTarget.deleteAssignmentToo ?? true}
                    onChange={e =>
                      setDeleteTarget(prev =>
                        prev ? { ...prev, deleteAssignmentToo: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  <span>Hapus juga baris penugasan dari daftar Verifikasi & Finalisasi</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAction}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Menghapus...' : 'Ya, Hapus Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inspection of Student Grades */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pemeriksaan Nilai: {selectedRow.className} - {selectedRow.subjectName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guru Pengampu: <strong>{selectedRow.teacherName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGrades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada data nilai yang tersimpan untuk penugasan ini.
                      </td>
                    </tr>
                  ) : (
                    selectedGrades.map((g, idx) => (
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
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDeleteSingleStudentGrade(g.id, g.studentName)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus nilai siswa ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      mode: 'single_row',
                      row: selectedRow,
                      deleteAssignmentToo: true,
                    })
                  }
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Penugasan & Nilai Ini</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedGrades.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRevisionModal(true)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Minta Revisi Nilai</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Sahkan & Finalisasi Nilai</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {showRevisionModal && selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Kirim Catatan Revisi</h2>
              <button onClick={() => setShowRevisionModal(false)} className="cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan untuk Guru ({selectedRow.teacherName}) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  placeholder="Contoh: Mohon periksa kembali nilai siswa yang belum lengkap sebelum diajukan kembali..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
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
