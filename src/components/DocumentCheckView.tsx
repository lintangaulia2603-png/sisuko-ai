import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  RotateCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  DocumentVerificationResult,
  ServiceCategory,
  SopDocument,
} from '../types.ts';
import { SERVICE_LABELS } from '../data/initialData.ts';

interface DocumentCheckViewProps {
  sops: SopDocument[];
}

const DOCUMENT_TYPES_BY_SERVICE: Record<ServiceCategory, string[]> = {
  KTP: [
    'Surat Pengantar Pemerintah Desa',
    'Kartu Keluarga (KK) Barcode TTE',
    'KTP-el Lama (Rusak/Perubahan)',
    'Surat Kehilangan Polsek',
  ],
  KK: [
    'Formulir Permohonan F-1.02 dari Desa',
    'Kartu Keluarga (KK) Asli Lama',
    'Fotokopi Buku Nikah / Akta Perkawinan',
    'Surat Keterangan Lahir / Akta Kematian',
  ],
  PINDAH_DATANG: [
    'Formulir Pendaftaran Pindah F-1.03',
    'Surat Keterangan Pindah (SKPWNI)',
    'Kartu Keluarga (KK) Asli',
    'Surat Pernyataan Tidak Keberatan Menumpang KK',
  ],
  SURAT_NIKAH: [
    'Surat Pengantar Nikah Desa (Model N1-N4)',
    'KTP-el / KK Calon Mempelai',
    'Akta Kelahiran / Ijazah Terakhir',
    'Surat Pengantar KUA (Dispensasi Nikah)',
  ],
  WARIS: [
    'Surat Pernyataan Ahli Waris Bermaterai & TTD Desa',
    'Akta Kematian / Surat Kematian Pewaris',
    'Kartu Keluarga & KTP Seluruh Ahli Waris',
    'Akta Kelahiran Anak / Ahli Waris',
  ],
  SKU: [
    'Surat Keterangan Usaha (SKU) Asli dari Desa',
    'KTP-el Pemilik Usaha',
    'Kartu Keluarga (KK) Pemohon',
    'Foto Lokasi / Tempat Usaha UMKM',
  ],
};

function generateSampleDocumentDataUrl(mode: 'clear' | 'blurry'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (mode === 'blurry') {
    ctx.filter = 'blur(5px)';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(40, 40, 880, 560);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('SURAT PENGANTAR DESA (TERPOTONG)', -60, 110);
    ctx.font = '18px sans-serif';
    ctx.fillText('Nama: Bpk. Sukirman ... NIK: 351513...', 120, 260);
    // Dark shadow overlay simulating poor lighting
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  // Clear formal sample Surat Pengantar Desa
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, 888, 568);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PEMERINTAH KABUPATEN SIDOARJO', 480, 84);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('KECAMATAN SUKODONO — PEMERINTAH DESA JUMPUTREJO', 480, 114);
  ctx.font = '14px sans-serif';
  ctx.fillText('Jl. Raya Jumputrejo No. 12, Sukodono, Sidoarjo 61258', 480, 138);

  ctx.beginPath();
  ctx.moveTo(72, 156);
  ctx.lineTo(888, 156);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SURAT PENGANTAR PELAYANAN ADMINISTRASI KEPENDUDUKAN', 480, 196);
  ctx.font = '14px monospace';
  ctx.fillText('Nomor: 470 / 118 / 438.7.9.05 / 2026', 480, 220);

  ctx.textAlign = 'left';
  ctx.font = '16px sans-serif';
  const lines = [
    'Yang bertanda tangan di bawah ini Kepala Desa Jumputrejo menerangkan bahwa:',
    'Nama Lengkap        : SITI AMINAH',
    'NIK                            : 3515135408920004',
    'Nomor KK                  : 3515131102180012',
    'Alamat                       : Dusun Jumput RT 04 / RW 02, Desa Jumputrejo, Kec. Sukodono',
    'Keperluan                  : Pengurusan KTP-el / Kartu Keluarga di Loket PATEN Kecamatan',
  ];
  lines.forEach((line, idx) => {
    ctx.fillText(line, 84, 270 + idx * 34);
  });

  // Official Stamp & Signature Simulation
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(690, 505, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PEMERINTAH DESA', 690, 500);
  ctx.fillText('JUMPUTREJO', 690, 516);

  ctx.fillStyle = '#0f172a';
  ctx.font = '15px sans-serif';
  ctx.fillText('Sukodono, 17 November 2026', 720, 465);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Kepala Desa Jumputrejo', 720, 488);
  ctx.fillText('( H. WIDODO, S.Sos )', 720, 560);

  return canvas.toDataURL('image/png');
}

export const DocumentCheckView: React.FC<DocumentCheckViewProps> = ({ sops }) => {
  const [serviceType, setServiceType] = useState<ServiceCategory>('KTP');
  const [documentType, setDocumentType] = useState<string>(
    DOCUMENT_TYPES_BY_SERVICE.KTP[0]
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [fileName, setFileName] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<DocumentVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const matchedSop = useMemo(
    () => sops.find((s) => s.serviceType === serviceType && s.active),
    [sops, serviceType]
  );

  const handleServiceChange = (nextService: ServiceCategory) => {
    setServiceType(nextService);
    setDocumentType(DOCUMENT_TYPES_BY_SERVICE[nextService][0]);
    setResult(null);
    setErrorMessage(null);
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        'Mohon unggah berkas berupa gambar/foto (JPG, PNG, atau WebP).'
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Ukuran foto maksimal 10 MB.');
      return;
    }

    setErrorMessage(null);
    setResult(null);
    setRotation(0);
    setFileName(file.name);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = (mode: 'clear' | 'blurry') => {
    const dataUrl = generateSampleDocumentDataUrl(mode);
    setPreviewUrl(dataUrl);
    setMimeType('image/png');
    setFileName(
      mode === 'clear'
        ? 'contoh_surat_pengantar_desa_jelas.png'
        : 'contoh_foto_buram_terpotong.png'
    );
    setRotation(0);
    setResult(null);
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setFileName('');
    setResult(null);
    setErrorMessage(null);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerify = async () => {
    if (!previewUrl || isVerifying) return;
    setIsVerifying(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType,
          serviceType,
          documentType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memverifikasi foto dokumen.');
      }
      setResult(data.result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan saat memeriksa foto berkas.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form & Upload Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
                Pra-Verifikasi Kelengkapan Berkas Mandiri
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Unggah foto dokumen Anda agar AI memeriksa kejernihan gambar, keterbacaan tulisan, dan kesesuaian syarat sebelum Anda datang ke loket PATEN.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="service-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  1. Pilih Layanan Kecamatan
                </label>
                <select
                  id="service-select"
                  value={serviceType}
                  onChange={(e) =>
                    handleServiceChange(e.target.value as ServiceCategory)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {(Object.keys(SERVICE_LABELS) as ServiceCategory[]).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {SERVICE_LABELS[cat]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="doc-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  2. Pilih Dokumen yang Diunggah
                </label>
                <select
                  id="doc-select"
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    setResult(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {DOCUMENT_TYPES_BY_SERVICE[serviceType].map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Zone */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  3. Unggah Foto Dokumen (JPG / PNG)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSample('clear')}
                    className="text-xs font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2"
                  >
                    Uji Contoh Jelas
                  </button>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('blurry')}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    Uji Contoh Buram
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
                className="sr-only"
                id="document-upload-input"
              />

              {!previewUrl ? (
                <label
                  htmlFor="document-upload-input"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelected(e.dataTransfer.files?.[0]);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-blue-700 mb-3">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    Klik untuk pilih foto atau seret berkas ke sini
                  </div>
                  <p className="mt-1 text-xs text-slate-500 max-w-md">
                    Pastikan pencahayaan terang, tulisan tidak buram, dan keempat sudut dokumen terlihat utuh (Maks. 10 MB).
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800">
                    <Camera className="h-4 w-4 text-blue-700" />
                    <span>Ambil Foto / Pilih File</span>
                  </div>
                </label>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-800 truncate">
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Putar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5 max-h-80 p-2">
                    <img
                      src={previewUrl}
                      alt={`Pratinjau dokumen ${documentType}`}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className="max-h-72 w-auto object-contain transition-transform duration-150"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-500">
                Acuan SOP:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {matchedSop?.code || 'SOP-PATEN'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={!previewUrl || isVerifying}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143566] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>
                  {isVerifying
                    ? 'Sedang Memeriksa Foto...'
                    : 'Periksa Kelengkapan dengan AI'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Result & Checklist Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Verification Result Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Hasil Pra-Verifikasi Visual
            </h3>

            {!result && !isVerifying && (
              <div className="py-8 text-center space-y-2">
                <FileWarning className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-sm font-medium text-slate-700">
                  Belum ada berkas yang diperiksa
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Pilih jenis layanan, unggah foto dokumen atau klik contoh foto uji, lalu tekan tombol periksa untuk melihat hasil validasi.
                </p>
              </div>
            )}

            {isVerifying && (
              <div className="py-10 text-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700 mx-auto" />
                <div className="text-sm font-medium text-slate-800">
                  Menganalisis ketajaman &amp; kesesuaian dokumen...
                </div>
                <p className="text-xs text-slate-500">
                  Membandingkan foto dengan standar {matchedSop?.code || 'SOP Kecamatan'}.
                </p>
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-4">
                {/* Status Banner with explicit icon + label (no hue-only) */}
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3.5 ${
                    result.status === 'SESUAI'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : result.status === 'PERLU_REVISI'
                        ? 'border-amber-200 bg-amber-50 text-amber-950'
                        : 'border-red-200 bg-red-50 text-red-950'
                  }`}
                >
                  {result.status === 'SESUAI' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : result.status === 'PERLU_REVISI' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold">
                      {result.status === 'SESUAI'
                        ? 'Dokumen Memenuhi Syarat Awal'
                        : result.status === 'PERLU_REVISI'
                          ? 'Perlu Perbaikan Foto / Kelengkapan'
                          : 'Dokumen Ditolak / Tidak Sesuai'}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed">
                      {result.summary}
                    </p>
                  </div>
                </div>

                {/* Clarity Score Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      Kejernihan &amp; Keterbacaan Visual
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {result.clarityScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        result.clarityScore >= 75
                          ? 'bg-emerald-600'
                          : result.clarityScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, result.clarityScore))}%` }}
                    />
                  </div>
                </div>

                {/* Itemized Checklist */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Rincian Pemeriksaan AI:
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {result.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 text-xs"
                      >
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {item.item}
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            {item.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-800">
                      Saran Tindak Lanjut:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
                      {result.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SOP Requirements Reference Card */}
          {matchedSop && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Syarat Lengkap ({matchedSop.code})
                </h3>
                <span className="text-xs font-medium text-emerald-700">
                  {matchedSop.fee}
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {matchedSop.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-blue-700 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span className="leading-relaxed">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
