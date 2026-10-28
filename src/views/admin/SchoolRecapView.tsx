import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Upload,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  FileSpreadsheet,
  Save,
  Edit3,
  RotateCcw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { PrintHeader } from '../../components/common/PrintHeader';
import {
  sortStudentsAlphabetically,
  formatIndonesianNumber,
  formatIndonesianDate,
  exportExcelWorkbook,
  downloadAllSubjectsTemplate,
  parseAllSubjectsExcelFile,
  AllSubjectsParseResult,
} from '../../lib/utils';
import { GradeEntry, GradeStatus } from '../../types';

interface SchoolRecapViewProps {
  initialMode?: 'leger' | 'upload';
}

export const SchoolRecapView: React.FC<SchoolRecapViewProps> = ({ initialMode = 'leger' }) => {
  const { role } = useAuth();
  const {
    students,
    classes,
    subjects,
    teachingAssignments,
    gradeEntries,
    academicSummaries,
    semesters,
    selectedSemesterId,
    setSelectedSemesterId,
    currentSemester,
    schoolSettings,
    saveGradeEntries,
    isSyncing,
  } = useAcademic();

  const isAdmin = role === 'admin';

  const [activeMode, setActiveMode] = useState<'leger' | 'upload'>(initialMode);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [subjectScope, setSubjectScope] = useState<'grade_level' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Editing State for Admin on the Leger Matrix Table
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [editedCells, setEditedCells] = useState<Record<string, string>>({}); // key: `${studentId}_${subjectId}`
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Multi-Subject Excel Upload State
  const [uploadTargetScope, setUploadTargetScope] = useState<'selected_class' | 'all_classes'>('selected_class');
  const [includeExistingInTemplate, setIncludeExistingInTemplate] = useState(true);
  const [uploadStatusTarget, setUploadStatusTarget] = useState<GradeStatus>('published');
  const [parsedMultiData, setParsedMultiData] = useState<AllSubjectsParseResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  const currentClass = classes.find(c => c.id === selectedClassId);
  const activeSemester = semesters.find(s => s.id === selectedSemesterId) || currentSemester;

  // Active students in the chosen class, sorted alphabetically
  const classStudents = useMemo(() => {
    const list = students.filter(s => s.currentClassId === selectedClassId && s.status === 'aktif');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return sortStudentsAlphabetically(
        list.filter(s => s.name.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q))
      );
    }
    return sortStudentsAlphabetically(list);
  }, [students, selectedClassId, searchQuery]);

  // Displayed subjects based on scope filter
  const displayedSubjects = useMemo(() => {
    const allActive = subjects.filter(s => s.isActive);
    if (subjectScope === 'all' || !currentClass) {
      return allActive;
    }
    const filtered = allActive.filter(
      s => !s.gradeLevel || s.gradeLevel === 'Semua' || s.gradeLevel === currentClass.gradeLevel
    );
    return filtered.length > 0 ? filtered : allActive;
  }, [subjects, subjectScope, currentClass]);

  // All grades map for the selected semester across the entire school: `${studentId}_${subjectId}` -> score
  const allSemesterGradesMap = useMemo(() => {
    const map = new Map<string, number>();
    gradeEntries
      .filter(g => g.semesterId === selectedSemesterId)
      .forEach(g => {
        if (g.finalScore !== null && g.finalScore !== undefined) {
          map.set(`${g.studentId}_${g.subjectId}`, g.finalScore);
        }
      });
    return map;
  }, [gradeEntries, selectedSemesterId]);

  // Grades map for this class & semester
  const gradesMap = useMemo(() => {
    const map = new Map<string, number>();
    gradeEntries
      .filter(g => (g.classId === selectedClassId || allSemesterGradesMap.has(`${g.studentId}_${g.subjectId}`)) && g.semesterId === selectedSemesterId)
      .forEach(g => {
        if (g.finalScore !== null && g.finalScore !== undefined) {
          map.set(`${g.studentId}_${g.subjectId}`, g.finalScore);
        }
      });
    return map;
  }, [gradeEntries, selectedClassId, selectedSemesterId, allSemesterGradesMap]);

  // Summaries map for this semester
  const summaryMap = useMemo(() => {
    const map = new Map<string, any>();
    academicSummaries
      .filter(s => s.semesterId === selectedSemesterId)
      .forEach(s => {
        map.set(s.studentId, s);
      });
    return map;
  }, [academicSummaries, selectedSemesterId]);

  // Sync editedCells when entering edit mode or changing class/semester
  useEffect(() => {
    if (isEditingTable) {
      const initial: Record<string, string> = {};
      classStudents.forEach(st => {
        displayedSubjects.forEach(sub => {
          const val = gradesMap.get(`${st.id}_${sub.id}`);
          if (val !== undefined) {
            initial[`${st.id}_${sub.id}`] = String(val);
          }
        });
      });
      setEditedCells(initial);
    }
  }, [isEditingTable, selectedClassId, selectedSemesterId, classStudents, displayedSubjects, gradesMap]);

  const handlePrint = () => {
    window.print();
  };

  // Export 1 selected class (All Subjects)
  const handleExportCurrentClassExcel = () => {
    if (!currentClass) return;

    const rows = classStudents.map((st, idx) => {
      const sum = summaryMap.get(st.id);
      const row: Record<string, any> = {
        'No.': idx + 1,
        'NIS': st.nis,
        'NISN': st.nisn,
        'Nama Peserta Didik': st.name,
        'Kelas': currentClass.name,
      };

      displayedSubjects.forEach(sub => {
        const score = gradesMap.get(`${st.id}_${sub.id}`);
        row[`${sub.code} - ${sub.name}`] = score !== undefined ? score : '';
      });

      row['Total Nilai'] = sum?.totalScore ? formatIndonesianNumber(sum.totalScore) : '-';
      row['Rata-Rata'] = sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-';
      row['Status'] = sum?.isComplete ? 'Lengkap' : 'Belum Lengkap';
      row['Peringkat Kelas'] = sum?.classRank ?? '-';
      row['Peringkat Paralel'] = sum?.parallelRank ?? '-';
      row['Peringkat Eligible'] = sum?.eligibleRank ?? st.eligibleRank ?? '-';

      return row;
    });

    exportExcelWorkbook(`Leger_Semua_Mapel_${currentClass.code}_${activeSemester?.name || 'Semester'}`, [
      { sheetName: currentClass.code, data: rows },
    ]);
  };

  // Export ALL classes and ALL subjects in one comprehensive Excel workbook
  const handleExportAllClassesExcel = () => {
    const allActiveSubjects = subjects.filter(s => s.isActive);
    const sheets: { sheetName: string; data: Record<string, any>[] }[] = [];

    // 1. Master combined sheet of all active students across all classes
    const allActiveStudents = sortStudentsAlphabetically(
      students.filter(s => s.status === 'aktif')
    );

    const masterRows = allActiveStudents.map((st, idx) => {
      const sum = summaryMap.get(st.id);
      const stClass = classes.find(c => c.id === st.currentClassId);
      const row: Record<string, any> = {
        'No.': idx + 1,
        'NIS': st.nis,
        'NISN': st.nisn,
        'Nama Peserta Didik': st.name,
        'Kelas': stClass?.name || st.currentClassName || '-',
      };

      allActiveSubjects.forEach(sub => {
        const score = allSemesterGradesMap.get(`${st.id}_${sub.id}`);
        row[`${sub.code} - ${sub.name}`] = score !== undefined ? score : '';
      });

      row['Total Nilai'] = sum?.totalScore ? formatIndonesianNumber(sum.totalScore) : '-';
      row['Rata-Rata'] = sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-';
      row['Status'] = sum?.isComplete ? 'Lengkap' : 'Belum Lengkap';
      row['Peringkat Kelas'] = sum?.classRank ?? '-';
      row['Peringkat Paralel'] = sum?.parallelRank ?? '-';
      row['Peringkat Eligible'] = sum?.eligibleRank ?? st.eligibleRank ?? '-';

      return row;
    });

    sheets.push({ sheetName: 'Semua_Kelas_Gabungan', data: masterRows });

    // 2. Individual sheet per class
    classes.forEach(cls => {
      const clsStudents = sortStudentsAlphabetically(
        students.filter(s => s.currentClassId === cls.id && s.status === 'aktif')
      );
      const clsSubjects = allActiveSubjects.filter(
        sub => !sub.gradeLevel || sub.gradeLevel === 'Semua' || sub.gradeLevel === cls.gradeLevel
      );
      const subsToUse = clsSubjects.length > 0 ? clsSubjects : allActiveSubjects;

      const clsRows = clsStudents.map((st, idx) => {
        const sum = summaryMap.get(st.id);
        const row: Record<string, any> = {
          'No.': idx + 1,
          'NIS': st.nis,
          'NISN': st.nisn,
          'Nama Peserta Didik': st.name,
          'Kelas': cls.name,
        };

        subsToUse.forEach(sub => {
          const score = allSemesterGradesMap.get(`${st.id}_${sub.id}`);
          row[`${sub.code} - ${sub.name}`] = score !== undefined ? score : '';
        });

        row['Total Nilai'] = sum?.totalScore ? formatIndonesianNumber(sum.totalScore) : '-';
        row['Rata-Rata'] = sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-';
        row['Status'] = sum?.isComplete ? 'Lengkap' : 'Belum Lengkap';
        row['Peringkat Kelas'] = sum?.classRank ?? '-';
        row['Peringkat Paralel'] = sum?.parallelRank ?? '-';
        row['Peringkat Eligible'] = sum?.eligibleRank ?? st.eligibleRank ?? '-';

        return row;
      });

      if (clsRows.length > 0) {
        sheets.push({ sheetName: (cls.code || cls.name).substring(0, 31), data: clsRows });
      }
    });

    exportExcelWorkbook(`Rekap_Nilai_Semua_Mapel_Seluruh_Kelas_${activeSemester?.name || 'Semester'}`, sheets);
  };

  // Save inline table edits made by Admin across all subjects
  const handleSaveInlineTableGrades = async () => {
    if (!currentClass) return;

    const entriesToSave: Partial<GradeEntry>[] = [];
    let invalidFound = false;

    for (const st of classStudents) {
      for (const sub of displayedSubjects) {
        const key = `${st.id}_${sub.id}`;
        const rawStr = editedCells[key];
        if (rawStr === undefined || rawStr.trim() === '') continue;

        const num = parseFloat(rawStr.trim().replace(',', '.'));
        if (isNaN(num) || num < schoolSettings.minScore || num > schoolSettings.maxScore) {
          invalidFound = true;
          break;
        }

        const existingScore = gradesMap.get(key);
        if (existingScore !== num) {
          const assignment = teachingAssignments.find(
            a => a.classId === currentClass.id && a.subjectId === sub.id && a.isActive
          );

          entriesToSave.push({
            studentId: st.id,
            studentNis: st.nis,
            studentNisn: st.nisn,
            studentName: st.name,
            classId: currentClass.id,
            className: currentClass.name,
            subjectId: sub.id,
            subjectName: sub.name,
            teacherId: assignment?.teacherId || 'admin',
            teacherName: assignment?.teacherName || 'Admin Sekolah',
            academicYearId: activeSemester?.academicYearId || currentClass.academicYearId,
            semesterId: selectedSemesterId,
            finalScore: Math.round(num * 100) / 100,
            status: 'published',
          });
        }
      }
      if (invalidFound) break;
    }

    if (invalidFound) {
      setStatusMessage({
        type: 'error',
        text: `Terdapat nilai yang tidak valid. Pastikan seluruh nilai berupa angka antara ${schoolSettings.minScore} hingga ${schoolSettings.maxScore}.`,
      });
      return;
    }

    if (entriesToSave.length === 0) {
      setIsEditingTable(false);
      return;
    }

    await saveGradeEntries(entriesToSave, 'published');
    setIsEditingTable(false);
    setStatusMessage({
      type: 'success',
      text: `Berhasil menyimpan ${entriesToSave.length} perubahan nilai mata pelajaran pada kelas ${currentClass.name}!`,
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Download Multi-Subject Excel Template for Admin
  const handleDownloadMultiSubjectTemplate = (scope: 'selected_class' | 'all_classes') => {
    const targetClasses =
      scope === 'selected_class' && currentClass ? [currentClass] : classes.filter(c => c.isActive);

    downloadAllSubjectsTemplate({
      classes: targetClasses,
      students,
      subjects: displayedSubjects,
      semesterName: activeSemester?.name || 'Semester',
      existingGradesMap: allSemesterGradesMap,
      includeExistingScores: includeExistingInTemplate,
      fileNamePrefix: includeExistingInTemplate ? 'Data_Nilai_Semua_Mapel' : 'Template_Kosong_Semua_Mapel',
    });
  };

  // Handle Multi-Subject Excel file selection
  const handleMultiSubjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setStatusMessage(null);

    const allowedStudents =
      uploadTargetScope === 'selected_class' && currentClass
        ? students.filter(s => s.currentClassId === currentClass.id && s.status === 'aktif')
        : students.filter(s => s.status === 'aktif');

    try {
      const result = await parseAllSubjectsExcelFile(
        file,
        allowedStudents,
        subjects.filter(s => s.isActive),
        schoolSettings.minScore,
        schoolSettings.maxScore
      );
      setParsedMultiData(result);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal membaca berkas Excel: ' + (err.message || 'Format berkas tidak dikenali'),
      });
    }
    e.target.value = '';
  };

  // Confirm & Save all parsed multi-subject grades
  const handleConfirmMultiSubjectUpload = async () => {
    if (!parsedMultiData || parsedMultiData.totalGradeEntriesValid === 0) return;

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const entriesMap = new Map<string, Partial<GradeEntry>>();
      const subjectsById = new Map(subjects.map(s => [s.id, s]));

      parsedMultiData.rows.forEach(row => {
        const st = row.matchedStudent;
        if (!st) return;

        const stClass = classes.find(c => c.id === st.currentClassId);
        const classId = stClass?.id || st.currentClassId || selectedClassId;
        const className = stClass?.name || st.currentClassName || currentClass?.name || 'Kelas';

        Object.entries(row.scoresBySubjectId).forEach(([subjectId, score]) => {
          const sub = subjectsById.get(subjectId);
          if (!sub) return;

          const assignment = teachingAssignments.find(
            a => a.classId === classId && a.subjectId === subjectId && a.isActive
          );

          const entryKey = `${selectedSemesterId}_${classId}_${subjectId}_${st.id}`;
          entriesMap.set(entryKey, {
            id: entryKey,
            studentId: st.id,
            studentNis: st.nis,
            studentNisn: st.nisn,
            studentName: st.name,
            classId,
            className,
            subjectId: sub.id,
            subjectName: sub.name,
            teacherId: assignment?.teacherId || 'admin',
            teacherName: assignment?.teacherName || 'Admin Sekolah',
            academicYearId: activeSemester?.academicYearId || stClass?.academicYearId || '',
            semesterId: selectedSemesterId,
            finalScore: score,
            status: uploadStatusTarget,
          });
        });
      });

      const entriesToSave = Array.from(entriesMap.values());
      await saveGradeEntries(entriesToSave, uploadStatusTarget);

      setStatusMessage({
        type: 'success',
        text: `Berhasil mengunggah dan menyimpan ${entriesToSave.length} nilai mata pelajaran untuk ${parsedMultiData.totalStudentsMatched} peserta didik!`,
      });
      setParsedMultiData(null);
      setUploadedFileName('');
      setActiveMode('leger');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal menyimpan nilai unggahan: ' + (err.message || 'Kesalahan jaringan'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Top Header (Hidden during print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>
              {isAdmin
                ? 'Rekap, Unggah & Ekspor Nilai Semua Mapel (Leger Lengkap)'
                : 'Rekap Nilai Akademik Seluruh Kelas (Leger Lengkap)'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Kelola leger nilai seluruh mata pelajaran, ekspor Excel per kelas/seluruh kelas, atau unggah nilai semua mapel sekaligus'
              : 'Daftar nilai akhir setiap mata pelajaran, kalkulasi rata-rata semester, dan peringkat kelas'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveMode('leger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeMode === 'leger'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Tabel Leger & Ekspor</span>
              </button>
              <button
                onClick={() => setActiveMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeMode === 'upload'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Excel Semua Mapel</span>
              </button>
            </div>
          )}

          <button
            onClick={handleExportCurrentClassExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            title="Ekspor nilai semua mapel untuk kelas yang sedang dipilih"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Kelas Ini</span>
          </button>

          <button
            onClick={handleExportAllClassesExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
            title="Ekspor nilai semua mapel untuk seluruh kelas sekaligus dalam 1 file Excel"
          >
            <Layers className="w-4 h-4" />
            <span>Ekspor Semua Kelas & Mapel</span>
          </button>

          {activeMode === 'leger' && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 no-print ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* MODE 2: ADMIN MULTI-SUBJECT EXCEL UPLOAD PANEL */}
      {activeMode === 'upload' && isAdmin && (
        <div className="space-y-5 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Fitur Khusus Administrator</span>
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Unggah (Impor) & Unduh Template Nilai Semua Mata Pelajaran (.xlsx)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin dapat mengunduh template leger berisi seluruh kolom mata pelajaran, mengisi/mengedit nilai di Excel, lalu mengunggahnya kembali sekaligus.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDownloadMultiSubjectTemplate('selected_class')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Template Kelas {currentClass?.name}</span>
                </button>
                <button
                  onClick={() => handleDownloadMultiSubjectTemplate('all_classes')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Template Seluruh Kelas (Multi-Sheet)</span>
                </button>
              </div>
            </div>

            {/* Upload Configuration Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Periode Semester Tujuan
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={e => {
                    setSelectedSemesterId(e.target.value);
                    setParsedMultiData(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Cakupan Kelas Saat Unggah
                </label>
                <select
                  value={uploadTargetScope}
                  onChange={e => {
                    setUploadTargetScope(e.target.value as 'selected_class' | 'all_classes');
                    setParsedMultiData(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all_classes">Semua Kelas (Deteksi Otomatis NIS / NISN)</option>
                  <option value="selected_class">Hanya Kelas Terpilih ({currentClass?.name})</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Status Nilai Hasil Unggahan
                </label>
                <select
                  value={uploadStatusTarget}
                  onChange={e => setUploadStatusTarget(e.target.value as GradeStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="published">Langsung Dipublikasikan (Tampil di Portal Siswa)</option>
                  <option value="final">Disahkan / Final (Siap Publikasi)</option>
                  <option value="submitted">Menunggu Verifikasi (Submitted)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeExistingInTemplate}
                  onChange={e => setIncludeExistingInTemplate(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  Sertakan nilai yang sudah tersimpan saat mengunduh Template Excel (memudahkan pelengkapan nilai kosong)
                </span>
              </label>
              <span className="text-[11px] text-slate-400">
                Format header mapel yang didukung: <strong>KODE - Nama Mapel</strong>, <strong>KODE</strong>, atau <strong>Nama Mapel</strong>
              </span>
            </div>

            {/* File Dropzone */}
            {!parsedMultiData && (
              <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-2xl p-8 text-center hover:border-purple-400 transition">
                <FileSpreadsheet className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pilih Berkas Excel Nilai Semua Mata Pelajaran (.xlsx / .xls)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Sistem akan otomatis membaca seluruh kolom mata pelajaran dan mencocokkan peserta didik berdasarkan <strong>NIS</strong> atau <strong>NISN</strong>. Sel kosong akan dilewati (tidak dianggap 0).
                </p>

                <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-900/20 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Pilih Berkas Excel untuk Diunggah</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleMultiSubjectFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Preview of Parsed Multi-Subject Excel */}
            {parsedMultiData && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Pratinjau Berkas: {uploadedFileName}</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Terdeteksi <strong>{parsedMultiData.detectedSubjects.length} Mata Pelajaran</strong> •{' '}
                      <strong>{parsedMultiData.totalStudentsMatched} Siswa Cocok</strong> •{' '}
                      <strong className="text-emerald-400">{parsedMultiData.totalGradeEntriesValid} Nilai Sah Siap Disimpan</strong>
                      {parsedMultiData.totalErrors > 0 && (
                        <span className="text-rose-400 ml-2">
                          ({parsedMultiData.totalErrors} peringatan/kesalahan)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setParsedMultiData(null);
                        setUploadedFileName('');
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ganti Berkas</span>
                    </button>

                    <button
                      onClick={handleConfirmMultiSubjectUpload}
                      disabled={isImporting || parsedMultiData.totalGradeEntriesValid === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold transition shadow-md cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {isImporting
                          ? 'Menyimpan...'
                          : `Simpan Semua Nilai (${parsedMultiData.totalGradeEntriesValid} Entri)`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Matrix Preview Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      <tr className="text-[10px] font-bold uppercase text-slate-700">
                        <th className="py-2.5 px-2 border-r border-slate-200">Sheet</th>
                        <th className="py-2.5 px-2 border-r border-slate-200">NIS</th>
                        <th className="py-2.5 px-2 border-r border-slate-200">NISN</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Nama Peserta Didik</th>
                        <th className="py-2.5 px-2 border-r border-slate-200">Kelas</th>
                        {parsedMultiData.detectedSubjects.map(sub => (
                          <th
                            key={sub.id}
                            className="py-2.5 px-2 text-center border-r border-slate-200"
                            title={sub.name}
                          >
                            {sub.code}
                          </th>
                        ))}
                        <th className="py-2.5 px-3">Keterangan Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedMultiData.rows.map((row, rIdx) => (
                        <tr
                          key={`${row.sheetName}_${row.rowNumber}_${rIdx}`}
                          className={row.rawErrors.length > 0 ? 'bg-rose-50/50' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-2 font-mono text-[10px] text-slate-500 border-r border-slate-100">
                            {row.sheetName}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-700 border-r border-slate-100">
                            {row.nis}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-700 border-r border-slate-100">
                            {row.nisn}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100">
                            {row.name}
                          </td>
                          <td className="py-2 px-2 text-slate-600 border-r border-slate-100">
                            {row.className}
                          </td>
                          {parsedMultiData.detectedSubjects.map(sub => {
                            const val = row.scoresBySubjectId[sub.id];
                            return (
                              <td
                                key={sub.id}
                                className="py-2 px-2 text-center font-mono border-r border-slate-100"
                              >
                                {val !== undefined ? (
                                  <span className="font-bold text-slate-900">{formatIndonesianNumber(val)}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3">
                            {row.rawErrors.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Siap Impor ({Object.keys(row.scoresBySubjectId).length} mapel)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-700">
                                {row.rawErrors.join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 1: LEGER TABLE, FILTERS & INLINE ADMIN EDIT */}
      {activeMode === 'leger' && (
        <>
          {/* Class Selector, Subject Scope, Inline Edit & Search (Hidden during print) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Pilih Kelas:</span>
                <select
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    setIsEditingTable(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.major})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Tampilan Mapel:</span>
                <select
                  value={subjectScope}
                  onChange={e => setSubjectScope(e.target.value as 'grade_level' | 'all')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">Semua Mata Pelajaran ({subjects.filter(s => s.isActive).length})</option>
                  <option value="grade_level">Sesuai Tingkat Kelas {currentClass?.gradeLevel}</option>
                </select>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  {!isEditingTable ? (
                    <button
                      onClick={() => setIsEditingTable(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Input / Edit Nilai di Tabel</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveInlineTableGrades}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSyncing ? 'Menyimpan...' : 'Simpan Nilai Tabel'}</span>
                      </button>
                      <button
                        onClick={() => setIsEditingTable(false)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari siswa dalam kelas..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Document / Table Container (Formatted for both screen & official print) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print-page">
            {/* Official Letterhead Header for print */}
            <PrintHeader
              documentTitle={`BUKU REKAPITULASI NILAI AKADEMIK PESERTA DIDIK`}
              subTitle={`Kelas: ${currentClass?.name || ''} | Tahun Pelajaran: ${schoolSettings.schoolName} | ${activeSemester?.name || ''}`}
            />

            {/* Identity block for print & screen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4 pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Rombongan Belajar:</span>
                <strong className="text-slate-900">{currentClass?.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tingkat / Jurusan:</span>
                <strong className="text-slate-900">
                  Kelas {currentClass?.gradeLevel} • {currentClass?.major}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Wali Kelas:</span>
                <strong className="text-slate-900">{currentClass?.homeroomTeacherName || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Jumlah Siswa:</span>
                <strong className="text-slate-900">{classStudents.length} Peserta Didik</strong>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300 print-table">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">No.</th>
                    <th className="py-2.5 px-2 w-20 border-r border-slate-300">NIS</th>
                    <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-300">Nama Siswa (A-Z)</th>
                    {displayedSubjects.map(sub => (
                      <th
                        key={sub.id}
                        className="py-2.5 px-2 text-center border-r border-slate-300"
                        title={`${sub.code} - ${sub.name}`}
                      >
                        {sub.code}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 text-center bg-blue-50/70 border-r border-slate-300">Rata-Rata</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-300">Status</th>
                    <th className="py-2.5 px-2 text-center bg-amber-50/70">Peringkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classStudents.map((st, idx) => {
                    const sum = summaryMap.get(st.id);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-700 border-r border-slate-200">
                          {st.nis}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 truncate max-w-[180px]">
                          {st.name}
                        </td>
                        {displayedSubjects.map(sub => {
                          const cellKey = `${st.id}_${sub.id}`;
                          const score = gradesMap.get(cellKey);
                          return (
                            <td
                              key={sub.id}
                              className="py-1.5 px-1.5 text-center font-mono text-slate-800 border-r border-slate-200"
                            >
                              {isEditingTable ? (
                                <input
                                  type="number"
                                  min={schoolSettings.minScore}
                                  max={schoolSettings.maxScore}
                                  step="0.01"
                                  value={editedCells[cellKey] ?? ''}
                                  onChange={e =>
                                    setEditedCells(prev => ({
                                      ...prev,
                                      [cellKey]: e.target.value,
                                    }))
                                  }
                                  placeholder="-"
                                  className="w-14 py-1 px-1 text-center text-xs font-bold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              ) : score !== undefined ? (
                                formatIndonesianNumber(score)
                              ) : (
                                <span className="text-slate-300 italic">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center font-mono font-extrabold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                          {sum?.averageScore ? formatIndonesianNumber(sum.averageScore) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          {sum?.isComplete ? (
                            <span className="text-[10px] font-bold text-emerald-700">Lengkap</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600">Belum Lengkap</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/30">
                          {sum?.classRank ? (
                            <span className="inline-flex items-center gap-1 justify-center">
                              <Award className="w-3 h-3 text-amber-500" />
                              <span>{sum.classRank}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Signatures Section (Visible in Print & Screen) */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
              <div className="text-center">
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-semibold text-slate-900">Kepala {schoolSettings.schoolName}</p>
                <div className="h-20 flex items-end justify-center">
                  <span className="font-bold underline text-slate-950">{schoolSettings.principalName}</span>
                </div>
                <p className="text-[11px] text-slate-600">NIP. {schoolSettings.principalNip}</p>
              </div>

              <div className="text-center">
                <p className="text-slate-500">
                  {schoolSettings.city}, {formatIndonesianDate(new Date())}
                </p>
                <p className="font-semibold text-slate-900">Wali Kelas {currentClass?.name}</p>
                <div className="h-20 flex items-end justify-center">
                  <span className="font-bold underline text-slate-950">
                    {currentClass?.homeroomTeacherName || '...........................................'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">NIP. ...........................................</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
