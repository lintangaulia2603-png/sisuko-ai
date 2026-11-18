import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  MessageSquareText,
  Users,
  XCircle,
} from 'lucide-react';
import {
  DailyVolumePoint,
  NavSection,
  QueueTicket,
  ServiceCategory,
  VillageRecap,
} from '../types.ts';
import {
  QUEUE_STATUS_LABELS,
  SERVICE_SHORT_LABELS,
} from '../data/initialData.ts';

interface DashboardViewProps {
  queueTickets: QueueTicket[];
  weeklyVolume: DailyVolumePoint[];
  villageRecaps: VillageRecap[];
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  queueTickets,
  weeklyVolume,
  villageRecaps,
  onNavigate,
}) => {
  const [chartTab, setChartTab] = useState<'harian' | 'layanan'>('harian');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const metrics = useMemo(() => {
    const extraApplicants = Math.max(0, queueTickets.length - 8);
    const totalToday = 142 + extraApplicants;
    const readyCount = queueTickets.filter((q) => q.status === 'SIAP_DIAMBIL').length;
    const completedToday = 96 + readyCount;
    const inProcessLive = queueTickets.filter(
      (q) =>
        q.status === 'DITERIMA_LOKET' ||
        q.status === 'VERIFIKASI_KASI' ||
        q.status === 'PARAF_CAMAT'
    ).length;
    const totalInProcess = 35 + inProcessLive;
    const avgIkm =
      villageRecaps.length > 0
        ? (
            villageRecaps.reduce((acc, v) => acc + v.ikmScore, 0) /
            villageRecaps.length
          ).toFixed(1)
        : '94.8';

    return {
      totalToday,
      completedToday,
      completionRate: ((completedToday / totalToday) * 100).toFixed(1),
      totalInProcess,
      avgIkm,
      avgServiceMinutes: 14,
    };
  }, [queueTickets, villageRecaps]);

  const serviceDistribution = useMemo(() => {
    const categories: ServiceCategory[] = [
      'KTP',
      'KK',
      'PINDAH_DATANG',
      'SURAT_NIKAH',
      'WARIS',
      'SKU',
    ];
    const totals = categories.map((cat) => {
      const count = villageRecaps.reduce((sum, v) => {
        switch (cat) {
          case 'KTP':
            return sum + v.ktpCount;
          case 'KK':
            return sum + v.kkCount;
          case 'PINDAH_DATANG':
            return sum + v.pindahCount;
          case 'SURAT_NIKAH':
            return sum + v.nikahCount;
          case 'WARIS':
            return sum + v.warisCount;
          case 'SKU':
            return sum + v.skuCount;
        }
      }, 0);
      return {
        category: cat,
        label: SERVICE_SHORT_LABELS[cat],
        count,
      };
    });
    const maxVal = Math.max(...totals.map((t) => t.count), 1);
    return totals.map((t) => ({
      ...t,
      percent: Math.round((t.count / maxVal) * 100),
    }));
  }, [villageRecaps]);

  const revisionTickets = queueTickets.filter((q) => q.status === 'PERLU_REVISI');
  const parafTickets = queueTickets.filter((q) => q.status === 'PARAF_CAMAT');

  const maxWeeklyTotal = Math.max(
    ...weeklyVolume.map((d) => d.totalApplicants),
    150
  );

  return (
    <div className="space-y-6">
      {/* Intro Banner (Single clear focal guidance for citizens & staff) */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 max-w-2xl">
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
            Ringkasan Pelayanan Publik Kecamatan Sukodono
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Pantau antrean loket PATEN, berkas administrasi kependudukan dari 19 desa, serta gunakan asisten AI untuk konsultasi syarat dan pra-verifikasi dokumen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('tanya-sop')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <MessageSquareText className="h-4 w-4 text-blue-700" />
            <span>Tanya SOP AI</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cek-berkas')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Cek Kelengkapan Berkas</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metrics Row */}
      <section aria-label="Indikator Kinerja Pelayanan Hari Ini">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Total Pemohon Hari Ini
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.totalToday}
            </div>
            <div className="mt-1.5 text-xs text-slate-600">
              +12% dibanding kemarin
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Berkas Selesai
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
              {metrics.completedToday}
            </div>
            <div className="mt-1.5 text-xs text-emerald-700 font-medium tabular-nums">
              {metrics.completionRate}% tuntas hari ini
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Berkas Dalam Proses
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-blue-800 tabular-nums">
              {metrics.totalInProcess}
            </div>
            <div className="mt-1.5 text-xs text-slate-600">
              Loket, Kasi &amp; Paraf Camat
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Tingkat Kepuasan (IKM)
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.avgIkm.replace('.', ',')} <span className="text-sm font-normal text-slate-500">/ 100</span>
            </div>
            <div className="mt-1.5 text-xs text-emerald-700 font-medium">
              Kategori Sangat Baik
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Rata-rata Waktu Layanan
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.avgServiceMinutes} <span className="text-sm font-normal text-slate-500">menit</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-600 tabular-nums">
              Standar SOP maksimal 20 menit
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Split: Chart (2/3) + Alerts (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Chart & Service Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                {chartTab === 'harian'
                  ? 'Grafik Pemohon & Penyelesaian Harian'
                  : 'Distribusi Layanan Bulan Berjalan (19 Desa)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartTab === 'harian'
                  ? 'Perbandingan jumlah pemohon masuk dan berkas selesai 6 hari kerja terakhir'
                  : 'Total pengajuan berdasarkan kategori dokumen administrasi'}
              </p>
            </div>
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setChartTab('harian')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartTab === 'harian'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grafik Harian
              </button>
              <button
                type="button"
                onClick={() => setChartTab('layanan')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartTab === 'layanan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Layanan
              </button>
            </div>
          </div>

          {chartTab === 'harian' ? (
            <div className="mt-5">
              {/* Interactive Chart */}
              <div className="flex items-center justify-end gap-5 text-xs text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#0B2244]" />
                  <span>Total Pemohon</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-sky-500" />
                  <span>Berkas Selesai</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-amber-500" />
                  <span>Perlu Revisi</span>
                </div>
              </div>

              <div className="relative h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-200">
                {weeklyVolume.map((point, idx) => {
                  const totalHeight = Math.round(
                    (point.totalApplicants / maxWeeklyTotal) * 100
                  );
                  const completedHeight = Math.round(
                    (point.completed / maxWeeklyTotal) * 100
                  );
                  const isHovered = hoveredDayIdx === idx;
                  return (
                    <div
                      key={point.dateLabel}
                      onMouseEnter={() => setHoveredDayIdx(idx)}
                      onMouseLeave={() => setHoveredDayIdx(null)}
                      className="relative flex-1 flex flex-col items-center h-full justify-end group"
                    >
                      {isHovered && (
                        <div className="absolute -top-2 z-10 rounded-lg border border-slate-200 bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-sm whitespace-nowrap pointer-events-none">
                          <div className="font-semibold">
                            {point.label}, {point.dateLabel}
                          </div>
                          <div className="tabular-nums text-sky-200">
                            Pemohon: {point.totalApplicants} · Selesai: {point.completed} · Revisi: {point.revisions}
                          </div>
                        </div>
                      )}
                      <div className="flex items-end gap-1.5 w-full justify-center h-full">
                        <div
                          style={{ height: `${totalHeight}%` }}
                          className="w-4 sm:w-6 rounded-t bg-[#0B2244] transition-opacity group-hover:opacity-90"
                          title={`Pemohon: ${point.totalApplicants}`}
                        />
                        <div
                          style={{ height: `${completedHeight}%` }}
                          className="w-4 sm:w-6 rounded-t bg-sky-500 transition-opacity group-hover:opacity-90"
                          title={`Selesai: ${point.completed}`}
                        />
                        <div
                          style={{
                            height: `${Math.max(
                              6,
                              Math.round((point.revisions / maxWeeklyTotal) * 100)
                            )}%`,
                          }}
                          className="w-2.5 sm:w-3 rounded-t bg-amber-500 transition-opacity group-hover:opacity-90"
                          title={`Revisi: ${point.revisions}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-2 sm:gap-4 mt-2">
                {weeklyVolume.map((point) => (
                  <div
                    key={point.dateLabel}
                    className="flex-1 text-center text-xs text-slate-600"
                  >
                    <div className="font-medium text-slate-800">{point.label}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {point.dateLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3.5">
              {serviceDistribution.map((item) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                      {item.count.toLocaleString('id-ID')} berkas
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0B2244]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Alerts Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Peringatan &amp; Tindak Lanjut
              </h3>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {revisionTickets.length + parafTickets.length} item aktif
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {revisionTickets.map((ticket) => (
                <div key={ticket.id} className="py-3 first:pt-0">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {ticket.applicantName}
                        </span>
                        <span className="font-mono text-xs text-slate-500 shrink-0 tabular-nums">
                          {ticket.queueNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Desa {ticket.village} · {SERVICE_SHORT_LABELS[ticket.serviceType]}
                      </div>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        {ticket.officerNote}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {parafTickets.map((ticket) => (
                <div key={ticket.id} className="py-3">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          Menunggu Paraf Camat
                        </span>
                        <span className="font-mono text-xs text-slate-500 shrink-0 tabular-nums">
                          {ticket.queueNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ticket.applicantName} (Desa {ticket.village}) · {SERVICE_SHORT_LABELS[ticket.serviceType]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="py-3 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      Sinkronisasi 19 Desa Lengkap
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Rekapitulasi bulanan seluruh desa siap diekspor untuk laporan ke Pemkab Sidoarjo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('antrean')}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <span>Kelola Antrean &amp; Status Berkas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Latest Transparent Queue Preview Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Pelacakan Berkas Terbaru Hari Ini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparansi proses dari Loket PATEN hingga siap diambil warga
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('antrean')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            <span>Lihat semua antrean</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 whitespace-nowrap">No. Antrean</th>
                <th className="px-5 py-3 whitespace-nowrap">Kode Lacak</th>
                <th className="px-5 py-3 whitespace-nowrap">Nama Pemohon</th>
                <th className="px-5 py-3 whitespace-nowrap">Desa</th>
                <th className="px-5 py-3 whitespace-nowrap">Layanan</th>
                <th className="px-5 py-3 whitespace-nowrap">Status Proses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queueTickets.slice(0, 5).map((ticket) => {
                const isReady = ticket.status === 'SIAP_DIAMBIL';
                const isRevision = ticket.status === 'PERLU_REVISI';
                return (
                  <tr key={ticket.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {ticket.queueNumber}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {ticket.trackingCode}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {ticket.applicantName}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {ticket.village}
                    </td>
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                      {SERVICE_SHORT_LABELS[ticket.serviceType]}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isReady
                            ? 'text-emerald-700'
                            : isRevision
                              ? 'text-red-700'
                              : 'text-blue-700'
                        }`}
                      >
                        {isReady ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        ) : isRevision ? (
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{QUEUE_STATUS_LABELS[ticket.status]}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
