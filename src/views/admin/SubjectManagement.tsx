import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Filter, Layers, ArrowUp, ArrowDown, ArrowUpDown, Sparkles } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Subject } from '../../types';
import { isSubjectApplicableToClass, sortSubjects } from '../../lib/utils';

export const SubjectManagement: React.FC = () => {
  const { subjects, classes, saveSubject, saveSubjectsOrder, deleteSubject, isSyncing } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [classScopeMode, setClassScopeMode] = useState<'by_grade' | 'specific_classes'>('by_grade');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Subject>>({
    code: '',
    name: '',
    category: 'Kelompok A (Umum)',
    gradeLevel: 'Semua',
    targetClassIds: [],
    sortOrder: 1,
    isMandatory: true,
    weight: 1,
    isActive: true,
  });

  // Sorted master subjects list
  const orderedSubjects = useMemo(() => sortSubjects(subjects), [subjects]);

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

  const filteredSubjects = useMemo(() => {
    return orderedSubjects.filter(subj => {
      if (filterGrade !== 'ALL') {
        if (subj.targetClassIds && subj.targetClassIds.length > 0) {
          const targetClasses = classes.filter(c => subj.targetClassIds?.includes(c.id));
          if (!targetClasses.some(c => c.gradeLevel === filterGrade)) return false;
        } else if (subj.gradeLevel !== 'Semua' && subj.gradeLevel !== filterGrade) {
          return false;
        }
      }

      if (filterClassId !== 'ALL') {
        const cls = classes.find(c => c.id === filterClassId);
        if (cls && !isSubjectApplicableToClass(subj, cls)) {
          return false;
        }
      }

      return true;
    });
  }, [orderedSubjects, classes, filterGrade, filterClassId]);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setClassScopeMode('by_grade');
    setFormData({
      code: '',
      name: '',
      category: 'Kelompok A (Umum)',
      gradeLevel: 'Semua',
      targetClassIds: [],
      sortOrder: orderedSubjects.length + 1,
      isMandatory: true,
      weight: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Subject, fallbackIndex: number) => {
    setEditingSubject(s);
    const hasSpecificClasses = Boolean(s.targetClassIds && s.targetClassIds.length > 0);
    setClassScopeMode(hasSpecificClasses ? 'specific_classes' : 'by_grade');
    setFormData({
      ...s,
      targetClassIds: s.targetClassIds || [],
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

    // Automatically infer gradeLevel if all chosen classes belong to a single grade level
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const finalTargetClassIds =
      classScopeMode === 'specific_classes' && formData.targetClassIds && formData.targetClassIds.length > 0
        ? formData.targetClassIds
        : [];

    if (classScopeMode === 'specific_classes' && finalTargetClassIds.length === 0) {
      alert('Pilih minimal 1 kelas spesifik (misal XI-D), atau ubah opsi ke "Semua Rombel pada Tingkat Kelas".');
      return;
    }

    // Derive accurate gradeLevel when specific classes are selected
    let finalGradeLevel = formData.gradeLevel || 'Semua';
    if (finalTargetClassIds.length > 0) {
      const selectedClassObjs = classes.filter(c => finalTargetClassIds.includes(c.id));
      const uniqueGrades = Array.from(new Set(selectedClassObjs.map(c => c.gradeLevel)));
      finalGradeLevel = uniqueGrades.length === 1 ? uniqueGrades[0] : 'Semua';
    }

    const desiredSortOrder = Number(formData.sortOrder) || orderedSubjects.length + 1;

    const subjectToSave: Subject = {
      id: editingSubject ? editingSubject.id : 'subj_' + Date.now(),
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      category: formData.category as any,
      gradeLevel: finalGradeLevel,
      targetClassIds: finalTargetClassIds,
      sortOrder: desiredSortOrder,
      isMandatory: formData.isMandatory ?? true,
      weight: Number(formData.weight) || 1,
      isActive: formData.isActive ?? true,
    };

    await saveSubject(subjectToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus mata pelajaran ${name}? Nilai yang sudah masuk mungkin terpengaruh.`)) {
      await deleteSubject(id);
    }
  };

  const renderSubjectClassDetails = (subj: Subject) => {
    if (subj.targetClassIds && subj.targetClassIds.length > 0) {
      const matchedClasses = classes.filter(c => subj.targetClassIds?.includes(c.id));
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Khusus {matchedClasses.length} Kelas Tertentu
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {matchedClasses.map(cls => (
              <span
                key={cls.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-600 text-white shadow-2xs"
              >
                {cls.code || cls.name}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (subj.gradeLevel === 'Semua' || !subj.gradeLevel) {
      const allCodes = classes.map(c => c.code).join(', ');
      return (
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Semua Tingkat (Seluruh Kelas)
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]" title={allCodes}>
            {classes.length} Rombel ({allCodes})
          </p>
        </div>
      );
    }

    const gradeClasses = classes.filter(c => c.gradeLevel === subj.gradeLevel);
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Seluruh Kelas {subj.gradeLevel}
        </span>
        {gradeClasses.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {gradeClasses.map(cls => (
              <span
                key={cls.id}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
              >
                {cls.code}
              </span>
            ))}
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
            <span>Manajemen Mata Pelajaran & Urutan Kolom Rekap</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur daftar mata pelajaran, urutan kemunculan kolom pada tabel rekap nilai (leger & Excel), serta detail kelas yang mempelajari
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
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
          <table className="w-full text-left text-xs min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-36 text-center">Urutan Kolom Rekap</th>
                <th className="py-3 px-3 w-24">Kode</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Dipelajari di Kelas (Detail Rombel)</th>
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
                    <td className="py-3 px-3 text-slate-600">{subj.category}</td>
                    <td className="py-3 px-3">{renderSubjectClassDetails(subj)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          subj.isMandatory
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {subj.isMandatory ? 'Wajib' : 'Pilihan'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">{subj.weight}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(subj, globalIdx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                          title="Ubah Mapel, Urutan & Detail Kelas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(subj.id, subj.name)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingSubject ? 'Ubah Mata Pelajaran & Urutan Kolom' : 'Tambah Mata Pelajaran Baru'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Atur identitas mata pelajaran, urutan kolom di rekap nilai, dan detail kelas yang mempelajari
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    placeholder="BJP, MAT"
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
                    placeholder="Contoh: Bahasa Jepang"
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
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
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

              {/* Detailed Class Assignment Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Pengaturan Kelas yang Mempelajari Mata Pelajaran Ini *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Anda dapat memberlakukan mata pelajaran untuk seluruh kelas pada tingkat tertentu, atau memilih kelas tertentu secara spesifik (misal Bahasa Jepang hanya di kelas XI-D).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl font-bold">
                  <button
                    type="button"
                    onClick={() => setClassScopeMode('by_grade')}
                    className={`py-2 px-3 rounded-lg transition cursor-pointer text-center ${
                      classScopeMode === 'by_grade'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Rombel per Tingkat Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassScopeMode('specific_classes')}
                    className={`py-2 px-3 rounded-lg transition cursor-pointer text-center ${
                      classScopeMode === 'specific_classes'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pilih Kelas Spesifik (Detail Rombel)
                  </button>
                </div>

                {classScopeMode === 'by_grade' ? (
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
                      <option value="10">Seluruh Kelas 10 (Fase E / X-A s.d. X-E)</option>
                      <option value="11">Seluruh Kelas 11 (Fase F / XI-A s.d. XI-E)</option>
                      <option value="12">Seluruh Kelas 12 (Fase F / XII-A s.d. XII-E)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        Centang Kelas yang Mempelajari Mapel Ini ({formData.targetClassIds?.length || 0} Kelas Dipilih):
                      </span>
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
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory ?? true}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Mata Pelajaran Wajib (Mempengaruhi kelengkapan rekap pada kelas yang mempelajari)</span>
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

