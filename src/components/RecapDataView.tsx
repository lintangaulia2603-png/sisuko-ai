import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Search,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VillageRecap } from '../types.ts';

interface RecapDataViewProps {
  villageRecaps: VillageRecap[];
}

type PeriodOption = '2026-11' | '2026-10' | '2026-09';

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '2026-11': 'November 2026',
  '2026-10': 'Oktober 2026',
  '2026-09': 'September 2026',
};

const PERIOD_MULTIPLIERS: Record<PeriodOption, number> = {
  '2026-11': 1,
  '2026-10': 0.94,
  '2026-09': 0.89,
};

export const RecapDataView: React.FC<RecapDataViewProps> = ({
  villageRecaps,
}) => {
  const [period, setPeriod] = useState<PeriodOption>('2026-11');
  const [searchVillage, setSearchVillage] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'ikm' | 'revision'>(
    'name'
  );

  const scaledVillages = useMemo(() => {
    const factor = PERIOD_MULTIPLIERS[period];
    return villageRecaps.map((v) => {
      const ktpCount = Math.round(v.ktpCount * factor);
      const kkCount = Math.round(v.kkCount * factor);
      const pindahCount = Math.round(v.pindahCount * factor);
      const nikahCount = Math.round(v.nikahCount * factor);
      const warisCount = Math.round(v.warisCount * factor);
      const skuCount = Math.round(v.skuCount * factor);
      const totalProcessed =
        ktpCount + kkCount + pindahCount + nikahCount + warisCount + skuCount;
      const revisionCount = Math.max(1, Math.round(v.revisionCount * factor));
      const completedOnTime = Math.max(0, totalProcessed - revisionCount);
      return {
        ...v,
        ktpCount,
        kkCount,
        pindahCount,
        nikahCount,
        warisCount,
        skuCount,
        totalProcessed,
        completedOnTime,
        revisionCount,
      };
    });
  }, [villageRecaps, period]);

  const filteredAndSorted = useMemo(() => {
    const q = searchVillage.trim().toLowerCase();
    const filtered = scaledVillages.filter(
      (v) => !q || v.villageName.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      if (sortBy === 'total') return b.totalProcessed - a.totalProcessed;
      if (sortBy === 'ikm') return b.ikmScore - a.ikmScore;
      if (sortBy === 'revision') return b.revisionCount - a.revisionCount;
      return a.villageName.localeCompare(b.villageName, 'id');
    });
  }, [scaledVillages, searchVillage, sortBy]);

  const totals = useMemo(() => {
    const sum = filteredAndSorted.reduce(
      (acc, v) => ({
        ktp: acc.ktp + v.ktpCount,
        kk: acc.kk + v.kkCount,
        pindah: acc.pindah + v.pindahCount,
        nikah: acc.nikah + v.nikahCount,
        waris: acc.waris + v.warisCount,
        sku: acc.sku + v.skuCount,
        total: acc.total + v.totalProcessed,
        onTime: acc.onTime + v.completedOnTime,
        revisions: acc.revisions + v.revisionCount,
        ikmSum: acc.ikmSum + v.ikmScore,
      }),
      {
        ktp: 0,
        kk: 0,
        pindah: 0,
        nikah: 0,
        waris: 0,
        sku: 0,
        total: 0,
        onTime: 0,
        revisions: 0,
        ikmSum: 0,
      }
    );

    const avgIkm =
      filteredAndSorted.length > 0
        ? (sum.ikmSum / filteredAndSorted.length).toFixed(1)
        : '0.0';
    const onTimeRate =
      sum.total > 0 ? ((sum.onTime / sum.total) * 100).toFixed(1) : '0.0';

    return { ...sum, avgIkm, onTimeRate };
  }, [filteredAndSorted]);

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Official Kop Surat Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PEMERINTAH KABUPATEN SIDOARJO', 148.5, 14, { align: 'center' });
    doc.setFontSize(14);
    doc.text('KECAMATAN SUKODONO', 148.5, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      'Jl. Raya Sukodono No. 1, Sukodono, Kabupaten Sidoarjo, Jawa Timur 61258',
      148.5,
      25,
      { align: 'center' }
    );
    doc.setLineWidth(0.6);
    doc.line(14, 28, 283, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      `LAPORAN REKAPITULASI PELAYANAN PUBLIK (PATEN) — PERIODE ${PERIOD_LABELS[period].toUpperCase()}`,
      14,
      36
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Total Berkas: ${totals.total.toLocaleString('id-ID')}   |   Tepat Waktu: ${totals.onTimeRate}%   |   Rata-rata IKM Kecamatan: ${totals.avgIkm} / 100`,
      14,
      42
    );

    const rows = filteredAndSorted.map((v, idx) => [
      String(idx + 1),
      `Desa ${v.villageName}`,
      String(v.ktpCount),
      String(v.kkCount),
      String(v.pindahCount),
      String(v.nikahCount),
      String(v.warisCount),
      String(v.skuCount),
      String(v.totalProcessed),
      String(v.completedOnTime),
      String(v.revisionCount),
      v.ikmScore.toFixed(1),
    ]);

    rows.push([
      '',
      'TOTAL KECAMATAN SUKODONO',
      String(totals.ktp),
      String(totals.kk),
      String(totals.pindah),
      String(totals.nikah),
      String(totals.waris),
      String(totals.sku),
      String(totals.total),
      String(totals.onTime),
      String(totals.revisions),
      totals.avgIkm,
    ]);

    autoTable(doc, {
      startY: 46,
      head: [
        [
          'No',
          'Nama Desa',
          'KTP-el',
          'KK',
          'Pindah',
          'Nikah',
          'Waris',
          'SKU',
          'Total',
          'Selesai Tepat',
          'Revisi',
          'IKM',
        ],
      ],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: [11, 34, 68], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 44 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === rows.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [241, 245, 249];
        }
      },
    });

    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || 170;

    if (finalY < 175) {
      doc.setFontSize(9);
      doc.text(`Sukodono, ${new Date().toLocaleDateString('id-ID')}`, 225, finalY + 12);
      doc.text('Camat Sukodono', 225, finalY + 17);
      doc.setFont('helvetica', 'bold');
      doc.text('Pemerintah Kabupaten Sidoarjo', 225, finalY + 34);
    }

    doc.save(`Laporan_Rekap_PATEN_Sukodono_${period}.pdf`);
  };

  const handleExportCsv = () => {
    const header = [
      'No',
      'Desa',
      'KTP-el',
      'KK',
      'Pindah Datang',
      'Surat Nikah',
      'Waris',
      'SKU',
      'Total Berkas',
      'Selesai Tepat Waktu',
      'Perlu Revisi',
      'Skor IKM',
    ];
    const lines = filteredAndSorted.map((v, idx) =>
      [
        idx + 1,
        `Desa ${v.villageName}`,
        v.ktpCount,
        v.kkCount,
        v.pindahCount,
        v.nikahCount,
        v.warisCount,
        v.skuCount,
        v.totalProcessed,
        v.completedOnTime,
        v.revisionCount,
        v.ikmScore.toFixed(1),
      ].join(',')
    );
    lines.push(
      [
        '',
        'TOTAL KECAMATAN SUKODONO',
        totals.ktp,
        totals.kk,
        totals.pindah,
        totals.nikah,
        totals.waris,
        totals.sku,
        totals.total,
        totals.onTime,
        totals.revisions,
        totals.avgIkm,
      ].join(',')
    );

    const csvContent = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_19_Desa_Sukodono_${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Official Kop Surat Header */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
        <div className="text-sm font-bold">PEMERINTAH KABUPATEN SIDOARJO</div>
        <div className="text-lg font-bold">KECAMATAN SUKODONO</div>
        <div className="text-xs">
          Jl. Raya Sukodono No. 1, Sidoarjo 61258 · Laporan Bulanan PATEN Periode{' '}
          {PERIOD_LABELS[period]}
        </div>
      </div>

      {/* Header & Export Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 no-print">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
              Rekapitulasi Pelayanan 19 Desa — Kecamatan Sukodono
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Modul Pengolah Data &amp; Informasi untuk sinkronisasi laporan bulanan ke Pemerintah Kabupaten Sidoarjo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Ekspor CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Printer className="h-4 w-4 text-slate-700" />
              <span>Cetak Tabel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143566] transition-colors whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500">Total Berkas (19 Desa)</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {totals.total.toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Selesai Tepat Waktu</div>
            <div className="mt-1 font-display text-xl font-bold text-emerald-700 tabular-nums">
              {totals.onTime.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-medium text-emerald-700">
                ({totals.onTimeRate}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Berkas Perlu Revisi</div>
            <div className="mt-1 font-display text-xl font-bold text-amber-700 tabular-nums">
              {totals.revisions.toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Rata-rata IKM Kecamatan</div>
            <div className="mt-1 font-display text-xl font-bold text-blue-800 tabular-nums">
              {totals.avgIkm} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Pilih periode laporan"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodOption)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
                <option key={p} value={p}>
                  Periode: {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>

            <select
              aria-label="Urutkan tabel desa"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'name' | 'total' | 'ikm' | 'revision'
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="name">Urutkan: Nama Desa (A–Z)</option>
              <option value="total">Urutkan: Berkas Terbanyak</option>
              <option value="ikm">Urutkan: Skor IKM Tertinggi</option>
              <option value="revision">Urutkan: Revisi Terbanyak</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchVillage}
              onChange={(e) => setSearchVillage(e.target.value)}
              placeholder="Cari nama desa..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>
      </div>

      {/* 19 Villages High-Density Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">No</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Desa</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">KTP-el</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">KK</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Pindah</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Nikah</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Waris</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">SKU</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Revisi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">IKM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.map((v, idx) => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                    Desa {v.villageName}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.ktpCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.kkCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.pindahCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.nikahCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.warisCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.skuCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {v.totalProcessed}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-medium text-amber-700 tabular-nums">
                    {v.revisionCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    {v.ikmScore.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100/80 border-t border-slate-300 font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">
                  Total Kecamatan Sukodono ({filteredAndSorted.length} Desa)
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.ktp}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.kk}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.pindah}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.nikah}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.waris}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                  {totals.sku}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-bold tabular-nums">
                  {totals.total.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-amber-800 tabular-nums">
                  {totals.revisions}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-emerald-800 tabular-nums">
                  {totals.avgIkm}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
