import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Filter,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users,
  Search,
  CheckSquare,
  Square,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Subject } from '../../types';
import { isSubjectApplicableToClass, sortSubjects, sortStudentsAlphabetically } from '../../lib/utils';

export const SubjectManagement: React.FC = () => {
  const { subjects, classes, students, saveSubject, saveSubjectsOrder, deleteSubject, isSyncing } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [classScopeMode, setClassScopeMode] = useState<'by_grade' | 'specific_classes' | 'by_students'>('by_grade');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmSubject, setDeleteConfirmSubject] = useState<Subject | null>(null);

  // Filters inside the student picker (for Mapel Peminatan per Nama Peserta Didik)
  const [studentPickerClassFilter, setStudentPickerClassFilter] = useState<string>('ALL');
  const [studentPickerGradeFilter, setStudentPickerGradeFilter] = useState<string>('ALL');
  const [studentPickerSearch, setStudentPickerSearch] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Subject>>({
    code: '',
    name: '',
    category: 'Kelompok A (Umum)',
    gradeLevel: 'Semua',
    targetClassIds: [],
    targetStudentIds: [],
    sortOrder: 1,
    isMandatory: true,
    weight: 1,
    isActive: true,
  });

  // Sorted master subjects list
  const orderedSubjects = useMemo(() => sortSubjects(subjects), [subjects]);

  // Active students map for quick lookup
  const studentsById = useMemo(() => {
    const map = new Map<string, (typeof students)[0]>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  // Group classes by gradeLevel for clean selection in modal
  const classesByGrade = useMemo(() => {
    const groups: Record<string, typeof classes> = {};
    classes.forEach(cls => {
      const g = cls.gradeLevel || 'Lainnya';
      if (!groups[g]) groups[g] = [];
      groups[g].push(cls);
    });
    return groups;
  }, [classes]);

  // Filtered students inside the modal for 'by_students' mode (sorted A-Z by name)
  const pickerStudents = useMemo(() => {
    let list = students.filter(s => s.status === 'aktif');

    if (studentPickerGradeFilter !== 'ALL') {
      const allowedClassIds = new Set(
        classes.filter(c => c.gradeLevel === studentPickerGradeFilter).map(c => c.id)
      );
      list = list.filter(s => allowedClassIds.has(s.currentClassId));
    }

    if (studentPickerClassFilter !== 'ALL') {
      list = list.filter(s => s.currentClassId === studentPickerClassFilter);
    }

    if (studentPickerSearch.trim()) {
      const q = studentPickerSearch.toLowerCase().trim();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          (s.currentClassName || '').toLowerCase().includes(q)
      );
    }

    return sortStudentsAlphabetically(list);
  }, [students, classes, studentPickerGradeFilter, studentPickerClassFilter, studentPickerSearch]);

  const filteredSubjects = useMemo(() => {
    return orderedSubjects.filter(subj => {
      if (filterGrade !== 'ALL') {
        const gradeClasses = classes.filter(c => c.gradeLevel === filterGrade);
        if (gradeClasses.length > 0) {
          if (
            !gradeClasses.some(c =>
              isSubjectApplicableToClass(
                subj,
                c,
                students.filter(st => st.currentClassId === c.id)
              )
            )
          ) {
            return false;
          }
        } else if (subj.gradeLevel !== 'Semua' && !String(subj.gradeLevel).split(',').includes(filterGrade)) {
          return false;
        }
      }

      if (filterClassId !== 'ALL') {
        const cls = classes.find(c => c.id === filterClassId);
        const clsStudents = students.filter(st => st.currentClassId === filterClassId);
        if (cls && !isSubjectApplicableToClass(subj, cls, clsStudents)) {
          return false;
        }
      }

      return true;
    });
  }, [orderedSubjects, classes, students, filterGrade, filterClassId]);

  const handleOpenAdd = (initialMode: 'by_grade' | 'specific_classes' | 'by_students' = 'by_grade') => {
    setEditingSubject(null);
    setFormError(null);
    setClassScopeMode(initialMode);
    setStudentPickerClassFilter('ALL');
    setStudentPickerGradeFilter(initialMode === 'by_students' ? '11' : 'ALL');
    setStudentPickerSearch('');
    setFormData({
      code: '',
      name: '',
      category: initialMode === 'by_students' ? 'Kelompok C (Peminatan)' : 'Kelompok A (Umum)',
      gradeLevel: initialMode === 'by_students' ? '11' : 'Semua',
      targetClassIds: [],
      targetStudentIds: [],
      sortOrder: orderedSubjects.length + 1,
      isMandatory: initialMode !== 'by_students',
      weight: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (
    s: Subject,
    fallbackIndex: number,
    forceMode?: 'by_grade' | 'specific_classes' | 'by_students'
  ) => {
    setEditingSubject(s);
    setFormError(null);
    setStudentPickerClassFilter('ALL');
    setStudentPickerGradeFilter('ALL');
    setStudentPickerSearch('');

    const hasSpecificStudents = Boolean(s.targetStudentIds && s.targetStudentIds.length > 0);
    const hasSpecificClasses = Boolean(s.targetClassIds && s.targetClassIds.length > 0);

    if (forceMode) {
      setClassScopeMode(forceMode);
    } else if (hasSpecificStudents) {
      setClassScopeMode('by_students');
    } else if (hasSpecificClasses) {
      setClassScopeMode('specific_classes');
    } else {
      setClassScopeMode('by_grade');
    }

    setFormData({
      ...s,
      targetClassIds: s.targetClassIds || [],
      targetStudentIds: s.targetStudentIds || [],
      sortOrder: s.sortOrder ?? fallbackIndex + 1,
    });
    setIsModalOpen(true);
  };

  // Move a subject up or down in the global column order
  const handleMoveSubject = async (subjectId: string, direction: 'up' | 'down') => {
    const currentIndex = orderedSubjects.findIndex(s => s.id === subjectId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedSubjects.length) return;

    const newList = [...orderedSubjects];
    const [moved] = newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, moved);

    await saveSubjectsOrder(newList);
    setOrderNotice(`Urutan kolom "${moved.name}" dipindahkan ke posisi Kolom #${targetIndex + 1}.`);
    setTimeout(() => setOrderNotice(null), 3500);
  };

  // Change exact position number directly from table input
  const handleDirectOrderChange = async (subjectId: string, newPositionOneBased: number) => {
    const currentIndex = orderedSubjects.findIndex(s => s.id === subjectId);
    if (currentIndex === -1) return;

    const clampedIndex = Math.max(0, Math.min(orderedSubjects.length - 1, newPositionOneBased - 1));
    if (clampedIndex === currentIndex) return;

    const newList = [...orderedSubjects];
    const [moved] = newList.splice(currentIndex, 1);
    newList.splice(clampedIndex, 0, moved);

    await saveSubjectsOrder(newList);
    setOrderNotice(`Urutan kolom "${moved.name}" diatur ke Kolom #${clampedIndex + 1}.`);
    setTimeout(() => setOrderNotice(null), 3500);
  };

  // Auto-sort by curriculum category (Kelompok A -> B -> C -> Muatan Lokal) or Alphabetical
  const handleAutoSortSubjects = async (mode: 'curriculum' | 'alphabet') => {
    const categoryRank: Record<string, number> = {
      'Kelompok A (Umum)': 1,
      'Kelompok B (Umum)': 2,
      'Kelompok C (Peminatan)': 3,
      'Muatan Lokal': 4,
    };

    const sorted = [...orderedSubjects].sort((a, b) => {
      if (mode === 'curriculum') {
        const catA = categoryRank[a.category] ?? 99;
        const catB = categoryRank[b.category] ?? 99;
        if (catA !== catB) return catA - catB;
      }
      return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });

    await saveSubjectsOrder(sorted);
    setOrderNotice(
      mode === 'curriculum'
        ? 'Berhasil mengurutkan kolom mata pelajaran sesuai Kelompok Kurikulum (A → B → C → Muatan Lokal)!'
        : 'Berhasil mengurutkan kolom mata pelajaran sesuai Abjad Nama (A–Z)!'
    );
    setTimeout(() => setOrderNotice(null), 4000);
  };

  const handleToggleClassId = (classId: string) => {
    const current = formData.targetClassIds || [];
    const next = current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId];

    let inferredGrade = formData.gradeLevel || 'Semua';
    if (next.length > 0) {
      const selectedClassObjs = classes.filter(c => next.includes(c.id));
      const uniqueGrades = Array.from(new Set(selectedClassObjs.map(c => c.gradeLevel)));
      inferredGrade = uniqueGrades.length === 1 ? uniqueGrades[0] : 'Semua';
    }

    setFormData({
      ...formData,
      targetClassIds: next,
      gradeLevel: inferredGrade,
    });
  };

  const handleSelectAllClassesInGrade = (grade: string) => {
    const gradeClassIds = (classesByGrade[grade] || []).map(c => c.id);
    const current = new Set(formData.targetClassIds || []);
    const allAlreadySelected = gradeClassIds.every(id => current.has(id));

    if (allAlreadySelected) {
      gradeClassIds.forEach(id => current.delete(id));
    } else {
      gradeClassIds.forEach(id => current.add(id));
    }

    const next = Array.from(current);
    let inferredGrade = formData.gradeLevel || 'Semua';
    if (next.length > 0) {
      const selectedClassObjs = classes.filter(c => next.includes(c.id));
      const uniqueGrades = Array.from(new Set(selectedClassObjs.map(c => c.gradeLevel)));
      inferredGrade = uniqueGrades.length === 1 ? uniqueGrades[0] : 'Semua';
    }

    setFormData({
      ...formData,
      targetClassIds: next,
      gradeLevel: inferredGrade,
    });
  };

  // Toggle individual student in 'by_students' mode
  const handleToggleStudentId = (studentId: string) => {
    const current = formData.targetStudentIds || [];
    const next = current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId];

    setFormData({
      ...formData,
      targetStudentIds: next,
    });
  };

  // Select / deselect all currently filtered students in picker
  const handleToggleAllVisibleStudents = () => {
    const visibleIds = pickerStudents.map(s => s.id);
    if (visibleIds.length === 0) return;

    const currentSet = new Set(formData.targetStudentIds || []);
    const allVisibleSelected = visibleIds.every(id => currentSet.has(id));

    if (allVisibleSelected) {
      visibleIds.forEach(id => currentSet.delete(id));
    } else {
      visibleIds.forEach(id => currentSet.add(id));
    }

    setFormData({
      ...formData,
      targetStudentIds: Array.from(currentSet),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.code || !formData.name) return;

    let finalTargetClassIds: string[] = [];
    let finalTargetStudentIds: string[] = [];
    let finalGradeLevel = formData.gradeLevel || 'Semua';

    if (classScopeMode === 'by_students') {
      finalTargetStudentIds = formData.targetStudentIds || [];
      if (finalTargetStudentIds.length === 0) {
        setFormError(
          'Pilih minimal 1 nama peserta didik yang mempelajari Mata Pelajaran Peminatan ini, atau ubah mode pengaturan cakupan.'
        );
        return;
      }

      // Automatically derive targetClassIds and gradeLevel from selected students
      const studentClassesSet = new Set<string>();
      finalTargetStudentIds.forEach(stId => {
        const st = studentsById.get(stId);
        if (st?.currentClassId) {
          studentClassesSet.add(st.currentClassId);
        }
      });
      finalTargetClassIds = Array.from(studentClassesSet);

      if (finalTargetClassIds.length > 0) {
        const selectedClassObjs = classes.filter(c => finalTargetClassIds.includes(c.id));
        const uniqueGrades = Array.from(new Set(selectedClassObjs.map(c => c.gradeLevel))).sort();
        finalGradeLevel = uniqueGrades.length === 1 ? uniqueGrades[0] : uniqueGrades.join(',');
      }
    } else if (classScopeMode === 'specific_classes') {
      finalTargetClassIds = formData.targetClassIds || [];
      if (finalTargetClassIds.length === 0) {
        setFormError(
          'Pilih minimal 1 kelas spesifik (misal XI-D), atau ubah opsi ke "Semua Rombel per Tingkat Kelas".'
        );
        return;
      }
      const selectedClassObjs = classes.filter(c => finalTargetClassIds.includes(c.id));
      const uniqueGrades = Array.from(new Set(selectedClassObjs.map(c => c.gradeLevel))).sort();
      finalGradeLevel = uniqueGrades.length === 1 ? uniqueGrades[0] : uniqueGrades.join(',');
      finalTargetStudentIds = [];
    } else {
      finalTargetClassIds = [];
      finalTargetStudentIds = [];
    }

    const desiredSortOrder = Number(formData.sortOrder) || orderedSubjects.length + 1;

    const subjectToSave: Subject = {
      id: editingSubject ? editingSubject.id : 'subj_' + Date.now(),
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      category: formData.category as any,
      gradeLevel: finalGradeLevel,
      targetClassIds: finalTargetClassIds,
      targetStudentIds: finalTargetStudentIds,
      sortOrder: desiredSortOrder,
      isMandatory: formData.isMandatory ?? true,
      weight: Number(formData.weight) || 1,
      isActive: formData.isActive ?? true,
    };

    await saveSubject(subjectToSave);
    setIsModalOpen(false);
    setOrderNotice(
      finalTargetStudentIds.length > 0
        ? `Mata pelajaran "${subjectToSave.name}" berhasil disimpan untuk ${finalTargetStudentIds.length} peserta didik terpilih!`
        : `Mata pelajaran "${subjectToSave.name}" berhasil disimpan!`
    );
    setTimeout(() => setOrderNotice(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmSubject) return;
    await deleteSubject(deleteConfirmSubject.id);
    setDeleteConfirmSubject(null);
  };

  const renderSubjectClassDetails = (subj: Subject, globalIdx: number) => {
    const matchedClasses = classes.filter(c =>
      isSubjectApplicableToClass(
        subj,
        c,
        students.filter(st => st.currentClassId === c.id)
      )
    );
    const hasGrade10 = matchedClasses.some(c => c.gradeLevel === '10');
    const isPeminatanCategory = subj.category === 'Kelompok C (Peminatan)' || !subj.isMandatory;

    // 1. Subject configured by specific student names (Mata Pelajaran Peminatan per Peserta Didik)
    if (subj.targetStudentIds && subj.targetStudentIds.length > 0) {
      const assignedStudents = sortStudentsAlphabetically(
        subj.targetStudentIds
          .map(id => studentsById.get(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
      );
      const previewNames = assignedStudents
        .slice(0, 3)
        .map(s => `${s.name} (${s.currentClassName.replace('Kelas ', '')})`)
        .join(', ');

      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
              <UserCheck className="w-3 h-3 text-purple-700" />
              <span>Khusus {assignedStudents.length} Peserta Didik (Peminatan)</span>
            </span>
            {!hasGrade10 && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Tidak Ada di Kelas X
              </span>
            )}
          </div>

          {assignedStudents.length > 0 && (
            <p className="text-[10px] text-slate-600 leading-snug max-w-[300px]" title={assignedStudents.map(s => `${s.name} (${s.currentClassName})`).join(', ')}>
              <strong className="text-slate-800">Siswa:</strong> {previewNames}
              {assignedStudents.length > 3 && (
                <span className="text-purple-700 font-bold"> +{assignedStudents.length - 3} siswa lainnya</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1">
            {matchedClasses.map(cls => (
              <span
                key={cls.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
              >
                {cls.code || cls.name}
              </span>
            ))}
            <button
              type="button"
              onClick={() => handleOpenEdit(subj, globalIdx, 'by_students')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer shadow-2xs"
            >
              <Users className="w-2.5 h-2.5" />
              <span>Ubah Daftar Siswa</span>
            </button>
          </div>
        </div>
      );
    }

    // 2. Subject configured by specific classes
    if (subj.targetClassIds && subj.targetClassIds.length > 0) {
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Khusus {matchedClasses.length} Kelas Tertentu
            </span>
            {!hasGrade10 && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Tidak Ada di Kelas X
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {matchedClasses.map(cls => (
              <span
                key={cls.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-600 text-white shadow-2xs"
              >
                {cls.code || cls.name}
              </span>
            ))}
            {isPeminatanCategory && (
              <button
                type="button"
                onClick={() => handleOpenEdit(subj, globalIdx, 'by_students')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                title="Atur mata pelajaran peminatan ini berdasarkan nama peserta didik"
              >
                <Users className="w-2.5 h-2.5" />
                <span>Atur per Nama Siswa</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // 3. Subject for all grade levels
    if (subj.gradeLevel === 'Semua' || !subj.gradeLevel) {
      const allCodes = classes.map(c => c.code).join(', ');
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Semua Tingkat (Seluruh Kelas)
            </span>
            {isPeminatanCategory && (
              <button
                type="button"
                onClick={() => handleOpenEdit(subj, globalIdx, 'by_students')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
              >
                <Users className="w-2.5 h-2.5" />
                <span>Atur per Nama Siswa</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[240px]" title={allCodes}>
            {classes.length} Rombel ({allCodes})
          </p>
        </div>
      );
    }

    // 4. Subject by grade level (e.g. 11,12)
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Kelas Tingkat {subj.gradeLevel.replace(',', ' & ')}
          </span>
          {!hasGrade10 && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Tidak Ada di Kelas X
            </span>
          )}
        </div>
        {matchedClasses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {matchedClasses.map(cls => (
              <span
                key={cls.id}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
              >
                {cls.code}
              </span>
            ))}
            {isPeminatanCategory && (
              <button
                type="button"
                onClick={() => handleOpenEdit(subj, globalIdx, 'by_students')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
              >
                <Users className="w-2.5 h-2.5" />
                <span>Atur per Nama Siswa</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            <span>Manajemen Mata Pelajaran & Peminatan Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur daftar mata pelajaran, urutan kolom rekap nilai, detail rombel, serta pengaturan Mata Pelajaran Peminatan berdasarkan nama peserta didik
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAdd('by_students')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-900/20 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Tambah Mapel Peminatan (Per Siswa)</span>
          </button>

          <button
            onClick={() => handleOpenAdd('by_grade')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mata Pelajaran</span>
          </button>
        </div>
      </div>

      {orderNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>✓ {orderNotice}</span>
          <button onClick={() => setOrderNotice(null)} className="text-[11px] underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Filter Bar & Quick Column Ordering Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">Tingkat:</span>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="10">Kelas 10 (X)</option>
              <option value="11">Kelas 11 (XI)</option>
              <option value="12">Kelas 12 (XII)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-slate-600">Cek Mapel di Kelas:</span>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas / Rombel</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-600" />
            <span>Urutkan Kolom Otomatis:</span>
          </span>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleAutoSortSubjects('curriculum')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-[11px] transition cursor-pointer"
            title="Urutkan otomatis berdasarkan Kelompok A, B, C, lalu Muatan Lokal"
          >
            Sesuai Kelompok Kurikulum
          </button>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleAutoSortSubjects('alphabet')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[11px] transition cursor-pointer"
            title="Urutkan otomatis berdasarkan Abjad Nama Mata Pelajaran (A-Z)"
          >
            Sesuai Abjad (A–Z)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="block sm:hidden px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
          ↔ Geser ke kanan/kiri untuk melihat kolom & tombol pengatur urutan
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-36 text-center">Urutan Kolom Rekap</th>
                <th className="py-3 px-3 w-24">Kode</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Dipelajari di Kelas / Peserta Didik Peminatan</th>
                <th className="py-3 px-3 text-center">Sifat</th>
                <th className="py-3 px-3 text-center">Bobot</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.map((subj) => {
                const globalIdx = orderedSubjects.findIndex(s => s.id === subj.id);
                const posNumber = globalIdx !== -1 ? globalIdx + 1 : 1;
                return (
                  <tr key={subj.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={posNumber}
                          disabled={isSyncing}
                          onChange={(e) => handleDirectOrderChange(subj.id, Number(e.target.value))}
                          title="Pilih nomor urutan kolom pada rekap nilai"
                          className="px-2 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 font-mono font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                        >
                          {orderedSubjects.map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Kolom #{i + 1}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={globalIdx <= 0 || isSyncing}
                            onClick={() => handleMoveSubject(subj.id, 'up')}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-25 cursor-pointer"
                            title="Geser kolom ke kiri / atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={globalIdx === -1 || globalIdx >= orderedSubjects.length - 1 || isSyncing}
                            onClick={() => handleMoveSubject(subj.id, 'down')}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-25 cursor-pointer"
                            title="Geser kolom ke kanan / bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{subj.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{subj.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          subj.category === 'Kelompok C (Peminatan)'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'text-slate-600'
                        }`}
                      >
                        {subj.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">{renderSubjectClassDetails(subj, globalIdx)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          subj.isMandatory
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {subj.isMandatory ? 'Wajib' : 'Peminatan / Pilihan'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">{subj.weight}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(subj, globalIdx, 'by_students')}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                          title="Atur Peserta Didik yang Mengambil Mata Pelajaran Ini"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(subj, globalIdx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                          title="Ubah Mapel, Urutan & Detail Kelas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmSubject(subj)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Mapel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Mata Pelajaran?</h3>
                <p className="text-xs text-slate-500">
                  Anda akan menghapus <strong>{deleteConfirmSubject.name}</strong> ({deleteConfirmSubject.code}).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSubject(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
              >
                Ya, Hapus Mapel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingSubject ? 'Ubah Mata Pelajaran & Pengaturan Peminatan' : 'Tambah Mata Pelajaran Baru'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Atur identitas mata pelajaran, urutan kolom di rekap nilai, serta kelas atau daftar nama peserta didik yang mempelajari
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    placeholder="BJP, BIO"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biologi Peminatan / Bahasa Jepang"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">No. Urut Kolom *</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formData.sortOrder ?? 1}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-cyan-900 bg-cyan-50/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelompok / Kategori *</label>
                  <select
                    value={formData.category || 'Kelompok A (Umum)'}
                    onChange={(e) => {
                      const nextCat = e.target.value as any;
                      setFormData({
                        ...formData,
                        category: nextCat,
                        isMandatory: nextCat === 'Kelompok C (Peminatan)' ? false : formData.isMandatory,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  >
                    <option value="Kelompok A (Umum)">Kelompok A (Umum)</option>
                    <option value="Kelompok B (Umum)">Kelompok B (Umum)</option>
                    <option value="Kelompok C (Peminatan)">Kelompok C (Peminatan)</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bobot Nilai / SKS *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.weight || 1}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Detailed Class & Student Assignment Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Pengaturan Kelas / Peserta Didik yang Mempelajari Mata Pelajaran Ini *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih cakupan berdasarkan tingkat kelas, rombel spesifik, atau <strong>berdasarkan nama peserta didik</strong> (khusus Mata Pelajaran Peminatan / Pilihan).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl font-bold text-[11px]">
                  <button
                    type="button"
                    onClick={() => setClassScopeMode('by_grade')}
                    className={`py-2 px-2.5 rounded-lg transition cursor-pointer text-center ${
                      classScopeMode === 'by_grade'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Tingkat Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if ((formData.targetClassIds || []).length === 0) {
                        const prematched = classes
                          .filter(c =>
                            isSubjectApplicableToClass(
                              {
                                id: 'temp',
                                code: formData.code || '',
                                name: formData.name || '',
                                category: (formData.category as any) || 'Kelompok A (Umum)',
                                gradeLevel: formData.gradeLevel || 'Semua',
                                targetClassIds: [],
                                isMandatory: true,
                                weight: 1,
                                isActive: true,
                              },
                              c
                            )
                          )
                          .map(c => c.id);
                        setFormData(prev => ({ ...prev, targetClassIds: prematched }));
                      }
                      setClassScopeMode('specific_classes');
                    }}
                    className={`py-2 px-2.5 rounded-lg transition cursor-pointer text-center ${
                      classScopeMode === 'specific_classes'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pilih Rombel Spesifik
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassScopeMode('by_students')}
                    className={`py-2 px-2.5 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                      classScopeMode === 'by_students'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-purple-800 hover:bg-purple-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Per Nama Siswa (Peminatan)</span>
                  </button>
                </div>

                {/* MODE 1: BY GRADE */}
                {classScopeMode === 'by_grade' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pilih Tingkat Kelas *
                    </label>
                    <select
                      value={formData.gradeLevel || 'Semua'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gradeLevel: e.target.value,
                          targetClassIds: [],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                    >
                      <option value="Semua">Semua Tingkat (Seluruh Kelas X, XI, XII)</option>
                      <option value="10">Hanya Kelas 10 / X (Fase E / X-A s.d. X-E)</option>
                      <option value="11">Hanya Kelas 11 / XI (Fase F / XI-A s.d. XI-E)</option>
                      <option value="12">Hanya Kelas 12 / XII (Fase F / XII-A s.d. XII-E)</option>
                      <option value="11,12">Kelas 11 & 12 — Fase F (Tidak Ada di Kelas X)</option>
                      <option value="10,11">Kelas 10 & 11 (Tidak Ada di Kelas XII)</option>
                    </select>
                  </div>
                )}

                {/* MODE 2: SPECIFIC CLASSES */}
                {classScopeMode === 'specific_classes' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Centang Kelas yang Mempelajari Mapel Ini ({formData.targetClassIds?.length || 0} Kelas Dipilih):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nonGrade10Ids = classes
                              .filter(c => c.gradeLevel !== '10')
                              .map(c => c.id);
                            setFormData({
                              ...formData,
                              targetClassIds: nonGrade10Ids,
                              gradeLevel: '11,12',
                            });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold cursor-pointer"
                        >
                          Hanya Kelas XI & XII (Tanpa Kelas X)
                        </button>
                        {(formData.targetClassIds?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, targetClassIds: [] })}
                            className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                          >
                            Reset Pilihan
                          </button>
                        )}
                      </div>
                    </div>

                    {Object.entries(classesByGrade).map(([grade, gradeClasses]) => {
                      const allSelected = gradeClasses.every(c =>
                        (formData.targetClassIds || []).includes(c.id)
                      );
                      return (
                        <div key={grade} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-800 text-[11px]">
                              Tingkat Kelas {grade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllClassesInGrade(grade)}
                              className="text-[10px] font-bold text-cyan-700 hover:underline cursor-pointer"
                            >
                              {allSelected ? 'Batal Pilih Tingkat ' + grade : 'Pilih Semua Kelas ' + grade}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {gradeClasses.map(cls => {
                              const checked = (formData.targetClassIds || []).includes(cls.id);
                              return (
                                <label
                                  key={cls.id}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                                    checked
                                      ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleClassId(cls.id)}
                                    className="w-3.5 h-3.5 rounded text-cyan-600"
                                  />
                                  <span>{cls.name} ({cls.code})</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MODE 3: BY STUDENT NAMES (MAPEL PEMINATAN PER NAMA PESERTA DIDIK) */}
                {classScopeMode === 'by_students' && (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-purple-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-purple-600" />
                          <span>
                            Pilih Nama Peserta Didik ({formData.targetStudentIds?.length || 0} Siswa Terpilih)
                          </span>
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Centang nama peserta didik yang mengambil mata pelajaran peminatan ini. Hanya siswa yang dicentang yang wajib memiliki nilai mapel ini.
                        </p>
                      </div>

                      {(formData.targetStudentIds?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, targetStudentIds: [] })}
                          className="text-[11px] text-rose-600 hover:underline font-bold shrink-0 cursor-pointer"
                        >
                          Kosongkan Pilihan ({formData.targetStudentIds?.length})
                        </button>
                      )}
                    </div>

                    {/* Filter Bar for Student Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Filter Tingkat
                        </label>
                        <select
                          value={studentPickerGradeFilter}
                          onChange={(e) => {
                            setStudentPickerGradeFilter(e.target.value);
                            setStudentPickerClassFilter('ALL');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs"
                        >
                          <option value="ALL">Semua Tingkat (X, XI, XII)</option>
                          <option value="10">Tingkat 10 (Kelas X)</option>
                          <option value="11">Tingkat 11 (Kelas XI)</option>
                          <option value="12">Tingkat 12 (Kelas XII)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Filter Kelas / Rombel
                        </label>
                        <select
                          value={studentPickerClassFilter}
                          onChange={(e) => setStudentPickerClassFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs"
                        >
                          <option value="ALL">Semua Rombel</option>
                          {classes
                            .filter(
                              c =>
                                studentPickerGradeFilter === 'ALL' ||
                                c.gradeLevel === studentPickerGradeFilter
                            )
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Cari Nama / NIS Siswa
                        </label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={studentPickerSearch}
                            onChange={(e) => setStudentPickerSearch(e.target.value)}
                            placeholder="Ketik nama siswa..."
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bulk Select Header */}
                    <div className="flex items-center justify-between bg-purple-50/70 px-3 py-1.5 rounded-lg border border-purple-100 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        Menampilkan <strong>{pickerStudents.length}</strong> peserta didik (Urut Abjad A–Z)
                      </span>
                      {pickerStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={handleToggleAllVisibleStudents}
                          className="font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {pickerStudents.every(s => (formData.targetStudentIds || []).includes(s.id)) ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Batal Pilih Daftar Ini</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Pilih Semua di Daftar Ini ({pickerStudents.length})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Student Checkboxes List */}
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {pickerStudents.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          Tidak ada peserta didik yang sesuai dengan filter pencarian.
                        </div>
                      ) : (
                        pickerStudents.map((st, idx) => {
                          const isChecked = (formData.targetStudentIds || []).includes(st.id);
                          const stCls = classes.find(c => c.id === st.currentClassId);
                          return (
                            <label
                              key={st.id}
                              className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition ${
                                isChecked ? 'bg-purple-50/80 font-bold text-purple-950' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleStudentId(st.id)}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-[10px] font-mono text-slate-400 w-5">{idx + 1}.</span>
                                <div className="min-w-0">
                                  <div className="truncate">{st.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    NIS: {st.nis} • NISN: {st.nisn}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  isChecked
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {stCls?.code || st.currentClassName}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory ?? true}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>
                    Mata Pelajaran Wajib bagi siswa/kelas yang mengambil (Mempengaruhi status kelengkapan nilai)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-sm"
                >
                  Simpan Pengaturan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
