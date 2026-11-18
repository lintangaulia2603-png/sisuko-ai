import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import {
  ServiceCategory,
  SopDocument,
  SopGroup,
  StaffAccount,
  StaffRole,
} from '../types.ts';
import {
  SERVICE_LABELS,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_PERMISSIONS,
} from '../data/initialData.ts';

interface SopSettingsViewProps {
  sops: SopDocument[];
  staffAccounts: StaffAccount[];
  currentUser: StaffAccount;
  onCreateSop: (sop: Omit<SopDocument, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateSop: (id: string, sop: Partial<SopDocument>) => Promise<void>;
  onDeleteSop: (id: string) => Promise<void>;
  onCreateStaff: (
    staff: Omit<StaffAccount, 'id' | 'lastLogin'>
  ) => Promise<void>;
  onUpdateStaff: (id: string, updates: Partial<StaffAccount>) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onOpenLoginModal: () => void;
}

type SettingsTab = 'dokumen' | 'umum' | 'akun';

export const SopSettingsView: React.FC<SopSettingsViewProps> = ({
  sops,
  staffAccounts,
  currentUser,
  onCreateSop,
  onUpdateSop,
  onDeleteSop,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
  onOpenLoginModal,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('dokumen');

  // SOP Modal States
  const [editingSop, setEditingSop] = useState<SopDocument | null>(null);
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [group, setGroup] = useState<SopGroup>('LAYANAN_DOKUMEN');
  const [serviceType, setServiceType] = useState<ServiceCategory | 'UMUM'>(
    'KTP'
  );
  const [title, setTitle] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [fee, setFee] = useState('Gratis (Rp 0)');
  const [requirementsText, setRequirementsText] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [savingSop, setSavingSop] = useState(false);
  const [sopErrorMsg, setSopErrorMsg] = useState<string | null>(null);

  // Staff Modal States
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffFullName, setStaffFullName] = useState('');
  const [staffNip, setStaffNip] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('PETUGAS_LOKET_1');
  const [staffCounter, setStaffCounter] = useState('Loket 1 (KTP-el & KK)');
  const [staffPin, setStaffPin] = useState('123456');
  const [staffActive, setStaffActive] = useState(true);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffErrorMsg, setStaffErrorMsg] = useState<string | null>(null);
  const [confirmDeleteSopId, setConfirmDeleteSopId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);

  const documentSops = useMemo(
    () => sops.filter((s) => s.group !== 'STANDAR_UMUM' && s.serviceType !== 'UMUM'),
    [sops]
  );

  const generalSops = useMemo(
    () => sops.filter((s) => s.group === 'STANDAR_UMUM' || s.serviceType === 'UMUM'),
    [sops]
  );

  const displayedSops = activeTab === 'umum' ? generalSops : documentSops;

  const openNewSopModal = (defaultGroup: SopGroup) => {
    setEditingSop(null);
    setGroup(defaultGroup);
    if (defaultGroup === 'STANDAR_UMUM') {
      setCode(`SOP-UMUM-0${generalSops.length + 1}`);
      setServiceType('UMUM');
      setEstimatedTime('Berlaku di seluruh loket PATEN');
    } else {
      setCode(`SOP-PATEN-0${documentSops.length + 1}`);
      setServiceType('KTP');
      setEstimatedTime('1 hari kerja');
    }
    setTitle('');
    setLegalBasis(
      'Perbup Sidoarjo tentang Pelayanan Administrasi Terpadu Kecamatan'
    );
    setFee('Gratis (Rp 0)');
    setRequirementsText(
      'Surat Pengantar Pemerintah Desa.\nFotokopi KTP-el dan Kartu Keluarga (KK).'
    );
    setNotes('');
    setActive(true);
    setSopErrorMsg(null);
    setIsSopModalOpen(true);
  };

  const openEditSopModal = (sop: SopDocument) => {
    setEditingSop(sop);
    setCode(sop.code);
    setGroup(sop.group || (sop.serviceType === 'UMUM' ? 'STANDAR_UMUM' : 'LAYANAN_DOKUMEN'));
    setServiceType(sop.serviceType);
    setTitle(sop.title);
    setLegalBasis(sop.legalBasis);
    setEstimatedTime(sop.estimatedTime);
    setFee(sop.fee);
    setRequirementsText(sop.requirements.join('\n'));
    setNotes(sop.notes);
    setActive(sop.active);
    setSopErrorMsg(null);
    setIsSopModalOpen(true);
  };

  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      setSopErrorMsg('Kode SOP dan judul layanan wajib diisi.');
      return;
    }

    const requirements = requirementsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setSavingSop(true);
    setSopErrorMsg(null);
    try {
      if (editingSop) {
        await onUpdateSop(editingSop.id, {
          code: code.trim().toUpperCase(),
          group,
          serviceType,
          title: title.trim(),
          legalBasis: legalBasis.trim(),
          estimatedTime: estimatedTime.trim(),
          fee: fee.trim(),
          requirements,
          notes: notes.trim(),
          active,
        });
      } else {
        await onCreateSop({
          code: code.trim().toUpperCase(),
          group,
          serviceType,
          title: title.trim(),
          legalBasis: legalBasis.trim(),
          estimatedTime: estimatedTime.trim(),
          fee: fee.trim(),
          requirements,
          notes: notes.trim(),
          active,
        });
      }
      setIsSopModalOpen(false);
    } catch (err) {
      setSopErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan regulasi SOP.'
      );
    } finally {
      setSavingSop(false);
    }
  };

  const openNewStaffModal = () => {
    setEditingStaff(null);
    setStaffFullName('');
    setStaffNip('');
    setStaffUsername('');
    setStaffEmail('');
    setStaffRole('PETUGAS_LOKET_1');
    setStaffCounter('Loket 1 (KTP-el & KK)');
    setStaffPin('123456');
    setStaffActive(true);
    setStaffErrorMsg(null);
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setStaffFullName(staff.fullName);
    setStaffNip(staff.nip);
    setStaffUsername(staff.username);
    setStaffEmail(staff.email);
    setStaffRole(staff.role);
    setStaffCounter(staff.counterAssignment);
    setStaffPin('••••••');
    setStaffActive(staff.active);
    setStaffErrorMsg(null);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffUsername.trim()) {
      setStaffErrorMsg('Nama lengkap dan username wajib diisi.');
      return;
    }
    if (!editingStaff && staffPin.replace(/\D/g, '').length !== 6) {
      setStaffErrorMsg('PIN awal petugas harus 6 digit angka.');
      return;
    }

    setSavingStaff(true);
    setStaffErrorMsg(null);
    try {
      if (editingStaff) {
        await onUpdateStaff(editingStaff.id, {
          fullName: staffFullName.trim(),
          nip: staffNip.trim(),
          username: staffUsername.trim().toLowerCase(),
          email: staffEmail.trim(),
          role: staffRole,
          counterAssignment: staffCounter.trim(),
          pinCode: staffPin,
          active: staffActive,
        });
      } else {
        await onCreateStaff({
          fullName: staffFullName.trim(),
          nip: staffNip.trim() || '-',
          username: staffUsername.trim().toLowerCase(),
          email:
            staffEmail.trim() ||
            `${staffUsername.trim().toLowerCase()}@sukodono.sidoarjokab.go.id`,
          role: staffRole,
          counterAssignment: staffCounter.trim(),
          pinCode: staffPin.replace(/\D/g, ''),
          active: staffActive,
        });
      }
      setIsStaffModalOpen(false);
    } catch (err) {
      setStaffErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan akun petugas.'
      );
    } finally {
      setSavingStaff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Navigation & Action Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
              Regulasi SOP Pelayanan &amp; Manajemen Akun Petugas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Kelola standar operasional pelayanan publik PATEN, panduan umum loket, serta akses akun 5 personel bagian pelayanan Kecamatan Sukodono.
            </p>
          </div>

          {activeTab === 'akun' ? (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <KeyRound className="h-4 w-4 text-blue-700" />
                <span>Uji Masuk Akun</span>
              </button>
              <button
                type="button"
                onClick={openNewStaffModal}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#143566] whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                <span>Tambah Akun Petugas</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                openNewSopModal(
                  activeTab === 'umum' ? 'STANDAR_UMUM' : 'LAYANAN_DOKUMEN'
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#143566] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>
                {activeTab === 'umum'
                  ? 'Tambah SOP Umum Baru'
                  : 'Tambah SOP Layanan Baru'}
              </span>
            </button>
          )}
        </div>

        {/* 3 Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 w-fit max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('dokumen')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'dokumen'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SOP Layanan Dokumen ({documentSops.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('umum')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'umum'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SOP Umum &amp; Etika Pelayanan ({generalSops.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('akun')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'akun'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akun Petugas Pelayanan ({staffAccounts.length})
          </button>
        </div>
      </div>

      {/* TAB 1 & 2: SOP CARDS */}
      {activeTab !== 'akun' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {displayedSops.map((sop) => (
            <div
              key={sop.id}
              className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-blue-800">
                        {sop.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {sop.serviceType === 'UMUM'
                          ? 'Standar Umum Pelayanan'
                          : SERVICE_LABELS[sop.serviceType]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        Diperbarui {sop.updatedAt}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-base font-semibold text-slate-900">
                      {sop.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSop(sop.id, { active: !sop.active })}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                      sop.active ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {sop.active ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Aktif</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span>Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-800">
                      Dasar Hukum:{' '}
                    </span>
                    {sop.legalBasis}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong className="text-slate-800">Estimasi:</strong>{' '}
                      {sop.estimatedTime}
                    </span>
                    <span>
                      <strong className="text-slate-800">Tarif:</strong>{' '}
                      {sop.fee}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-slate-800 mb-1.5">
                    Ketentuan &amp; Persyaratan ({sop.requirements.length} poin):
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-700">
                    {sop.requirements.map((req, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {req}
                      </li>
                    ))}
                  </ol>
                </div>

                {sop.notes && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <strong className="text-slate-800">Catatan:</strong>{' '}
                    {sop.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openEditSopModal(sop)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Ubah Regulasi</span>
                </button>
                {confirmDeleteSopId === sop.id ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteSop(sop.id);
                        setConfirmDeleteSopId(null);
                      }}
                      className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSopId(null)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSopId(sop.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: 5 STAFF ACCOUNTS MANAGEMENT */}
      {activeTab === 'akun' && (
        <div className="space-y-6">
          {/* 4-Step Guide for Setting Up 5 Staff Accounts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Shield className="h-4 w-4 text-blue-700" />
              <span>
                Panduan Pembagian &amp; Pembuatan Akun untuk 5 Orang Bagian Pelayanan
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">
                  1. Bagi 5 Peran Utama
                </div>
                <p className="leading-relaxed">
                  Tetapkan 1 Supervisor (Kasi Pelayanan), 1 Pengolah Data &amp; Informasi (Rekap 19 Desa), serta 3 Petugas Loket PATEN (Loket 1–3).
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">
                  2. Daftarkan NIP &amp; Username
                </div>
                <p className="leading-relaxed">
                  Klik tombol <strong>Tambah Akun Petugas</strong> atau ubah data bawaan di tabel bawah menggunakan NIP/email resmi masing-masing ASN/staf.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">
                  3. Atur PIN Akses 6 Digit
                </div>
                <p className="leading-relaxed">
                  Setiap petugas wajib menggunakan PIN pribadi 6 digit (PIN awal bawaan <span className="font-mono font-semibold text-slate-800">123456</span> harus segera diganti).
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">
                  4. Masuk per Meja Kerja
                </div>
                <p className="leading-relaxed">
                  Klik profil petugas di pojok kanan atas atau tombol <strong>Uji Masuk Akun</strong> untuk beralih sesi sesuai loket tugas.
                </p>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Daftar Akun Petugas Pelayanan Terdaftar
              </div>
              <div className="text-xs text-slate-500">
                Sedang masuk sebagai:{' '}
                <span className="font-semibold text-slate-900">
                  {currentUser.fullName}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Nama &amp; NIP</th>
                    <th className="px-4 py-3 whitespace-nowrap">Username / Email</th>
                    <th className="px-4 py-3 whitespace-nowrap">Peran &amp; Loket</th>
                    <th className="px-4 py-3 whitespace-nowrap">Hak Akses</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffAccounts.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 align-top">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {staff.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                          NIP: {staff.nip}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-blue-800">
                          {staff.username}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {staff.email}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-900">
                          {STAFF_ROLE_LABELS[staff.role]}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {staff.counterAssignment}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs text-xs text-slate-600 leading-relaxed">
                        {STAFF_ROLE_PERMISSIONS[staff.role]}
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Masuk terakhir: {staff.lastLogin}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStaff(staff.id, { active: !staff.active })
                          }
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            staff.active ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {staff.active ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditStaffModal(staff)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            Ubah / Reset PIN
                          </button>
                          {staffAccounts.length > 1 &&
                            (confirmDeleteStaffId === staff.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteStaff(staff.id);
                                    setConfirmDeleteStaffId(null);
                                  }}
                                  className="rounded-md bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStaffId(null)}
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStaffId(staff.id)}
                                className="rounded-lg border border-red-200 bg-white p-1.5 text-red-700 hover:bg-red-50"
                                aria-label={`Hapus akun ${staff.fullName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SOP */}
      {isSopModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-sop-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3
                id="modal-sop-title"
                className="font-display text-base font-bold text-slate-900"
              >
                {editingSop
                  ? `Ubah Regulasi ${editingSop.code}`
                  : 'Tambah Regulasi SOP Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSopModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70"
                aria-label="Tutup form SOP"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSop} className="p-5 space-y-4">
              {sopErrorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {sopErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode SOP
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Layanan
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => {
                      const val = e.target.value as ServiceCategory | 'UMUM';
                      setServiceType(val);
                      setGroup(val === 'UMUM' ? 'STANDAR_UMUM' : 'LAYANAN_DOKUMEN');
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="UMUM">Standar Umum Pelayanan PATEN</option>
                    {(Object.keys(SERVICE_LABELS) as ServiceCategory[]).map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {SERVICE_LABELS[cat]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Layanan / SOP
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dasar Hukum / Peraturan
                </label>
                <input
                  type="text"
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Waktu Penyelesaian
                  </label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biaya / Tarif Resmi
                  </label>
                  <input
                    type="text"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Daftar Ketentuan / Persyaratan Wajib (1 baris per poin)
                </label>
                <textarea
                  rows={5}
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Khusus Petugas / Warga
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>Aktifkan SOP ini dalam basis pengetahuan AI</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSopModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSop}
                  className="rounded-lg bg-[#0B2244] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143566] disabled:opacity-50"
                >
                  {savingSop ? 'Menyimpan...' : 'Simpan Regulasi SOP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STAFF ACCOUNT */}
      {isStaffModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-staff-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3
                id="modal-staff-title"
                className="font-display text-base font-bold text-slate-900"
              >
                {editingStaff
                  ? `Ubah Akun: ${editingStaff.fullName}`
                  : 'Tambah Akun Petugas Pelayanan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70"
                aria-label="Tutup form akun petugas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4">
              {staffErrorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {staffErrorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  required
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, S.Sos"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / Nomor Pegawai
                  </label>
                  <input
                    type="text"
                    value={staffNip}
                    onChange={(e) => setStaffNip(e.target.value)}
                    placeholder="199004212015042002"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="loket1.adminduk"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Dinas / Instansi
                </label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="nama@sukodono.sidoarjokab.go.id"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peran Pelayanan (RBAC)
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => {
                      const role = e.target.value as StaffRole;
                      setStaffRole(role);
                      setStaffCounter(STAFF_ROLE_LABELS[role]);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    {(Object.keys(STAFF_ROLE_LABELS) as StaffRole[]).map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penugasan Loket / Meja
                  </label>
                  <input
                    type="text"
                    value={staffCounter}
                    onChange={(e) => setStaffCounter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingStaff
                    ? 'PIN Keamanan 6 Digit (biarkan •••••• jika tidak diubah)'
                    : 'PIN Keamanan 6 Digit'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staffActive}
                  onChange={(e) => setStaffActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>Akun aktif dan diizinkan masuk ke sistem PATEN</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="rounded-lg bg-[#0B2244] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143566] disabled:opacity-50"
                >
                  {savingStaff ? 'Menyimpan...' : 'Simpan Akun Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
