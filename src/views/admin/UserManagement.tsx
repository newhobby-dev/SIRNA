import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Shield,
  KeyRound,
  CheckCircle2,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { SystemAccount, UserRole } from '../../types';

export const UserManagement: React.FC = () => {
  const { systemAccounts, saveAccount, deleteAccount } = useAuth();
  const { teachers } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SystemAccount | null>(null);
  const [formData, setFormData] = useState<Partial<SystemAccount>>({
    username: '',
    password: '',
    name: '',
    role: 'teacher',
    email: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'teacher',
      email: '',
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: SystemAccount) => {
    setEditingAccount(acc);
    setFormData({ ...acc });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const username = formData.username?.trim().toLowerCase() || '';
    const password = formData.password?.trim() || '';
    const name = formData.name?.trim() || '';

    if (!username || !password || !name) {
      setFormError('Username, Password, dan Nama Lengkap wajib diisi.');
      return;
    }

    // Check duplicate username
    const duplicate = systemAccounts.find(
      (a: SystemAccount) => a.username.toLowerCase() === username && a.id !== editingAccount?.id
    );
    if (duplicate) {
      setFormError(`Username "${username}" sudah digunakan oleh akun lain.`);
      return;
    }

    const accountToSave: SystemAccount = {
      id: editingAccount ? editingAccount.id : 'acc_' + Date.now(),
      username,
      password,
      name,
      role: formData.role as UserRole,
      email: formData.email?.trim() || `${username}@sekolah.sch.id`,
      teacherId: formData.teacherId,
      isActive: formData.isActive ?? true,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
    };

    await saveAccount(accountToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, username: string) => {
    if (username === 'admin') {
      alert('Akun admin utama tidak boleh dihapus demi keamanan sistem.');
      return;
    }
    if (confirm(`Hapus akun pengguna "${username}"?`)) {
      await deleteAccount(id);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator Sekolah', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'bk':
        return { label: 'Guru BK (Bimbingan Konseling)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'teacher':
        return { label: 'Guru Mata Pelajaran', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen Akun & Hak Akses Pengguna</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola username, kata sandi, dan pembagian hak akses (Administrator Sekolah, Guru BK, Guru Mapel)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="block sm:hidden px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
          ↔ Geser ke kanan/kiri untuk melihat kolom & tombol aksi
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600 tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3 w-36">Username</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Alamat Email</th>
                <th className="py-3 px-3 w-28 text-center">Kata Sandi</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {systemAccounts.map((acc: SystemAccount, idx: number) => {
                const badge = getRoleBadge(acc.role);
                return (
                  <tr key={acc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{acc.username}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{acc.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{acc.email}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                        ••••••••
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {acc.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Ubah Akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id, acc.username)}
                          disabled={acc.username === 'admin'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition cursor-pointer"
                          title="Hapus Akun"
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

      {/* Modal Add / Edit Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingAccount ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: gurubk, waka_kurikulum"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kata Sandi (Password) *</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan kata sandi..."
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dra. Sri Wahyuni, M.Pd."
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hak Akses / Peran (Role) *</label>
                <select
                  value={formData.role || 'teacher'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Administrator Sekolah (Akses Penuh)</option>
                  <option value="bk">Guru BK (Bimbingan Konseling - Rekap & Pemantauan)</option>
                  <option value="teacher">Guru Mata Pelajaran (Input Nilai Akhir & Excel)</option>
                </select>
              </div>

              {formData.role === 'teacher' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hubungkan ke Data Guru (Agar Penugasan Mengajar Tersambung)
                  </label>
                  <select
                    value={formData.teacherId || ''}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const foundT = teachers.find(t => t.id === tId);
                      setFormData({
                        ...formData,
                        teacherId: tId || undefined,
                        name: foundT && !formData.name ? foundT.name : formData.name,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Guru dari Data Master --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP: {t.nip || '-'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Email</label>
                <input
                  type="email"
                  placeholder="email@sekolah.sch.id"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Akun Aktif (Dapat digunakan untuk masuk)</span>
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
