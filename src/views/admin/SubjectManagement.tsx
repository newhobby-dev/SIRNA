import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Subject } from '../../types';

export const SubjectManagement: React.FC = () => {
  const { subjects, saveSubject, deleteSubject } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    code: '',
    name: '',
    category: 'Kelompok A (Umum)',
    gradeLevel: 'Semua',
    isMandatory: true,
    weight: 1,
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({
      code: '',
      name: '',
      category: 'Kelompok A (Umum)',
      gradeLevel: 'Semua',
      isMandatory: true,
      weight: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject(s);
    setFormData(s);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const subjectToSave: Subject = {
      id: editingSubject ? editingSubject.id : 'subj_' + Date.now(),
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      category: formData.category as any,
      gradeLevel: formData.gradeLevel || 'Semua',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            <span>Manajemen Mata Pelajaran</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kurikulum, kategori (Wajib/Peminatan/Mulok), dan penentuan status kelengkapan wajib
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="block sm:hidden px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
          ↔ Geser ke kanan/kiri untuk melihat kolom & tombol aksi
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3 w-24">Kode</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Tingkat</th>
                <th className="py-3 px-3 text-center">Sifat</th>
                <th className="py-3 px-3 text-center">Bobot</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((subj, idx) => (
                <tr key={subj.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{subj.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{subj.name}</td>
                  <td className="py-3 px-3 text-slate-600">{subj.category}</td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {subj.gradeLevel === 'Semua' ? 'Semua Kelas' : `Kelas ${subj.gradeLevel}`}
                    </span>
                  </td>
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
                        onClick={() => handleOpenEdit(subj)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                        title="Ubah Mapel"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    placeholder="MAT, BIO"
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
                    placeholder="Matematika"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tingkat Kelas (Peruntukan) *
                  </label>
                  <select
                    value={formData.gradeLevel || 'Semua'}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  >
                    <option value="Semua">Semua Tingkat (Seluruh Kelas)</option>
                    <option value="10">Kelas 10 (Fase E / X)</option>
                    <option value="11">Kelas 11 (Fase F / XI)</option>
                    <option value="12">Kelas 12 (Fase F / XII)</option>
                    <option value="7">Kelas 7 (Fase D / VII)</option>
                    <option value="8">Kelas 8 (Fase D / VIII)</option>
                    <option value="9">Kelas 9 (Fase D / IX)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pilih tingkat kelas berapakah mapel ini diajarkan
                  </p>
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
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Bobot perhitungan nilai akhir (bawaan: 1)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory ?? true}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Mata Pelajaran Wajib (Mempengaruhi kelengkapan rekap)</span>
                </label>
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
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
