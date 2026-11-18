import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Plus,
  Search,
  Ticket,
  X,
  XCircle,
} from 'lucide-react';
import { QueueStatus, QueueTicket, ServiceCategory } from '../types.ts';
import {
  QUEUE_STATUS_LABELS,
  SERVICE_LABELS,
  SERVICE_SHORT_LABELS,
  SUKODONO_VILLAGES,
} from '../data/initialData.ts';

interface QueueTrackingViewProps {
  queueTickets: QueueTicket[];
  onCreateTicket: (payload: {
    applicantName: string;
    nikLast4: string;
    village: string;
    serviceType: ServiceCategory;
    notes: string;
  }) => Promise<QueueTicket>;
  onUpdateTicketStatus: (
    id: string,
    status: QueueStatus,
    officerNote?: string
  ) => Promise<void>;
  isCreateModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
}

const STATUS_FILTERS: Array<{ id: 'ALL' | QueueStatus; label: string }> = [
  { id: 'ALL', label: 'Semua Status' },
  { id: 'DITERIMA_LOKET', label: 'Diterima Loket' },
  { id: 'VERIFIKASI_KASI', label: 'Verifikasi Kasi' },
  { id: 'PARAF_CAMAT', label: 'Paraf Camat' },
  { id: 'SIAP_DIAMBIL', label: 'Siap Diambil' },
  { id: 'PERLU_REVISI', label: 'Perlu Revisi' },
];

const WORKFLOW_STEPS: QueueStatus[] = [
  'DITERIMA_LOKET',
  'VERIFIKASI_KASI',
  'PARAF_CAMAT',
  'SIAP_DIAMBIL',
];

export const QueueTrackingView: React.FC<QueueTrackingViewProps> = ({
  queueTickets,
  onCreateTicket,
  onUpdateTicketStatus,
  isCreateModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QueueStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Queue Form State
  const [applicantName, setApplicantName] = useState('');
  const [nikLast4, setNikLast4] = useState('');
  const [village, setVillage] = useState(SUKODONO_VILLAGES[0]);
  const [serviceType, setServiceType] = useState<ServiceCategory>('KTP');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTicketBanner, setCreatedTicketBanner] =
    useState<QueueTicket | null>(null);

  const filteredTickets = useMemo(() => {
    return queueTickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === 'ALL' || ticket.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ticket.trackingCode.toLowerCase().includes(q) ||
        ticket.queueNumber.toLowerCase().includes(q) ||
        ticket.applicantName.toLowerCase().includes(q) ||
        ticket.village.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [queueTickets, statusFilter, searchQuery]);

  const activeCounters = useMemo(() => {
    const getLatestForCounter = (counterName: string) =>
      queueTickets.find(
        (t) => t.counter === counterName && t.status !== 'SIAP_DIAMBIL'
      ) || queueTickets.find((t) => t.counter === counterName);

    return [
      {
        counter: 'Loket 1',
        scope: 'KTP-el & Kartu Keluarga',
        current: getLatestForCounter('Loket 1'),
        waitingCount: queueTickets.filter(
          (t) =>
            t.counter === 'Loket 1' &&
            t.status !== 'SIAP_DIAMBIL' &&
            t.status !== 'PERLU_REVISI'
        ).length,
      },
      {
        counter: 'Loket 2',
        scope: 'Pindah Datang & Surat Nikah',
        current: getLatestForCounter('Loket 2'),
        waitingCount: queueTickets.filter(
          (t) =>
            t.counter === 'Loket 2' &&
            t.status !== 'SIAP_DIAMBIL' &&
            t.status !== 'PERLU_REVISI'
        ).length,
      },
      {
        counter: 'Loket 3',
        scope: 'Surat Waris & SKU UMKM',
        current: getLatestForCounter('Loket 3'),
        waitingCount: queueTickets.filter(
          (t) =>
            t.counter === 'Loket 3' &&
            t.status !== 'SIAP_DIAMBIL' &&
            t.status !== 'PERLU_REVISI'
        ).length,
      },
    ];
  }, [queueTickets]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      setFormError('Nama lengkap pemohon wajib diisi.');
      return;
    }
    if (nikLast4.replace(/\D/g, '').length < 4) {
      setFormError('Masukkan 4 digit terakhir NIK pemohon untuk verifikasi.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await onCreateTicket({
        applicantName: applicantName.trim(),
        nikLast4: nikLast4.trim(),
        village,
        serviceType,
        notes: notes.trim(),
      });
      setCreatedTicketBanner(created);
      setApplicantName('');
      setNikLast4('');
      setNotes('');
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal mengambil nomor antrean.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: QueueStatus) => {
    setUpdatingId(id);
    setActionError(null);
    try {
      await onUpdateTicketStatus(id, nextStatus);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal memperbarui status berkas.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNote = async (ticket: QueueTicket) => {
    setUpdatingId(ticket.id);
    setActionError(null);
    try {
      await onUpdateTicketStatus(ticket.id, ticket.status, editingNoteText.trim());
      setEditingNoteId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal menyimpan catatan petugas.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyTracking = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard blocked in sandboxed iframe; ignore gracefully
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Ticket Created Confirmation */}
      {createdTicketBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Ticket className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-emerald-950">
                Nomor Antrean Berhasil Diterbitkan: {createdTicketBanner.queueNumber}
              </div>
              <p className="text-xs text-emerald-900 mt-0.5">
                Kode Lacak:{' '}
                <span className="font-mono font-semibold">
                  {createdTicketBanner.trackingCode}
                </span>{' '}
                · Pemohon: {createdTicketBanner.applicantName} (Desa{' '}
                {createdTicketBanner.village}) · Silakan menuju{' '}
                {createdTicketBanner.counter}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => handleCopyTracking(createdTicketBanner.trackingCode)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCreatedTicketBanner(null)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Live Loket PATEN Cards */}
      <section aria-label="Status Antrean Loket PATEN">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {activeCounters.map((item) => (
            <div
              key={item.counter}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-blue-800">
                  {item.counter}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {item.waitingCount} berkas dalam proses
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.scope}</div>
              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <div>
                  <div className="text-[11px] text-slate-500">
                    Antrean Aktif
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {item.current ? item.current.queueNumber : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-800">
                    {item.current ? item.current.applicantName : 'Belum ada'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.current ? `Desa ${item.current.village}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Transparent Tracking Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
                Pelacakan Status Berkas &amp; Antrean Loket PATEN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau tahapan berkas secara transparan: Diterima Loket → Verifikasi Kasi → Paraf Camat → Siap Diambil
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#143566] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Ambil Antrean Online</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {STATUS_FILTERS.map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode lacak, nama, atau desa..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Antrean / Kode</th>
                <th className="px-4 py-3 whitespace-nowrap">Pemohon &amp; Desa</th>
                <th className="px-4 py-3 whitespace-nowrap">Jenis Layanan</th>
                <th className="px-4 py-3 whitespace-nowrap">Progres Tahapan</th>
                <th className="px-4 py-3 whitespace-nowrap">Status &amp; Catatan</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">
                  Perbarui Status (Petugas)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Tidak ada berkas yang cocok dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const isReady = ticket.status === 'SIAP_DIAMBIL';
                  const isRevision = ticket.status === 'PERLU_REVISI';
                  const currentStepIdx = WORKFLOW_STEPS.indexOf(ticket.status);

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/70 align-top">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {ticket.queueNumber}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {ticket.trackingCode}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {ticket.counter} · {ticket.submittedAt}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {ticket.applicantName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Desa {ticket.village}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                          NIK: {ticket.maskedNik}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {SERVICE_SHORT_LABELS[ticket.serviceType]}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Est: {ticket.estimatedReady}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 min-w-[200px]">
                        {isRevision ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Tertahan — butuh kelengkapan</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-4 gap-1">
                              {WORKFLOW_STEPS.map((step, i) => {
                                const done =
                                  currentStepIdx >= i || isReady;
                                return (
                                  <div
                                    key={step}
                                    className={`h-1.5 rounded-full ${
                                      done
                                        ? isReady
                                          ? 'bg-emerald-600'
                                          : 'bg-blue-700'
                                        : 'bg-slate-200'
                                    }`}
                                    title={QUEUE_STATUS_LABELS[step]}
                                  />
                                );
                              })}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Tahap {Math.max(1, currentStepIdx + 1)} dari 4 ·{' '}
                              {QUEUE_STATUS_LABELS[ticket.status]}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <div
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isReady
                              ? 'text-emerald-700'
                              : isRevision
                                ? 'text-red-700'
                                : 'text-blue-800'
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
                        </div>
                        {editingNoteId === ticket.id ? (
                          <div className="mt-1.5 space-y-1.5">
                            <input
                              type="text"
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                              placeholder="Tulis catatan petugas..."
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={updatingId === ticket.id}
                                onClick={() => handleSaveNote(ticket)}
                                className="rounded bg-[#0B2244] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#143566]"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNoteId(null)}
                                className="text-[11px] text-slate-600 hover:text-slate-900"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-start justify-between gap-2">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {ticket.officerNote}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(ticket.id);
                                setEditingNoteText(ticket.officerNote);
                              }}
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Ubah catatan petugas"
                              aria-label={`Ubah catatan antrean ${ticket.queueNumber}`}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <select
                          aria-label={`Ubah status antrean ${ticket.queueNumber}`}
                          disabled={updatingId === ticket.id}
                          value={ticket.status}
                          onChange={(e) =>
                            handleStatusChange(
                              ticket.id,
                              e.target.value as QueueStatus
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
                        >
                          {(
                            Object.keys(QUEUE_STATUS_LABELS) as QueueStatus[]
                          ).map((st) => (
                            <option key={st} value={st}>
                              {QUEUE_STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ambil Nomor Antrean Online */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-queue-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div>
                <h3
                  id="modal-queue-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Ambil Nomor Antrean Online Loket PATEN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kecamatan Sukodono, Kabupaten Sidoarjo
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseCreateModal}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                aria-label="Tutup form antrean"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="queue-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nama Lengkap Pemohon (sesuai KTP)
                </label>
                <input
                  id="queue-name"
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="queue-nik4"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    4 Digit Terakhir NIK
                  </label>
                  <input
                    id="queue-nik4"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={nikLast4}
                    onChange={(e) =>
                      setNikLast4(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="Contoh: 0014"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="queue-village"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Asal Desa (Kec. Sukodono)
                  </label>
                  <select
                    id="queue-village"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    {SUKODONO_VILLAGES.map((v) => (
                      <option key={v} value={v}>
                        Desa {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="queue-service"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Jenis Layanan yang Diajukan
                </label>
                <select
                  id="queue-service"
                  value={serviceType}
                  onChange={(e) =>
                    setServiceType(e.target.value as ServiceCategory)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
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
                  htmlFor="queue-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="queue-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pengajuan cetak KTP rusak / pindah masuk keluarga"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0B2244] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143566] disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Terbitkan Nomor Antrean'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
