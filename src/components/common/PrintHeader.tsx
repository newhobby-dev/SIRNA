import React from 'react';
import { useAcademic } from '../../context/AcademicContext';

interface PrintHeaderProps {
  documentTitle: string;
  subTitle?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ documentTitle, subTitle }) => {
  const { schoolSettings } = useAcademic();

  return (
    <div className="mb-6">
      {/* Kop Surat Resmi */}
      <div className="flex items-center justify-between pb-3">
        {/* Logo Kiri: Dinas / Instansi Induk */}
        <div className="w-20 h-20 flex items-center justify-center shrink-0">
          {schoolSettings.dinasLogoUrl ? (
            <img
              src={schoolSettings.dinasLogoUrl}
              alt="Logo Dinas / Yayasan"
              className="max-w-[76px] max-h-[76px] object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : schoolSettings.logoUrl ? (
            <img
              src={schoolSettings.logoUrl}
              alt="Logo Sekolah"
              className="max-w-[76px] max-h-[76px] object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[9px] text-slate-400 text-center p-1">
              Logo Dinas
            </div>
          )}
        </div>

        {/* Header Tengah: Nama Dinas, Sekolah, Alamat, Kontak */}
        <div className="flex-1 text-center px-4">
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-800 whitespace-pre-line leading-tight">
            {schoolSettings.letterheadHeader || 'PEMERINTAH DAERAH PROVINSI\nDINAS PENDIDIKAN'}
          </p>
          <h1 className="text-xl font-extrabold uppercase text-slate-950 tracking-wide mt-1">
            {schoolSettings.schoolName}
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            {schoolSettings.address}, {schoolSettings.city}, {schoolSettings.province}{' '}
            {schoolSettings.postalCode ? (schoolSettings.postalCode.toLowerCase().includes('pos') ? schoolSettings.postalCode : `Kode Pos ${schoolSettings.postalCode}`) : ''}
          </p>
          <p className="text-[11px] text-slate-600">
            Telepon: {schoolSettings.phone} | NPSN: {schoolSettings.npsn} | Email: {schoolSettings.email}
          </p>
        </div>

        {/* Logo Kanan: Logo Resmi Sekolah (atau spacer penyeimbang) */}
        <div className="w-20 h-20 flex items-center justify-center shrink-0">
          {schoolSettings.logoUrl && schoolSettings.dinasLogoUrl ? (
            <img
              src={schoolSettings.logoUrl}
              alt="Logo Sekolah"
              className="max-w-[76px] max-h-[76px] object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-20 h-20 invisible">
              {/* Spacer penyeimbang simetris untuk cetak */}
            </div>
          )}
        </div>
      </div>

      {/* Kop Surat Garis Pembatas (Kustomisasi: Ganda, Tunggal, Tebal) */}
      {schoolSettings.letterheadLineStyle === 'single' ? (
        <div className="border-b-2 border-slate-900 mt-2 mb-4"></div>
      ) : schoolSettings.letterheadLineStyle === 'thick' ? (
        <div className="border-b-4 border-slate-950 mt-2 mb-4"></div>
      ) : (
        /* Default: Garis Ganda Resmi (Tebal + Tipis) */
        <div className="mt-2 mb-4">
          <div className="border-b-2 border-slate-950"></div>
          <div className="border-b border-slate-900 mt-1"></div>
        </div>
      )}

      {/* Judul Dokumen */}
      <div className="text-center my-3">
        <h2 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
          {documentTitle}
        </h2>
        {subTitle && <p className="text-xs text-slate-700 mt-1">{subTitle}</p>}
      </div>
    </div>
  );
};
