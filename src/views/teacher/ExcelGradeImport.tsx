import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Check,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import {
  downloadGradeTemplate,
  parseExcelGradeFile,
  ExcelImportRow,
  formatIndonesianNumber,
  exportExcelWorkbook,
  sortStudentsAlphabetically,
} from '../../lib/utils';
import { GradeEntry } from '../../types';

export const ExcelGradeImport: React.FC = () => {
  const { profile } = useAuth();
  const {
    teachingAssignments,
    students,
    gradeEntries,
    selectedSemesterId,
    currentSemester,
    saveGradeEntries,
    schoolSettings,
  } = useAcademic();

  const currentTeacherId = profile?.teacherId || 't_aris';
  const myAssignments = teachingAssignments.filter(
    a => a.teacherId === currentTeacherId && a.isActive
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    myAssignments[0]?.id || ''
  );

  const [parsedData, setParsedData] = useState<{
    rows: ExcelImportRow[];
    totalValid: number;
    totalErrors: number;
  } | null>(null);

  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const selectedAssignment = myAssignments.find(a => a.id === selectedAssignmentId);

  const classStudents = React.useMemo(() => {
    if (!selectedAssignment) return [];
    return students.filter(
      s => s.currentClassId === selectedAssignment.classId && s.status === 'aktif'
    );
  }, [students, selectedAssignment]);

  // Existing grades map to show comparison (old vs new)
  const existingGradesMap = React.useMemo(() => {
    if (!selectedAssignment) return new Map<string, number>();
    const map = new Map<string, number>();
    gradeEntries
      .filter(
        g =>
          g.classId === selectedAssignment.classId &&
          g.subjectId === selectedAssignment.subjectId &&
          g.semesterId === selectedSemesterId
      )
      .forEach(g => {
        map.set(g.studentId, g.finalScore);
      });
    return map;
  }, [selectedAssignment, selectedSemesterId, gradeEntries]);

  const handleDownloadTemplate = () => {
    if (!selectedAssignment) return;
    downloadGradeTemplate(
      selectedAssignment.className,
      selectedAssignment.subjectName,
      selectedAssignment.academicYearId,
      currentSemester?.name || 'Semester',
      classStudents
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssignment) return;

    setFileName(file.name);
    setImportResult(null);

    try {
      const result = await parseExcelGradeFile(
        file,
        classStudents,
        schoolSettings.minScore,
        schoolSettings.maxScore
      );
      setParsedData(result);
    } catch (err: any) {
      alert('Gagal membaca berkas Excel: ' + err.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !selectedAssignment) return;

    if (parsedData.totalValid === 0) {
      alert('Tidak ada baris data yang valid untuk diimpor.');
      return;
    }

    if (parsedData.totalErrors > 0) {
      if (!confirm(`Terdapat ${parsedData.totalErrors} baris bermasalah yang akan dilewati. Lanjutkan mengimpor ${parsedData.totalValid} baris yang valid?`)) {
        return;
      }
    }

    setIsImporting(true);
    try {
      const validRows = parsedData.rows.filter(r => r.isValid && r.matchedStudent);
      const entriesToSave: Partial<GradeEntry>[] = validRows.map(row => ({
        studentId: row.matchedStudent!.id,
        studentNis: row.matchedStudent!.nis,
        studentNisn: row.matchedStudent!.nisn,
        studentName: row.matchedStudent!.name,
        classId: selectedAssignment.classId,
        className: selectedAssignment.className,
        subjectId: selectedAssignment.subjectId,
        subjectName: selectedAssignment.subjectName,
        teacherId: selectedAssignment.teacherId,
        teacherName: selectedAssignment.teacherName,
        academicYearId: selectedAssignment.academicYearId,
        semesterId: selectedSemesterId,
        finalScore: row.scoreValid!,
        status: 'draft', // Saved as draft first so teacher can review before submitting
      }));

      await saveGradeEntries(entriesToSave, 'draft');
      setImportResult(`Berhasil mengimpor ${entriesToSave.length} nilai sebagai draft!`);
      setParsedData(null);
      setFileName('');
    } catch (err: any) {
      alert('Gagal mengimpor nilai: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!parsedData) return;
    const errorRows = parsedData.rows
      .filter(r => !r.isValid)
      .map(r => ({
        'Baris Excel': r.rowNumber,
        'NIS': r.nis,
        'NISN': r.nisn,
        'Nama Peserta Didik': r.name,
        'Nilai Mentah': r.scoreRaw,
        'Keterangan Masalah': r.errors.join('; '),
      }));

    exportExcelWorkbook(`Laporan_Kesalahan_Impor_${selectedAssignment?.className}_${selectedAssignment?.subjectName}`, [
      { sheetName: 'Error Report', data: errorRows },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            <span>Impor Nilai Massal (.xlsx)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah berkas Excel nilai hasil olahan mandiri dengan validasi kecocokan NIS, NISN, dan rentang nilai
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Unduh Template Excel Resmi</span>
        </button>
      </div>

      {importResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importResult}</span>
        </div>
      )}

      {/* Assignment selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
        <span className="font-semibold text-slate-600">Pilih Kelas & Mapel Tujuan:</span>
        <select
          value={selectedAssignmentId}
          onChange={(e) => {
            setSelectedAssignmentId(e.target.value);
            setParsedData(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        >
          {myAssignments.map(a => (
            <option key={a.id} value={a.id}>
              {a.className} - {a.subjectName}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Dropzone */}
      {!parsedData && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-purple-400 transition shadow-xs">
          <FileSpreadsheet className="w-12 h-12 text-purple-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Pilih Berkas Nilai Excel (.xlsx)</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Pastikan kolom identitas NIS dan NISN sesuai dengan template unduhan. Nilai yang dimasukkan adalah nilai akhir murni.
          </p>

          <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-900/30 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Pilih Berkas Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Preview Section */}
      {parsedData && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-900">Pratinjau Hasil Pembacaan: {fileName}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Total Baris: <strong>{parsedData.rows.length}</strong> • Valid:{' '}
                <strong className="text-emerald-600">{parsedData.totalValid}</strong> • Bermasalah:{' '}
                <strong className="text-rose-600">{parsedData.totalErrors}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {parsedData.totalErrors > 0 && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 transition"
                >
                  Unduh Laporan Kesalahan
                </button>
              )}

              <button
                onClick={() => setParsedData(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Ganti Berkas
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={isImporting || parsedData.totalValid === 0}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-purple-900/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Impor {parsedData.totalValid} Nilai Valid</span>
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Baris</th>
                    <th className="py-2.5 px-3 w-28">NIS</th>
                    <th className="py-2.5 px-3 w-32">NISN</th>
                    <th className="py-2.5 px-4">Nama Peserta Didik</th>
                    <th className="py-2.5 px-3 text-right">Nilai Lama</th>
                    <th className="py-2.5 px-3 text-right">Nilai Baru</th>
                    <th className="py-2.5 px-3 text-center">Validasi</th>
                    <th className="py-2.5 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.rows.map((row) => {
                    const oldScore = row.matchedStudent ? existingGradesMap.get(row.matchedStudent.id) : undefined;
                    return (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{row.rowNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{row.nis}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{row.nisn}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {oldScore !== undefined ? formatIndonesianNumber(oldScore) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-purple-900">
                          {row.scoreValid !== null ? formatIndonesianNumber(row.scoreValid) : row.scoreRaw || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-600">
                          {row.isValid ? (
                            <span className="text-emerald-700">Identitas cocok</span>
                          ) : (
                            <span className="text-rose-700 font-medium">{row.errors.join(' • ')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
