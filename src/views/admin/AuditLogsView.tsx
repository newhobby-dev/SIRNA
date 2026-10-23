import React, { useState } from 'react';
import { ShieldAlert, Search, Filter, Clock, User } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianDate } from '../../lib/utils';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useAcademic();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Audit Log Aktivitas & Jejak Keamanan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan riwayat setiap operasi sistem: login, input nilai, verifikasi, finalisasi, publikasi, dan backup
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari user, aksi, atau target perubahan..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Filter Aksi:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="SAVE_GRADE_DRAFT">Simpan Draft Nilai</option>
            <option value="SUBMIT_GRADES">Kirim Nilai Guru</option>
            <option value="VERIFY_APPROVE_GRADES">Verifikasi Disetujui</option>
            <option value="VERIFY_REQUEST_REVISION">Permintaan Revisi</option>
            <option value="PUBLISH_SEMESTER_GRADES">Publikasi Nilai</option>
            <option value="SEED_INITIAL_DATA">Inisialisasi Data</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 w-40">Waktu & Tanggal</th>
                <th className="py-3 px-3 w-44">Pengguna</th>
                <th className="py-3 px-3 w-40">Tindakan / Aksi</th>
                <th className="py-3 px-4">Objek / Target</th>
                <th className="py-3 px-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Tidak ada rekaman log audit yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  let timeFormatted = '-';
                  try {
                    const d = new Date(log.timestamp);
                    timeFormatted = `${formatIndonesianDate(d)}, ${d.toLocaleTimeString('id-ID')}`;
                  } catch {
                    timeFormatted = log.timestamp;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.target}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-md truncate">{log.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
