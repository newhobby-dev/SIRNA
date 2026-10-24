import React, { useState, useRef } from 'react';
import {
  Settings,
  Save,
  School,
  Shield,
  Sliders,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  RefreshCw,
  Cloud,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { SchoolSetting, GradePredicate } from '../../types';

// Helper to compress images to clean, fast Base64 Data URL (max 256x256)
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's an SVG, read text directly
    if (file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SAMPLE_DINAS_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
const SAMPLE_SCHOOL_LOGO =
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80';

export const SchoolSettingsView: React.FC = () => {
  const { schoolSettings, updateSchoolSettings, syncToCloudNow, networkOnline } = useAcademic();

  const [formData, setFormData] = useState<SchoolSetting>({ ...schoolSettings });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDocTitle, setPreviewDocTitle] = useState('LEGER NILAI AKADEMIK KELAS');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const schoolLogoInputRef = useRef<HTMLInputElement>(null);
  const dinasLogoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSchoolSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePredicateChange = (index: number, field: keyof GradePredicate, value: any) => {
    const updated = [...formData.predicates];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, predicates: updated });
  };

  // Image Upload Handlers
  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadFeedback('Mengoptimasi berkas logo sekolah...');
      const dataUrl = await compressImageFile(file);
      setFormData(prev => ({ ...prev, logoUrl: dataUrl }));
      setUploadFeedback('Logo sekolah berhasil dimuat!');
      setTimeout(() => setUploadFeedback(null), 3000);
    } catch (err: any) {
      alert('Gagal mengunggah logo: ' + err.message);
      setUploadFeedback(null);
    } finally {
      e.target.value = '';
    }
  };

  const handleDinasLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadFeedback('Mengoptimasi berkas logo dinas / yayasan...');
      const dataUrl = await compressImageFile(file);
      setFormData(prev => ({ ...prev, dinasLogoUrl: dataUrl }));
      setUploadFeedback('Logo dinas / yayasan berhasil dimuat!');
      setTimeout(() => setUploadFeedback(null), 3000);
    } catch (err: any) {
      alert('Gagal mengunggah logo: ' + err.message);
      setUploadFeedback(null);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>Pengaturan Identitas Sekolah & Kop Surat Resmi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi profil resmi lembaga, unggah logo dinas & sekolah, pratinjau kop surat, kriteria ketuntasan (KKM), dan kebijakan portal
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan & Kop Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      {uploadFeedback && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* LIVE PREVIEW KOP SURAT RESMI (WYSIWYG) */}
      <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Pratinjau Langsung Kop Surat Resmi (Sesuai Hasil Cetak & PDF)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Simulasi Judul:</span>
            <select
              value={previewDocTitle}
              onChange={(e) => setPreviewDocTitle(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="LEGER NILAI AKADEMIK KELAS">LEGER NILAI AKADEMIK KELAS</option>
              <option value="LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)">LAPORAN HASIL BELAJAR (RAPOR)</option>
              <option value="SURAT KETERANGAN PERINGKAT AKADEMIK">SURAT KETERANGAN PERINGKAT</option>
            </select>
          </div>
        </div>

        {/* Paper Document Preview Simulation Container */}
        <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-inner font-serif text-slate-900 select-none">
          {/* Symmetrical Dual-Logo Letterhead */}
          <div className="flex items-center justify-between gap-4 pb-3">
            {/* Logo Kiri: Dinas / Instansi Induk */}
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {formData.dinasLogoUrl ? (
                <img
                  src={formData.dinasLogoUrl}
                  alt="Logo Dinas"
                  className="max-w-[76px] max-h-[76px] object-contain"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              ) : formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo Sekolah"
                  className="max-w-[76px] max-h-[76px] object-contain"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              ) : (
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-sans text-center p-1">
                  Logo Dinas
                </div>
              )}
            </div>

            {/* Header Tengah: Nama Dinas, Sekolah, Alamat, Kontak */}
            <div className="flex-1 text-center px-2">
              <p className="text-xs font-bold tracking-wider uppercase text-slate-800 whitespace-pre-line leading-tight">
                {formData.letterheadHeader || 'PEMERINTAH DAERAH PROVINSI\nDINAS PENDIDIKAN DAN KEBUDAYAAN'}
              </p>
              <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-950 tracking-wide mt-1 leading-snug">
                {formData.schoolName || 'NAMA SEKOLAH BELUM DIATUR'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
                {formData.address || 'Alamat Sekolah'}, {formData.city || 'Kota'}, {formData.province || 'Provinsi'}{' '}
                {formData.postalCode ? (formData.postalCode.toLowerCase().includes('pos') ? formData.postalCode : `Kode Pos ${formData.postalCode}`) : ''}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-600">
                Telepon: {formData.phone || '-'} | NPSN: {formData.npsn || '-'} | Email: {formData.email || '-'}
              </p>
            </div>

            {/* Logo Kanan: Logo Resmi Sekolah */}
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {formData.logoUrl && formData.dinasLogoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo Sekolah"
                  className="max-w-[76px] max-h-[76px] object-contain"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              ) : (
                <div className="w-20 h-20 invisible">
                  {/* Penyeimbang simetris agar teks kop tepat di tengah */}
                </div>
              )}
            </div>
          </div>

          {/* Border Line Style */}
          {formData.letterheadLineStyle === 'single' ? (
            <div className="border-b-2 border-slate-900 mt-1 mb-4"></div>
          ) : formData.letterheadLineStyle === 'thick' ? (
            <div className="border-b-4 border-slate-950 mt-1 mb-4"></div>
          ) : (
            <div className="mt-1 mb-4">
              <div className="border-b-2 border-slate-950"></div>
              <div className="border-b border-slate-900 mt-1"></div>
            </div>
          )}

          {/* Document Title Simulation */}
          <div className="text-center my-3">
            <h3 className="text-sm sm:text-base font-bold uppercase underline tracking-wider text-slate-900">
              {previewDocTitle}
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5 font-sans">
              Tahun Pelajaran 2026/2027 • Semester Ganjil
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* FITUR UNGGAH LOGO SEKOLAH & LOGO DINAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Fitur Unggah Logo Sekolah & Logo Dinas / Yayasan
            </h2>
          </div>

          <p className="text-slate-600 text-xs">
            Unggah logo instansi dalam format PNG, JPG, atau SVG. Gambar otomatis dioptimasi untuk kecepatan pemuatan kop surat dan sinkronisasi cloud.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Logo Dinas / Instansi Induk (Kiri Kop) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Logo Dinas / Instansi Induk (Sisi Kiri Kop)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    Kiri Kop
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Biasanya menggunakan Lambang Tut Wuri Handayani, Lambang Pemerintah Provinsi / Kabupaten, atau Yayasan.
                </p>

                {/* Preview Thumbnail */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white border border-slate-200 mb-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.dinasLogoUrl ? (
                      <img
                        src={formData.dinasLogoUrl}
                        alt="Logo Dinas"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-semibold text-slate-800 text-xs block">
                      {formData.dinasLogoUrl ? 'Logo Dinas Aktif' : 'Belum ada logo terunggah'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                      {formData.dinasLogoUrl ? (formData.dinasLogoUrl.startsWith('data:') ? 'Berkas Unggahan Lokal (Base64)' : formData.dinasLogoUrl) : 'Pilih berkas dari komputer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="file"
                  ref={dinasLogoInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  onChange={handleDinasLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => dinasLogoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Logo Dinas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, dinasLogoUrl: SAMPLE_DINAS_LOGO }))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                  title="Gunakan Logo Resmi Kemdikbud / Tut Wuri Handayani"
                >
                  Gunakan Tut Wuri
                </button>

                {formData.dinasLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dinasLogoUrl: '' }))}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>

            {/* Box 2: Logo Resmi Sekolah (Kanan Kop) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Logo Resmi Sekolah (Sisi Kanan Kop)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Kanan Kop
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Badge / Logo lambang resmi satuan pendidikan (SMA, SMK, SMP, atau Madrasah).
                </p>

                {/* Preview Thumbnail */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white border border-slate-200 mb-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo Sekolah"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-semibold text-slate-800 text-xs block">
                      {formData.logoUrl ? 'Logo Sekolah Aktif' : 'Belum ada logo terunggah'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                      {formData.logoUrl ? (formData.logoUrl.startsWith('data:') ? 'Berkas Unggahan Lokal (Base64)' : formData.logoUrl) : 'Pilih berkas dari komputer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="file"
                  ref={schoolLogoInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  onChange={handleSchoolLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => schoolLogoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Logo Sekolah</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, logoUrl: SAMPLE_SCHOOL_LOGO }))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                  title="Gunakan Logo Sekolah Standar"
                >
                  Contoh Logo
                </button>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* IDENTITAS SEKOLAH & FORMULIR KOP SURAT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <School className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Identitas Resmi Lembaga & Redaksi Kop</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nama Resmi Sekolah *</label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NPSN *</label>
              <input
                type="text"
                required
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jenjang Pendidikan</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                <option value="MA">MA (Madrasah Aliyah)</option>
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Sekolah *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Merdeka No. 10..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kota / Kabupaten *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Contoh: Jakarta Pusat"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provinsi *</label>
              <input
                type="text"
                required
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Contoh: DKI Jakarta"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Kode Pos (Kop Surat) *</span>
                <span className="text-[10px] text-blue-600 font-bold">Muncul di Kop</span>
              </label>
              <input
                type="text"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Contoh: 10110"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telepon Sekolah</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Resmi Sekolah</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Situs Web Resmi (Opsional)</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Teks Kop Surat Dinas / Instansi Induk & Gaya Garis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Teks Kop Surat Dinas / Instansi Induk (Header Dokumen Resmi)
              </label>
              <textarea
                rows={3}
                value={formData.letterheadHeader}
                onChange={(e) => setFormData({ ...formData, letterheadHeader: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono text-xs"
                placeholder="PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA&#10;DINAS PENDIDIKAN DAN KEBUDAYAAN&#10;SEKOLAH MENENGAH ATAS (SMA) NEGERI 1 NUSANTARA"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tips: Gunakan tombol Enter untuk membuat baris baru pada kop surat.
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Gaya Garis Pembatas Kop
              </label>
              <select
                value={formData.letterheadLineStyle || 'double'}
                onChange={(e) => setFormData({ ...formData, letterheadLineStyle: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="double">Garis Ganda (Tebal & Tipis - Standar Resmi)</option>
                <option value="single">Garis Tunggal (Solid 2px)</option>
                <option value="thick">Garis Tebal Tunggal (Solid 4px)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Mempengaruhi garis pemisah pada seluruh cetak buku leger, rapor, dan surat keterangan resmi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Sekolah & Gelar *</label>
              <input
                type="text"
                required
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={formData.principalNip}
                onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* KEBIJAKAN PENILAIAN, SKALA, PREDIKAT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Skala Nilai & Pengaturan Predikat Kelulusan</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batas Ketuntasan Minimum (KKM)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skala Nilai Minimal</label>
              <input
                type="number"
                value={formData.minScore}
                onChange={(e) => setFormData({ ...formData, minScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skala Nilai Maksimal</label>
              <input
                type="number"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Table of Predicates */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Rentang Predikat Akademik</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                    <th className="py-2.5 px-3 w-24">Predikat</th>
                    <th className="py-2.5 px-3 w-28">Nilai Min</th>
                    <th className="py-2.5 px-3 w-28">Nilai Max</th>
                    <th className="py-2.5 px-4">Keterangan / Deskripsi Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.predicates.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-extrabold text-blue-700 font-mono">{p.predicate}</td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="number"
                          value={p.min}
                          onChange={(e) => handlePredicateChange(idx, 'min', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="number"
                          value={p.max}
                          onChange={(e) => handlePredicateChange(idx, 'max', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={p.description}
                          onChange={(e) => handlePredicateChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-200"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* KEBIJAKAN PORTAL SISWA & KEAMANAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">Kebijakan Portal Peserta Didik & Peringkat</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowStudentPortal}
                onChange={(e) => setFormData({ ...formData, allowStudentPortal: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">Aktifkan Portal Mandiri Peserta Didik</span>
                <span className="text-slate-500 text-[11px]">
                  Memperbolehkan peserta didik mengakses nilai publikasi menggunakan NISN dan PIN sekolah
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.portalShowRank}
                onChange={(e) => setFormData({ ...formData, portalShowRank: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">Tampilkan Peringkat Pribadi di Portal Siswa</span>
                <span className="text-slate-500 text-[11px]">
                  Peserta didik dapat melihat peringkat kelas pribadinya (hanya nilai sah yang telah lengkap)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Cloud className={`w-4 h-4 ${networkOnline ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>
              {networkOnline
                ? 'Perubahan akan otomatis disimpan ke Cloud Firestore.'
                : 'Mode offline: perubahan tersimpan di peramban ini dan disinkronkan saat terhubung kembali.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/30 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan ke Cloud...' : 'Simpan Semua Pengaturan & Kop'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
