import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Save,
  Send,
  RotateCcw,
  Search,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { TeachingAssignment, Student, GradeEntry, GradeStatus } from '../../types';
import {
  sortStudentsAlphabetically,
  formatIndonesianNumber,
  isSubjectApplicableToStudent,
  getClassStudentsWithHistory,
} from '../../lib/utils';

export const ManualGradeInput: React.FC = () => {
  const { profile } = useAuth();
  const {
    teachingAssignments,
    students,
    classes,
    subjects,
    gradeEntries,
    selectedSemesterId,
    currentSemester,
    saveGradeEntries,
    schoolSettings,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_aris';

  // Assignments for this teacher
  const myAssignments = teachingAssignments.filter(
    a => a.teacherId === currentTeacherId && a.isActive
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    myAssignments[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Score states: map of studentId -> string representation of score (allows empty string vs "0")
  const [scores, setScores] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const selectedAssignment = myAssignments.find(a => a.id === selectedAssignmentId);

  // Active students in the selected class (filtered by Peminatan student assignment if configured)
  const classStudents = React.useMemo(() => {
    if (!selectedAssignment) return [];
    const clsObj = classes.find(c => c.id === selectedAssignment.classId);
    const subjObj = subjects.find(s => s.id === selectedAssignment.subjectId);
    const baseList = getClassStudentsWithHistory({
      classId: selectedAssignment.classId,
      semesterId: selectedSemesterId,
      students,
      gradeEntries,
    });
    const filteredBySubject = subjObj
      ? baseList.filter(st => isSubjectApplicableToStudent(subjObj, st.id, clsObj))
      : baseList;
    return sortStudentsAlphabetically(filteredBySubject);
  }, [students, classes, subjects, gradeEntries, selectedAssignment, selectedSemesterId]);

  // Load existing grade entries for this assignment
  useEffect(() => {
    if (!selectedAssignment) return;

    const initialScores: Record<string, string> = {};
    const existingGrades = gradeEntries.filter(
      g =>
        g.classId === selectedAssignment.classId &&
        g.subjectId === selectedAssignment.subjectId &&
        g.semesterId === selectedSemesterId
    );

    existingGrades.forEach(g => {
      if (g.finalScore !== null && g.finalScore !== undefined) {
        initialScores[g.studentId] = String(g.finalScore);
      }
    });

    setScores(initialScores);
    setErrors({});
    setHasUnsavedChanges(false);
    setSaveMessage('');
  }, [selectedAssignmentId, selectedSemesterId, gradeEntries]);

  // Check if locked: if status is 'final' or 'published', teacher cannot edit without admin
  const isLocked = React.useMemo(() => {
    if (!selectedAssignment) return false;
    const existing = gradeEntries.find(
      g =>
        g.classId === selectedAssignment.classId &&
        g.subjectId === selectedAssignment.subjectId &&
        g.semesterId === selectedSemesterId
    );
    return existing?.status === 'final' || existing?.status === 'published';
  }, [selectedAssignment, selectedSemesterId, gradeEntries]);

  const handleScoreChange = (studentId: string, val: string) => {
    setHasUnsavedChanges(true);
    setSaveMessage('');

    // Update raw value
    setScores(prev => ({ ...prev, [studentId]: val }));

    // Instant validation
    if (val.trim() === '') {
      setErrors(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      return;
    }

    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) {
      setErrors(prev => ({ ...prev, [studentId]: 'Harus berupa angka' }));
    } else if (num < schoolSettings.minScore || num > schoolSettings.maxScore) {
      setErrors(prev => ({
        ...prev,
        [studentId]: `Rentang sah: ${schoolSettings.minScore} - ${schoolSettings.maxScore}`,
      }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  // Keyboard navigation: Enter or Down Arrow moves to next input field
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleSave = async (targetStatus: GradeStatus) => {
    if (!selectedAssignment) return;

    // Check if there are any validation errors
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      alert('Terdapat nilai yang tidak valid. Mohon perbaiki sebelum menyimpan.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const entriesToSave: Partial<GradeEntry>[] = [];

      classStudents.forEach(st => {
        const scoreStr = scores[st.id];
        // If empty, do not record or treat as 0!
        if (scoreStr !== undefined && scoreStr.trim() !== '') {
          const num = parseFloat(scoreStr.replace(',', '.'));
          if (!isNaN(num)) {
            entriesToSave.push({
              studentId: st.id,
              studentNis: st.nis,
              studentNisn: st.nisn,
              studentName: st.name,
              classId: selectedAssignment.classId,
              className: selectedAssignment.className,
              subjectId: selectedAssignment.subjectId,
              subjectName: selectedAssignment.subjectName,
              teacherId: selectedAssignment.teacherId,
              teacherName: selectedAssignment.teacherName,
              academicYearId: selectedAssignment.academicYearId,
              semesterId: selectedSemesterId,
              finalScore: num,
              status: targetStatus,
            });
          }
        }
      });

      if (entriesToSave.length === 0) {
        alert('Belum ada nilai yang diinput.');
        setIsSaving(false);
        return;
      }

      await saveGradeEntries(entriesToSave, targetStatus);
      setHasUnsavedChanges(false);
      setSaveMessage(
        targetStatus === 'draft'
          ? `✓ Draft nilai (${entriesToSave.length} siswa) berhasil disimpan.`
          : `✓ Nilai (${entriesToSave.length} siswa) berhasil dikirimkan untuk verifikasi!`
      );
    } catch (err: any) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Batalkan seluruh perubahan nilai yang belum tersimpan?')) {
      // Reload
      const initialScores: Record<string, string> = {};
      const existingGrades = gradeEntries.filter(
        g =>
          g.classId === selectedAssignment?.classId &&
          g.subjectId === selectedAssignment?.subjectId &&
          g.semesterId === selectedSemesterId
      );
      existingGrades.forEach(g => {
        if (g.finalScore !== null && g.finalScore !== undefined) {
          initialScores[g.studentId] = String(g.finalScore);
        }
      });
      setScores(initialScores);
      setErrors({});
      setHasUnsavedChanges(false);
    }
  };

  const filteredStudents = classStudents.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      s.nisn.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Input Nilai Akhir Mata Pelajaran (Manual)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Masukkan nilai akhir yang telah diolah secara mandiri (0 - 100, desimal didukung). Navigasi cepat menggunakan Enter / Panah Bawah.
          </p>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Ada perubahan belum tersimpan</span>
          </div>
        )}
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Assignment Picker & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600">Pilih Kelas & Mapel:</span>
          <select
            value={selectedAssignmentId}
            onChange={(e) => {
              if (hasUnsavedChanges) {
                if (!confirm('Anda memiliki perubahan nilai yang belum tersimpan. Lanjutkan berpindah?')) {
                  return;
                }
              }
              setSelectedAssignmentId(e.target.value);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-xs"
          >
            {myAssignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.className} - {a.subjectName}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa dalam rombel..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLocked && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Nilai pada mata pelajaran dan kelas ini telah berstatus <strong>Final / Dipublikasikan</strong>. Perubahan nilai terkunci dan hanya dapat diubah melalui prosedur koreksi administrator.
          </span>
        </div>
      )}

      {/* Spreadsheet Input Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3 w-28">NIS</th>
                <th className="py-3 px-3 w-32">NISN</th>
                <th className="py-3 px-4">Nama Peserta Didik (A-Z)</th>
                <th className="py-3 px-4 w-44 text-right">Nilai Akhir (0-100) *</th>
                <th className="py-3 px-3 w-32 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Tidak ada data peserta didik pada kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const scoreVal = scores[st.id] ?? '';
                  const err = errors[st.id];
                  const existing = gradeEntries.find(
                    g =>
                      g.studentId === st.id &&
                      g.classId === selectedAssignment?.classId &&
                      g.subjectId === selectedAssignment?.subjectId &&
                      g.semesterId === selectedSemesterId
                  );

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{st.nis}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{st.nisn}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <input
                            ref={el => { inputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="decimal"
                            disabled={isLocked}
                            value={scoreVal}
                            onChange={(e) => handleScoreChange(st.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            placeholder="Belum Diisi"
                            className={`w-28 px-3 py-1.5 rounded-lg border text-right font-mono font-extrabold text-sm focus:outline-none transition ${
                              err
                                ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-500'
                                : scoreVal !== ''
                                ? 'border-emerald-300 bg-emerald-50/50 text-slate-900 focus:ring-2 focus:ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-400 focus:ring-2 focus:ring-blue-500'
                            }`}
                          />
                          {err && <span className="text-[10px] text-rose-600 mt-0.5">{err}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          existing?.status === 'final'
                            ? 'bg-emerald-100 text-emerald-800'
                            : existing?.status === 'submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : existing?.status === 'revision_requested'
                            ? 'bg-rose-100 text-rose-800'
                            : existing?.status === 'draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {existing?.status || 'Belum Diisi'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Toolbar Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 flex items-center gap-2">
            <span>
              Total <strong>{filteredStudents.length}</strong> siswa • Nilai kosong berbeda dari nilai 0.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isLocked || isSaving}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-semibold transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Batalkan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={isLocked || isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('submitted')}
              disabled={isLocked || isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Nilai untuk Verifikasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
