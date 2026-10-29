import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  History,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Layers,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Student, StudentStatus } from '../../types';
import {
  sortStudentsAlphabetically,
  sortStudentsByClassAndName,
  exportStudentNamesByClassExcel,
  downloadStudentImportTemplate,
  parseStudentExcelFile,
  StudentExcelImportRow,
} from '../../lib/utils';

export const StudentManagement: React.FC = () => {
  const {
    students,
    classes,
    saveStudent,
    saveStudentsBatch,
    deleteStudent,
    promoteStudentsBatch,
    selectedYearId,
    selectedSemesterId,
  } = useAcademic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | StudentStatus>('aktif');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    cohort: '2026',
    status: 'aktif',
    currentClassId: classes[0]?.id || '',
  });
  const [formError, setFormError] = useState('');

  // Promotion Modal State (Directive 8)
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [promotionMode, setPromotionMode] = useState<'x_to_xi' | 'xi_to_xii'>('x_to_xi');
  const [sourceClassId, setSourceClassId] = useState<string>(() => {
    const firstX = classes.find(c => c.gradeLevel === '10' || c.code.startsWith('X-'));
    return firstX?.id || classes[0]?.id || '';
  });
  const [targetClassId, setTargetClassId] = useState<string>(() => {
    const firstXI = classes.find(c => c.gradeLevel === '11' || c.code.startsWith('XI-'));
    return firstXI?.id || classes[1]?.id || classes[0]?.id || '';
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promotionFeedback, setPromotionFeedback] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  // Excel Upload Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFallbackClassId, setExcelFallbackClassId] = useState<string>('ALL');
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [excelParsedData, setExcelParsedData] = useState<{
    rows: StudentExcelImportRow[];
    totalValid: number;
    totalCreate: number;
    totalUpdate: number;
    totalErrors: number;
  } | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelImportSuccessMsg, setExcelImportSuccessMsg] = useState<string | null>(null);

  const handleSwitchPromotionMode = (mode: 'x_to_xi' | 'xi_to_xii') => {
    setPromotionMode(mode);
    setSelectedStudentIds([]);
    if (mode === 'x_to_xi') {
      const src = classes.find(c => c.gradeLevel === '10' || c.code.startsWith('X-'));
      const tgt = classes.find(c => c.gradeLevel === '11' || c.code.startsWith('XI-'));
      if (src) setSourceClassId(src.id);
      if (tgt) setTargetClassId(tgt.id);
    } else {
      const src = classes.find(c => c.gradeLevel === '11' || c.code.startsWith('XI-'));
      const tgt = classes.find(c => c.gradeLevel === '12' || c.code.startsWith('XII'));
      if (src) setSourceClassId(src.id);
      if (tgt) setTargetClassId(tgt.id);
    }
  };

  // Students in chosen source class for promotion (sorted A-Z by name)
  const sourceStudents = useMemo(() => {
    return sortStudentsAlphabetically(
      students.filter(s => s.currentClassId === sourceClassId && s.status === 'aktif')
    );
  }, [students, sourceClassId]);

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === sourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceStudents.map(s => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecutePromotion = async () => {
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) {
      alert('Pilih kelas rombel tujuan terlebih dahulu.');
      return;
    }

    const idsToPromote = promotionMode === 'xi_to_xii'
      ? sourceStudents.map(s => s.id)
      : selectedStudentIds;

    if (idsToPromote.length === 0) {
      alert('Pilih setidaknya 1 peserta didik untuk diproses kenaikan kelasnya.');
      return;
    }

    setIsPromoting(true);
    setPromotionFeedback(null);
    try {
      await promoteStudentsBatch(
        idsToPromote,
        targetClass.id,
        targetClass.name,
        selectedYearId,
        selectedSemesterId
      );
      setPromotionFeedback(
        `Sukses! ${idsToPromote.length} peserta didik berhasil dinaikkan ke ${targetClass.name}. Riwayat rombel lama diarsipkan dan nilai terlindungi dari tertukar.`
      );
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert('Gagal memproses kenaikan kelas: ' + (err.message || 'Error'));
    } finally {
      setIsPromoting(false);
    }
  };

  // Sorted and filtered students: grouped by class and strictly alphabetical (A-Z) by name within each class
  const filteredStudents = useMemo(() => {
    let result = students;

    if (selectedClassFilter !== 'ALL') {
      result = result.filter(s => s.currentClassId === selectedClassFilter);
    }

    if (selectedStatusFilter !== 'ALL') {
      result = result.filter(s => s.status === selectedStatusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q)
      );
    }

    if (selectedClassFilter === 'ALL') {
      return sortStudentsByClassAndName(result, classes);
    }
    return sortStudentsAlphabetically(result);
  }, [students, classes, selectedClassFilter, selectedStatusFilter, searchQuery]);

  // Compute per-class alphabetical rank/order number (1, 2, 3... inside each class)
  const classSequenceMap = useMemo(() => {
    const map = new Map<string, number>();
    const counters = new Map<string, number>();
    filteredStudents.forEach(s => {
      const clsKey = s.currentClassId || s.currentClassName || 'UNASSIGNED';
      const nextNum = (counters.get(clsKey) || 0) + 1;
      counters.set(clsKey, nextNum);
      map.set(s.id, nextNum);
    });
    return map;
  }, [filteredStudents]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nis: '',
      nisn: '',
      name: '',
      gender: 'L',
      cohort: '2026',
      status: 'aktif',
      currentClassId: classes[0]?.id || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      ...student,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nis = formData.nis?.trim() || '';
    const nisn = formData.nisn?.trim() || '';
    const name = formData.name?.trim() || '';

    if (!nis || !nisn || !name) {
      setFormError('NIS, NISN, dan Nama Lengkap wajib diisi.');
      return;
    }

    // NISN uniqueness validation
    const duplicateNisn = students.find(
      s => s.nisn === nisn && s.id !== editingStudent?.id
    );
    if (duplicateNisn) {
      setFormError(`NISN ${nisn} sudah terdaftar atas nama ${duplicateNisn.name}. NISN harus unik.`);
      return;
    }

    const selectedClass = classes.find(c => c.id === formData.currentClassId);

    const studentToSave: Student = {
      id: editingStudent ? editingStudent.id : 'std_' + Date.now(),
      nis,
      nisn,
      name,
      gender: formData.gender as 'L' | 'P',
      cohort: formData.cohort || '2026',
      status: (formData.status as StudentStatus) || 'aktif',
      currentClassId: formData.currentClassId || '',
      currentClassName: selectedClass?.name || 'Belum Terdaftar',
      portalPin: editingStudent?.portalPin || '',
      classHistory: editingStudent?.classHistory || [
        {
          academicYearId: selectedClass?.academicYearId || 'ay_2026_2027',
          semesterId: 'sem_2026_1',
          classId: selectedClass?.id || '',
          className: selectedClass?.name || '',
        },
      ],
    };

    await saveStudent(studentToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data peserta didik: "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      await deleteStudent(id);
    }
  };

  // Ekspor Daftar Nama Peserta Didik Terurut Abjad (A-Z) untuk Semua Kelas (Tiap Kelas 1 Sheet + Gabungan)
  const handleExportAllClassesByAlphabet = () => {
    const baseStudents =
      selectedStatusFilter === 'ALL'
        ? students
        : students.filter(s => s.status === selectedStatusFilter);

    exportStudentNamesByClassExcel({
      students: baseStudents,
      classes,
      targetClassId: 'ALL',
      fileNamePrefix: 'Daftar_Nama_Peserta_Didik',
    });
  };

  // Ekspor Daftar Nama Peserta Didik Terurut Abjad (A-Z) untuk Kelas Tertentu
  const handleExportSingleClassByAlphabet = (classId: string) => {
    const baseStudents =
      selectedStatusFilter === 'ALL'
        ? students
        : students.filter(s => s.status === selectedStatusFilter);

    exportStudentNamesByClassExcel({
      students: baseStudents,
      classes,
      targetClassId: classId,
      fileNamePrefix: 'Daftar_Nama_Peserta_Didik',
    });
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelImportSuccessMsg(null);
    try {
      const parsed = await parseStudentExcelFile(
        file,
        classes,
        students,
        excelFallbackClassId
      );
      setExcelParsedData(parsed);
    } catch (err: any) {
      alert('Gagal membaca file Excel: ' + (err.message || 'Pastikan format file adalah .xlsx atau .xls'));
    }
    e.target.value = '';
  };

  const handleConfirmExcelImport = async () => {
    if (!excelParsedData || excelParsedData.totalValid === 0) return;
    setIsImportingExcel(true);
    try {
      const validRows = excelParsedData.rows.filter(r => r.isValid);
      const now = Date.now();

      const studentsToSave: Student[] = validRows.map((r, idx) => {
        const existing = r.existingStudentId
          ? students.find(s => s.id === r.existingStudentId)
          : undefined;
        const targetClass = classes.find(c => c.id === r.classId);

        return {
          id: existing ? existing.id : `std_${now}_${idx}`,
          nis: r.nis,
          nisn: r.nisn,
          name: r.name,
          gender: r.gender,
          cohort: r.admissionYear || existing?.cohort || '2026',
          status: r.status || existing?.status || 'aktif',
          currentClassId: r.classId,
          currentClassName: targetClass?.name || r.className,
          portalPin: existing?.portalPin || '',
          eligibleRank: existing?.eligibleRank ?? null,
          classHistory: existing?.classHistory || [
            {
              academicYearId: targetClass?.academicYearId || selectedYearId,
              semesterId: selectedSemesterId,
              classId: r.classId,
              className: targetClass?.name || r.className,
            },
          ],
        };
      });

      await saveStudentsBatch(studentsToSave);
      setExcelImportSuccessMsg(
        `Berhasil mengimpor ${studentsToSave.length} peserta didik (${excelParsedData.totalCreate} baru, ${excelParsedData.totalUpdate} diperbarui). Daftar otomatis diurutkan sesuai abjad tiap kelas.`
      );
      setExcelParsedData(null);
      setExcelFileName('');
    } catch (err: any) {
      alert('Gagal menyimpan data peserta didik: ' + (err.message || 'Error'));
    } finally {
      setIsImportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen Data Peserta Didik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data induk siswa, penempatan rombel, identitas NIS & NISN, unggah & ekspor daftar nama urut abjad tiap kelas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedClassFilter !== 'ALL' && (
            <button
              onClick={() => handleExportSingleClassByAlphabet(selectedClassFilter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
              title="Ekspor daftar nama siswa kelas yang sedang dipilih (Urut Abjad A-Z)"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>
                Ekspor Kelas {classes.find(c => c.id === selectedClassFilter)?.code || 'Ini'} (A-Z)
              </span>
            </button>
          )}

          <button
            onClick={handleExportAllClassesByAlphabet}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
            title="Unduh file Excel daftar nama peserta didik yang terurut sesuai abjad nama (A-Z) untuk tiap kelas"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Nama Siswa Tiap Kelas (A-Z)</span>
          </button>

          <button
            onClick={() => {
              setExcelFallbackClassId(selectedClassFilter !== 'ALL' ? selectedClassFilter : 'ALL');
              setExcelParsedData(null);
              setExcelFileName('');
              setExcelImportSuccessMsg(null);
              setIsExcelModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
            title="Unggah data peserta didik secara massal dari berkas Excel (.xlsx / .xls)"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Excel Siswa</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Anti-Swap Protection Directive 8 Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/60 border border-blue-400/40 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <span>Sistem Penataan Rombel & Perlindungan Nilai Anti-Tertukar</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                Terverifikasi
              </span>
            </h3>
            <div className="text-[11px] text-slate-300 mt-1 leading-relaxed space-y-0.5">
              <p>• <strong>Kenaikan X ke XI:</strong> Rombel berganti karena siswa memilih jurusan / peminatan (Fase F).</p>
              <p>• <strong>Kenaikan XI ke XII:</strong> Rombel rombongan peserta didik <strong>tetap utuh</strong> tanpa diacak.</p>
              <p>• <strong>Proteksi Nilai:</strong> Nilai diikat kunci majemuk unik (<code className="text-sky-200 font-mono">semesterId_classId_subjectId_studentId</code>) & validasi NIS+NISN ganda agar tidak tertukar.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setPromotionFeedback(null);
            handleSwitchPromotionMode('x_to_xi');
            setIsPromotionModalOpen(true);
          }}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-md shadow-amber-950/40 cursor-pointer flex items-center gap-1.5"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Proses Kenaikan Kelas</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIS, atau NISN..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Kelas:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas (Urut Abjad Tiap Kelas)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span>Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="alumni">Alumni</option>
              <option value="mutasi">Mutasi</option>
              <option value="keluar">Keluar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-16 text-center" title="Nomor Urut Absen sesuai Abjad (A-Z) di Kelasnya">
                  No. Kelas
                </th>
                <th className="py-3 px-3 w-28">NIS</th>
                <th className="py-3 px-3 w-32">NISN</th>
                <th className="py-3 px-4">Nama Lengkap Peserta Didik (Urut Abjad A-Z)</th>
                <th className="py-3 px-3 w-16 text-center">L/P</th>
                <th className="py-3 px-3">Rombel / Kelas</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada peserta didik yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const prevStudent = idx > 0 ? filteredStudents[idx - 1] : null;
                  const showClassHeader =
                    selectedClassFilter === 'ALL' &&
                    (!prevStudent || prevStudent.currentClassId !== student.currentClassId);
                  const classSeq = classSequenceMap.get(student.id) ?? idx + 1;
                  const classStudentCount = filteredStudents.filter(
                    s => s.currentClassId === student.currentClassId
                  ).length;

                  return (
                    <React.Fragment key={student.id}>
                      {showClassHeader && (
                        <tr className="bg-blue-50/70 border-y border-blue-100">
                          <td colSpan={8} className="py-2 px-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-extrabold text-[11px]">
                                  {student.currentClassName || 'Belum Terdaftar'}
                                </span>
                                <span className="text-[11px] font-semibold text-blue-900">
                                  {classStudentCount} Peserta Didik • Terurut Abjad Nama (A–Z)
                                </span>
                              </div>
                              {student.currentClassId && (
                                <button
                                  type="button"
                                  onClick={() => handleExportSingleClassByAlphabet(student.currentClassId)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Ekspor Nama {student.currentClassName} (A-Z)</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50/80 transition group">
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                            {classSeq}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">{student.nis}</td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">{student.nisn}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {student.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            student.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {student.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{student.currentClassName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : student.status === 'alumni'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {student.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(student)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Ubah Data Siswa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(student.id, student.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> peserta didik</span>
          <span className="text-[11px] text-slate-500 font-medium">
            ✓ Terurut otomatis sesuai abjad nama (A–Z) di tiap kelas
          </span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Ubah Data Peserta Didik' : 'Tambah Peserta Didik Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIS (Nomor Induk Siswa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 2601001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NISN (10 Digit Nasional) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0081234561"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Peserta Didik *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap sesuai akta / ijazah"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel
                  </label>
                  <select
                    value={formData.currentClassId || ''}
                    onChange={(e) => setFormData({ ...formData, currentClassId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Siswa
                </label>
                <select
                  value={formData.status || 'aktif'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aktif">Aktif</option>
                  <option value="alumni">Alumni</option>
                  <option value="mutasi">Mutasi</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm"
                >
                  Simpan Peserta Didik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotion Modal (Directive 8) */}
      {isPromotionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Kenaikan Kelas & Penataan Rombel
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Solusi terproteksi agar susunan rombel rapi dan nilai akademik tidak tertukar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPromotionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {promotionFeedback && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{promotionFeedback}</span>
              </div>
            )}

            {/* Mode Selector Tabs: Kelas X ke XI on LEFT, Kelas XI ke XII on RIGHT */}
            <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSwitchPromotionMode('x_to_xi')}
                className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  promotionMode === 'x_to_xi'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Kelas X ke XI (Penjurusan)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchPromotionMode('xi_to_xii')}
                className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  promotionMode === 'xi_to_xii'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Kelas XI ke XII (Rombel Tetap)</span>
              </button>
            </div>

            {/* Explanatory Box */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              {promotionMode === 'x_to_xi' ? (
                <p>
                  <strong className="text-blue-800">Prinsip Kelas X ke XI:</strong> Rombel <strong>BERGANTI</strong> karena peserta didik memilih konsentrasi keahlian / mata pelajaran pilihan (Fase F). Centang siswa dari kelas X asal, lalu tempatkan ke rombel kelas XI tujuan.
                </p>
              ) : (
                <p>
                  <strong className="text-amber-800">Prinsip Kelas XI ke XII:</strong> Rombongan belajar <strong>TIDAK BERGANTI</strong>. Siswa satu rombel (misal XI-A) dinaikkan secara utuh ke rombel tingkat XII (misal XII-A) tanpa diacak, menjamin keutuhan data dan mencegah nilai tertukar.
                </p>
              )}
            </div>

            {/* Class Selection Controls */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rombel Asal ({promotionMode === 'xi_to_xii' ? 'Tingkat 11' : 'Tingkat 10'}) *
                </label>
                <select
                  value={sourceClassId}
                  onChange={(e) => {
                    setSourceClassId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-800 bg-white"
                >
                  {classes
                    .filter(c => promotionMode === 'xi_to_xii' ? c.gradeLevel === '11' || c.code.startsWith('XI') : c.gradeLevel === '10' || c.code.startsWith('X'))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rombel Tujuan ({promotionMode === 'xi_to_xii' ? 'Tingkat 12' : 'Tingkat 11'}) *
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-800 bg-white"
                >
                  {classes
                    .filter(c => promotionMode === 'xi_to_xii' ? c.gradeLevel === '12' || c.code.startsWith('XII') : c.gradeLevel === '11' || c.code.startsWith('XI'))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Students List in Source Class */}
            <div className="mt-4 flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Daftar Siswa Rombel Asal ({sourceStudents.length} Siswa)</span>
                {promotionMode === 'x_to_xi' && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    {selectedStudentIds.length === sourceStudents.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                  </button>
                )}
                {promotionMode === 'xi_to_xii' && (
                  <span className="text-[11px] text-emerald-700 font-bold">
                    ✓ Otomatis terpilih seluruh rombel
                  </span>
                )}
              </div>

              {sourceStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada peserta didik aktif di rombel asal yang dipilih.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/60 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                    <tr>
                      {promotionMode === 'x_to_xi' && <th className="p-2 w-10 text-center">Pilih</th>}
                      <th className="p-2 w-24">NIS</th>
                      <th className="p-2 w-28">NISN</th>
                      <th className="p-2">Nama Peserta Didik</th>
                      <th className="p-2 w-16 text-center">JK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sourceStudents.map(s => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => promotionMode === 'x_to_xi' && handleToggleStudent(s.id)}
                          className={promotionMode === 'x_to_xi' ? 'hover:bg-blue-50/40 cursor-pointer' : 'hover:bg-slate-50'}
                        >
                          {promotionMode === 'x_to_xi' && (
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleStudent(s.id)}
                                className="w-3.5 h-3.5 rounded text-blue-600"
                              />
                            </td>
                          )}
                          <td className="p-2 font-mono text-slate-600">{s.nis}</td>
                          <td className="p-2 font-mono text-slate-600">{s.nisn}</td>
                          <td className="p-2 font-semibold text-slate-900">{s.name}</td>
                          <td className="p-2 text-center text-slate-500 font-bold">{s.gender}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 text-[11px]">
                {promotionMode === 'xi_to_xii'
                  ? `${sourceStudents.length} siswa akan dinaikkan serentak`
                  : `${selectedStudentIds.length} dari ${sourceStudents.length} siswa dipilih`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleExecutePromotion}
                  disabled={isPromoting || (promotionMode === 'x_to_xi' && selectedStudentIds.length === 0) || (promotionMode === 'xi_to_xii' && sourceStudents.length === 0)}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    {isPromoting ? 'Memproses...' : promotionMode === 'xi_to_xii' ? 'Naikkan Rombel Utuh' : 'Pindahkan Siswa Terpilih'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Unggah Data Peserta Didik via Excel
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Impor daftar peserta didik baru atau perbarui data siswa secara massal (otomatis terurut abjad A-Z tiap kelas)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {excelImportSuccessMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{excelImportSuccessMsg}</span>
              </div>
            )}

            {/* Step 1 & Step 2 Controls */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase mb-1.5">
                    Langkah 1: Template & Kelas Default
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Unduh Format Template Excel Peserta Didik
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Berisi kolom NIS, NISN, Nama Peserta Didik, L/P, Kelas / Rombel, Angkatan, dan Status. Anda juga dapat mengunggah hasil file Ekspor Nama Siswa.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kelas Tujuan Default (Jika kolom Kelas di Excel dikosongkan):
                    </label>
                    <select
                      value={excelFallbackClassId}
                      onChange={(e) => setExcelFallbackClassId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 text-xs"
                    >
                      <option value="ALL">Sesuai Kolom "Kelas / Rombel" di File Excel</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadStudentImportTemplate(classes, excelFallbackClassId)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template Excel Siswa (.xlsx)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 flex flex-col justify-between gap-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] uppercase mb-1.5">
                    Langkah 2: Pilih File Excel
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Unggah Berkas Excel (.xlsx / .xls)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sistem akan memvalidasi keunikan NIS & NISN serta mencocokkan kode kelas secara otomatis sebelum disimpan.
                  </p>
                </div>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-xl p-4 cursor-pointer transition text-center">
                  <Upload className="w-6 h-6 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold text-indigo-700">
                    {excelFileName ? `Berkas: ${excelFileName}` : 'Klik untuk Memilih File Excel (.xlsx)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung 1 sheet gabungan maupun multi-sheet per kelas
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Preview Table */}
            {excelParsedData && (
              <div className="mt-4 flex-1 flex flex-col min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                      Total Baris: {excelParsedData.rows.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      Siap Impor: {excelParsedData.totalValid} ({excelParsedData.totalCreate} Siswa Baru, {excelParsedData.totalUpdate} Perbarui)
                    </span>
                    {excelParsedData.totalErrors > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        Perlu Perbaikan: {excelParsedData.totalErrors} Baris
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs min-w-[680px]">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Baris</th>
                        <th className="py-2.5 px-3">Nama Peserta Didik</th>
                        <th className="py-2.5 px-2 text-center w-12">L/P</th>
                        <th className="py-2.5 px-3 w-24">NIS</th>
                        <th className="py-2.5 px-3 w-28">NISN</th>
                        <th className="py-2.5 px-3">Kelas / Rombel</th>
                        <th className="py-2.5 px-3 text-center">Status Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelParsedData.rows.map((r, idx) => (
                        <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">#{r.rowNumber}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{r.name || '-'}</td>
                          <td className="py-2 px-2 text-center font-bold text-slate-600">{r.gender}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{r.nis || '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{r.nisn || '-'}</td>
                          <td className="py-2 px-3 font-semibold text-blue-700">{r.className}</td>
                          <td className="py-2 px-3 text-center">
                            {r.isValid ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.mode === 'create'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {r.mode === 'create' ? '✓ Siswa Baru' : '↻ Perbarui Data'}
                              </span>
                            ) : (
                              <div className="text-[10px] text-rose-600 font-semibold text-left">
                                {r.errors.join(' • ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 text-[11px]">
                Data yang diimpor otomatis diurutkan sesuai Abjad Nama (A–Z) pada masing-masing kelas.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={!excelParsedData || excelParsedData.totalValid === 0 || isImportingExcel}
                  onClick={handleConfirmExcelImport}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {isImportingExcel
                      ? 'Menyimpan...'
                      : `Simpan ${excelParsedData?.totalValid || 0} Data Peserta Didik`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
