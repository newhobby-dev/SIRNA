import React, { useState } from 'react';
import { UserCheck, Plus, Edit2, Trash2, X, Hash, Search } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Teacher } from '../../types';

export const TeacherManagement: React.FC = () => {
  const { teachers, saveTeacher, deleteTeacher } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<{
    name: string;
    nip: string;
    isActive: boolean;
  }>({
    name: '',
    nip: '',
    isActive: true,
  });

  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return t.name.toLowerCase().includes(q) || (t.nip && t.nip.toLowerCase().includes(q));
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      nip: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      name: t.name || '',
      nip: t.nip === '-' ? '' : (t.nip || ''),
      isActive: t.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const teacherToSave: Teacher = {
      id: editingTeacher ? editingTeacher.id : 't_' + Date.now(),
      name: formData.name.trim(),
      nip: formData.nip.trim() || '-',
      nuptk: editingTeacher?.nuptk || '-',
      email: editingTeacher?.email || '-',
      phone: editingTeacher?.phone || '-',
      isActive: formData.isActive ?? true,
    };

    await saveTeacher(teacherToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus data guru ${name}?`)) {
      await deleteTeacher(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            <span>Manajemen Data Guru & Tenaga Pendidik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar profil guru dan identitas Nomor Induk Pegawai (NIP)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition shadow-md shadow-teal-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru atau NIP..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Total: <strong>{filteredTeachers.length} Guru</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                {teacher.name.charAt(0)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(teacher)}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                  title="Ubah Guru"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(teacher.id, teacher.name)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Hapus Guru"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{teacher.name}</h3>

            <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  NIP: <strong className="font-mono text-slate-700">{teacher.nip || '-'}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingTeacher ? 'Ubah Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aris Wicaksono, S.Pd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIP *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan NIP (atau tanda - jika belum ada)"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
