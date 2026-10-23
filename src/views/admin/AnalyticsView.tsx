import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { formatIndonesianNumber } from '../../lib/utils';

export const AnalyticsView: React.FC = () => {
  const {
    classes,
    subjects,
    gradeEntries,
    academicSummaries,
    selectedSemesterId,
    currentSemester,
    students,
  } = useAcademic();

  const currentSummaries = useMemo(() => {
    return academicSummaries.filter(s => s.semesterId === selectedSemesterId && s.isComplete);
  }, [academicSummaries, selectedSemesterId]);

  // 1. Grade distribution (A: >=90, B: 80-89.99, C: 75-79.99, D: <75)
  const distribution = useMemo(() => {
    let catA = 0;
    let catB = 0;
    let catC = 0;
    let catD = 0;

    currentSummaries.forEach(s => {
      const avg = s.averageScore;
      if (avg >= 90) catA++;
      else if (avg >= 80) catB++;
      else if (avg >= 75) catC++;
      else catD++;
    });

    const total = currentSummaries.length || 1;
    return [
      { label: 'Sangat Baik (A: 90-100)', count: catA, pct: Math.round((catA / total) * 100), color: '#10b981' },
      { label: 'Baik (B: 80-89)', count: catB, pct: Math.round((catB / total) * 100), color: '#3b82f6' },
      { label: 'Cukup (C: 75-79)', count: catC, pct: Math.round((catC / total) * 100), color: '#f59e0b' },
      { label: 'Perlu Bimbingan (D: <75)', count: catD, pct: Math.round((catD / total) * 100), color: '#ef4444' },
    ];
  }, [currentSummaries]);

  // 2. Average comparison by class
  const classAverages = useMemo(() => {
    return classes.map(c => {
      const classSums = currentSummaries.filter(s => s.classId === c.id);
      const total = classSums.reduce((sum, s) => sum + s.averageScore, 0);
      const avg = classSums.length > 0 ? Math.round((total / classSums.length) * 100) / 100 : 0;
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        avg,
        studentCount: classSums.length,
      };
    });
  }, [classes, currentSummaries]);

  // 3. Average comparison by subject
  const subjectAverages = useMemo(() => {
    return subjects.map(sub => {
      const grades = gradeEntries.filter(
        g => g.subjectId === sub.id && g.semesterId === selectedSemesterId && g.finalScore > 0
      );
      const total = grades.reduce((sum, g) => sum + g.finalScore, 0);
      const avg = grades.length > 0 ? Math.round((total / grades.length) * 100) / 100 : 0;
      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        avg,
        count: grades.length,
      };
    });
  }, [subjects, gradeEntries, selectedSemesterId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <span>Analitik Akademik Sekolah</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribusi perolehan nilai, perbandingan capaian antarkelas & mata pelajaran pada {currentSemester?.name}
          </p>
        </div>
      </div>

      {/* Grid: Distribution & Class Averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <span>Distribusi Predikat Rata-Rata Siswa</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Berdasarkan {currentSummaries.length} siswa dengan nilai lengkap
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {distribution.map(d => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{d.label}</span>
                  <span className="font-bold text-slate-900">
                    {d.count} Siswa ({d.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Averages Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Perbandingan Rata-Rata Antarkelas</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nilai capaian rata-rata gabungan seluruh mapel
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {classAverages.map(c => {
              const barWidth = Math.min(100, (c.avg / 100) * 100);
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="font-mono font-extrabold text-blue-900">
                      {c.avg > 0 ? formatIndonesianNumber(c.avg) : 'Belum Ada Nilai'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Averages Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" />
          <span>Capaian Rata-Rata per Mata Pelajaran</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {subjectAverages.map(sub => (
            <div key={sub.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono">
                {sub.code}
              </span>
              <h4 className="text-xs font-bold text-slate-800 mt-2 truncate">{sub.name}</h4>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">Rata-rata:</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {sub.avg > 0 ? formatIndonesianNumber(sub.avg) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
