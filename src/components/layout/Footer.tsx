import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-6 no-print developer-credit">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">SIRNA</span>
          <span>•</span>
          <span>Sistem Informasi Rekap Nilai Akademik Peserta Didik</span>
        </div>
        <div className="text-center sm:text-right font-medium text-slate-200 bg-slate-800/80 px-3 py-1 rounded border border-slate-700/60">
          Dikembangkan Oleh: <span className="font-bold text-sky-400">Aris Wicaksono, S.Pd.</span>
        </div>
      </div>
    </footer>
  );
};
