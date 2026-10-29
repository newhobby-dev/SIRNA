import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Plus, Trash2, X, Filter } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { TeachingAssignment } from '../../types';
import { isSubjectApplicableToClass } from '../../lib/utils';

export const AssignmentManagement: React.FC = () => {
  const {
    teachingAssignments,
    teachers,
    classes,
    subjects,
    selectedYearId,
    selectedSemesterId,
    saveTeachingAssignment,
    deleteTeachingAssignment,
  } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeachingAssignment | null>(null);
  const [classFilter, setClassFilter] = useState('ALL');

  const [formData, setFormData] = useState<{
    teacherId: string;
    subjectId: string;
    classId: string;
  }>({
    teacherId: teachers[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    classId: classes[0]?.id || '',
  });

  const selectedSubjectObj = useMemo(
    () => subjects.find(s => s.id === formData.subjectId),
    [subjects, formData.subjectId]
  );

  // Filter classes that study the selected subject
  const applicableClassesForSubject = useMemo(() => {
    if (!selectedSubjectObj) return classes;
    const matched = classes.filter(c => isSubjectApplicableToClass(selectedSubjectObj, c));
    return matched.length > 0 ? matched : classes;
  }, [classes, selectedSubjectObj]);

  const filteredAssignments = teachingAssignments.filter(a => {
    if (classFilter !== 'ALL' && a.classId !== classFilter) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingAssignment(null);
    const firstSubj = subjects[0];
    const validClasses = firstSubj
      ? classes.filter(c => isSubjectApplicableToClass(firstSubj, c))
      : classes;
    setFormData({
      teacherId: teachers[0]?.id || '',
      subjectId: firstSubj?.id || '',
      classId: validClasses[0]?.id || classes[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleSubjectChange = (newSubjectId: string) => {
    const subj = subjects.find(s => s.id === newSubjectId);
    const validClasses = subj
      ? classes.filter(c => isSubjectApplicableToClass(subj, c))
      : classes;
    const isCurrentClassStillValid = validClasses.some(c => c.id === formData.classId);

    setFormData({
      ...formData,
      subjectId: newSubjectId,
      classId: isCurrentClassStillValid ? formData.classId : (validClasses[0]?.id || classes[0]?.id || ''),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === formData.teacherId);
    const subject = subjects.find(s => s.id === formData.subjectId);
    const cls = classes.find(c => c.id === formData.classId);

    if (!teacher || !subject || !cls) return;

    // Check duplicate
    const exists = teachingAssignments.some(
      a =>
        a.teacherId === teacher.id &&
        a.subjectId === subject.id &&
        a.classId === cls.id &&
        a.id !== editingAssignment?.id
    );

    if (exists) {
      alert('Penugasan untuk guru, mata pelajaran, dan kelas ini sudah ada.');
      return;
    }

    const assignmentToSave: TeachingAssignment = {
      id: editingAssignment ? editingAssignment.id : 'ta_' + Date.now(),
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: subject.id,
      subjectName: subject.name,
      classId: cls.id,
      className: cls.name,
      academicYearId: selectedYearId,
      semesterId: selectedSemesterId,
      isActive: true,
    };

    await saveTeachingAssignment(assignmentToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Hapus penugasan ${label}?`)) {
      await deleteTeachingAssignment(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Penugasan Mengajar Guru</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tentukan guru pengampu untuk setiap rombongan belajar dan mata pelajaran pada semester aktif
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Penugasan</span>
        </button>
      </div>

      {/* Filter by class */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-600">Filter Kelas:</span>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
        >
          <option value="ALL">Semua Kelas ({teachingAssignments.length})</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="block sm:hidden px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
          ↔ Geser ke kanan/kiri untuk melihat kolom & tombol aksi
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-3">Kelas / Rombel</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.map((a, idx) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{a.teacherName}</td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">{a.subjectName}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{a.className}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(a.id, `${a.teacherName} - ${a.subjectName} (${a.className})`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus Penugasan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Tambah Penugasan Mengajar</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Guru *</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran *</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {subjects.map(s => {
                    const specificClasses =
                      s.targetClassIds && s.targetClassIds.length > 0
                        ? classes
                            .filter(c => s.targetClassIds?.includes(c.id))
                            .map(c => c.code)
                            .join(', ')
                        : '';
                    return (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}{' '}
                        {specificClasses
                          ? `(Khusus Kelas: ${specificClasses})`
                          : s.gradeLevel === 'Semua'
                          ? '(Semua Kelas)'
                          : `(Kelas ${s.gradeLevel})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rombel / Kelas *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {applicableClassesForSubject.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.gradeLevel})
                    </option>
                  ))}
                </select>
                {selectedSubjectObj?.targetClassIds && selectedSubjectObj.targetClassIds.length > 0 && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                    ℹ️ Mata pelajaran {selectedSubjectObj.name} hanya dipelajari di kelas:{' '}
                    {applicableClassesForSubject.map(c => c.code).join(', ')}.
                  </p>
                )}
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
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

