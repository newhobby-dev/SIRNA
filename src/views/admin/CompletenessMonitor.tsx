import React, { useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, FileSpreadsheet, Filter } from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { isSubjectApplicableToClass, sortSubjects } from '../../lib/utils';
import { ClassRoom, Subject } from '../../types';

export const CompletenessMonitor: React.FC = () => {
  const {
    classes,
    subjects,
    teachingAssignments,
    gradeEntries,
    selectedSemesterId,
    currentSemester,
  } = useAcademic();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeSubjects = sortSubjects(subjects.filter(s => s.isActive));
  const activeClasses = classes.filter(c => c.isActive);

  // Status mapping for Class x Subject
  const getCellStatus = (cls: ClassRoom, subject: Subject) => {
    if (!isSubjectApplicableToClass(subject, cls)) {
      return { status: 'not_applicable', teacher: 'Tidak Dipelajari di Kelas Ini' };
    }

    const assignment = teachingAssignments.find(
      a => a.classId === cls.id && a.subjectId === subject.id
    );
    if (!assignment) {
      return { status: 'unassigned', teacher: '-' };
    }

    const grades = gradeEntries.filter(
      g => g.classId === cls.id && g.subjectId === subject.id && g.semesterId === selectedSemesterId
    );

    if (grades.length === 0) {
      return { status: 'unfilled', teacher: assignment.teacherName, assignmentId: assignment.id };
    }

    const firstStatus = grades[0].status;
    return {
      status: firstStatus,
      teacher: assignment.teacherName,
      assignmentId: assignment.id,
      count: grades.length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            <span>Matriks Pemantauan Kelengkapan Nilai</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau status pengunggahan nilai oleh guru untuk setiap mata pelajaran di seluruh rombongan belajar
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-500">Status Entri:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-200"></div>
          <span className="text-slate-600">Belum Diisi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-slate-600">Draft Guru</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-slate-600">Menunggu Verifikasi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-slate-600">Final (Disahkan)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-slate-600">Dipublikasikan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span className="text-slate-600">Perlu Revisi</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                <th className="py-3 px-3 min-w-[120px] bg-slate-100 sticky left-0 z-10 border-r border-slate-200">
                  Rombel / Kelas
                </th>
                {activeSubjects.map(sub => (
                  <th key={sub.id} className="py-3 px-2 text-center min-w-[70px] border-r border-slate-200" title={sub.name}>
                    <div>{sub.code}</div>
                    <div className="text-[9px] font-normal text-slate-400 capitalize">{sub.isMandatory ? 'Wajib' : 'Pilihan'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200">
                    <div>{cls.name}</div>
                    <div className="text-[10px] font-normal text-slate-400">Tingkat {cls.gradeLevel}</div>
                  </td>

                  {activeSubjects.map(sub => {
                    const info = getCellStatus(cls, sub);
                    let badgeClass = 'bg-slate-100 text-slate-400';
                    let label = 'Kosong';

                    if (info.status === 'not_applicable') {
                      badgeClass = 'bg-slate-50/60 text-slate-300';
                      label = '-';
                    } else if (info.status === 'unassigned') {
                      badgeClass = 'bg-slate-50 text-slate-300 border-dashed border border-slate-200';
                      label = 'N/A';
                    } else if (info.status === 'unfilled') {
                      badgeClass = 'bg-slate-100 text-slate-500';
                      label = 'Belum';
                    } else if (info.status === 'draft') {
                      badgeClass = 'bg-amber-100 text-amber-800';
                      label = 'Draft';
                    } else if (info.status === 'submitted') {
                      badgeClass = 'bg-blue-100 text-blue-800 font-bold';
                      label = 'Diajukan';
                    } else if (info.status === 'revision_requested') {
                      badgeClass = 'bg-rose-100 text-rose-800 font-bold';
                      label = 'Revisi';
                    } else if (info.status === 'final') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                      label = 'Final';
                    } else if (info.status === 'published') {
                      badgeClass = 'bg-purple-100 text-purple-800 font-bold';
                      label = 'Publis';
                    }

                    return (
                      <td key={sub.id} className="py-2.5 px-2 text-center border-r border-slate-100">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] w-full max-w-[60px] truncate ${badgeClass}`}
                          title={info.status === 'not_applicable' ? 'Tidak dipelajari di kelas ini' : `Guru: ${info.teacher}`}
                        >
                          {label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
