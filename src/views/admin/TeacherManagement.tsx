import React, { useState } from 'react';
import { UserCheck, Plus, Edit2, Trash2, X, Mail, Phone, Hash } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Teacher } from '../../types';

export const TeacherManagement: React.FC = () => {
  const { teachers, saveTeacher, deleteTeacher } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    nip: '',
    nuptk: '',
    email: '',
    phone: '',
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      nip: '',
      nuptk: '',
      email: '',
      phone: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData(t);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const teacherToSave: Teacher = {
      id: editingTeacher ? editingTeacher.id : 't_' + Date.now(),
      name: formData.name.trim(),
      nip: formData.nip?.trim() || '-',
      nuptk: formData.nuptk?.trim() || '-',
      email: formData.email.trim(),
      phone: formData.phone?.trim() || '-',
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
            Daftar profil guru, identitas NIP/NUPTK, email akun login, dan nomor kontak resmi
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition shadow-md shadow-teal-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
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
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  title="Ubah Guru"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(teacher.id, teacher.name)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Hapus Guru"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{teacher.name}</h3>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>NIP: <strong className="font-mono text-slate-700">{teacher.nip}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{teacher.phone}</span>
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
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aris Wicaksono, S.Pd."
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Jika Ada)</label>
                  <input
                    type="text"
                    placeholder="19850415..."
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NUPTK</label>
                  <input
                    type="text"
                    placeholder="4538..."
                    value={formData.nuptk || ''}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Email *</label>
                <input
                  type="email"
                  required
                  placeholder="nama.guru@sekolah.sch.id"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="081234..."
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
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
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
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
