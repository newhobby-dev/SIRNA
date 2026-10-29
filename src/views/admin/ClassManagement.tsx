import React, { useState } from 'react';
import { School, Plus, Edit2, Trash2, X, Users, BookOpen, Download } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { ClassRoom } from '../../types';
import { exportStudentNamesByClassExcel } from '../../lib/utils';

export const ClassManagement: React.FC = () => {
  const { classes, students, teachers, selectedYearId, saveClass, deleteClass } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [formData, setFormData] = useState<Partial<ClassRoom>>({
    code: '',
    name: '',
    gradeLevel: '10',
    major: 'Umum',
    homeroomTeacherId: teachers[0]?.id || '',
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      code: '',
      name: '',
      gradeLevel: '10',
      major: 'Fase E (Umum)',
      homeroomTeacherId: teachers[0]?.id || '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassRoom) => {
    setEditingClass(cls);
    setFormData(cls);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const teacher = teachers.find(t => t.id === formData.homeroomTeacherId);

    const classToSave: ClassRoom = {
      id: editingClass ? editingClass.id : 'cls_' + Date.now(),
      code: formData.code.trim(),
      name: formData.name.trim(),
      gradeLevel: formData.gradeLevel || '10',
      major: formData.major || 'Umum',
      academicYearId: selectedYearId,
      homeroomTeacherId: formData.homeroomTeacherId || '',
      homeroomTeacherName: teacher?.name || 'Belum Ditunjuk',
      isActive: formData.isActive ?? true,
    };

    await saveClass(classToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus rombel ${name}? Data nilai terkait pada kelas ini mungkin terpengaruh.`)) {
      await deleteClass(id);
    }
  };

  const handleExportClassStudents = (classId: string) => {
    exportStudentNamesByClassExcel({
      students: students.filter(s => s.status === 'aktif'),
      classes,
      targetClassId: classId,
      fileNamePrefix: 'Daftar_Nama_Peserta_Didik',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <School className="w-5 h-5 text-purple-600" />
            <span>Manajemen Rombongan Belajar (Kelas)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola rombel (X-A s/d X-H, XI, XII), tingkat/fase, jurusan, penunjukan wali kelas, dan ekspor nama siswa per kelas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportClassStudents('ALL')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Nama Siswa Tiap Kelas (A-Z)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const activeStudentCount = students.filter(
            s => s.currentClassId === cls.id && s.status === 'aktif'
          ).length;

          return (
            <div
              key={cls.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                      {cls.code}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{activeStudentCount} Siswa</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Ubah Kelas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id, cls.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tingkat {cls.gradeLevel} • {cls.major}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Wali Kelas:</span>
                  <span className="font-semibold text-slate-800">{cls.homeroomTeacherName || 'Belum Ditunjuk'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportClassStudents(cls.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition cursor-pointer shrink-0"
                  title={`Unduh daftar nama peserta didik ${cls.name} urut abjad A-Z`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Nama (A-Z)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingClass ? 'Ubah Rombel' : 'Tambah Rombel Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X-A, XI-MIPA-1"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas X-A"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={formData.gradeLevel || '10'}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="7">Tingkat 7 (SMP)</option>
                    <option value="8">Tingkat 8 (SMP)</option>
                    <option value="9">Tingkat 9 (SMP)</option>
                    <option value="10">Tingkat 10 (SMA/SMK)</option>
                    <option value="11">Tingkat 11 (SMA/SMK)</option>
                    <option value="12">Tingkat 12 (SMA/SMK)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jurusan / Program</label>
                  <input
                    type="text"
                    placeholder="MIPA / IPS / Umum / Kejuruan"
                    value={formData.major || ''}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={formData.homeroomTeacherId || ''}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
