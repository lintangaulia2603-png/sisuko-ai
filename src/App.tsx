import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import {
  DailyVolumePoint,
  NavSection,
  QueueStatus,
  QueueTicket,
  ServiceCategory,
  SopDocument,
  StaffAccount,
  VillageRecap,
} from './types.ts';
import {
  INITIAL_QUEUE_TICKETS,
  INITIAL_SOPS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_VILLAGE_RECAPS,
  STAFF_ROLE_LABELS,
  WEEKLY_VOLUME_DATA,
} from './data/initialData.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TopHeader } from './components/TopHeader.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ChatSopView } from './components/ChatSopView.tsx';
import { DocumentCheckView } from './components/DocumentCheckView.tsx';
import { QueueTrackingView } from './components/QueueTrackingView.tsx';
import { RecapDataView } from './components/RecapDataView.tsx';
import { SopSettingsView } from './components/SopSettingsView.tsx';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [sops, setSops] = useState<SopDocument[]>(INITIAL_SOPS);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>(
    INITIAL_QUEUE_TICKETS
  );
  const [weeklyVolume, setWeeklyVolume] =
    useState<DailyVolumePoint[]>(WEEKLY_VOLUME_DATA);
  const [villageRecaps, setVillageRecaps] = useState<VillageRecap[]>(
    INITIAL_VILLAGE_RECAPS
  );
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(
    INITIAL_STAFF_ACCOUNTS
  );
  const [currentUser, setCurrentUser] = useState<StaffAccount>(
    INITIAL_STAFF_ACCOUNTS[1]
  );

  // Staff Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('pengolah.data');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      const [sopsRes, queueRes, recapRes, staffRes] = await Promise.all([
        fetch('/api/sops'),
        fetch('/api/queue'),
        fetch('/api/recap'),
        fetch('/api/staff'),
      ]);

      if (sopsRes.ok) {
        const sopsData = await sopsRes.json();
        if (Array.isArray(sopsData.sops)) setSops(sopsData.sops);
      }
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        if (Array.isArray(queueData.queue)) setQueueTickets(queueData.queue);
        if (Array.isArray(queueData.weeklyVolume)) {
          setWeeklyVolume(queueData.weeklyVolume);
        }
      }
      if (recapRes.ok) {
        const recapData = await recapRes.json();
        if (Array.isArray(recapData.villages)) {
          setVillageRecaps(recapData.villages);
        }
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (Array.isArray(staffData.staff) && staffData.staff.length > 0) {
          setStaffAccounts(staffData.staff);
          const savedId = window.localStorage.getItem('sisuko_active_staff_id');
          if (savedId) {
            const found = staffData.staff.find(
              (s: StaffAccount) => s.id === savedId && s.active
            );
            if (found) setCurrentUser(found);
          }
        }
      }
    } catch {
      // Fallback already populated from initialData
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCreateTicket = async (payload: {
    applicantName: string;
    nikLast4: string;
    village: string;
    serviceType: ServiceCategory;
    notes: string;
  }): Promise<QueueTicket> => {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal membuat antrean.');
    }
    setQueueTickets((prev) => [data.ticket, ...prev]);
    return data.ticket;
  };

  const handleUpdateTicketStatus = async (
    id: string,
    status: QueueStatus,
    officerNote?: string
  ) => {
    const res = await fetch(`/api/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, officerNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui status berkas.');
    }
    if (data.ticket) {
      setQueueTickets((prev) =>
        prev.map((item) => (item.id === id ? data.ticket : item))
      );
    }
  };

  const handleCreateSop = async (
    sopPayload: Omit<SopDocument, 'id' | 'updatedAt'>
  ) => {
    const res = await fetch('/api/sops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sopPayload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambah SOP.');
    }
    setSops((prev) => [data.sop, ...prev]);
  };

  const handleUpdateSop = async (id: string, updates: Partial<SopDocument>) => {
    const res = await fetch(`/api/sops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui SOP.');
    }
    setSops((prev) => prev.map((s) => (s.id === id ? data.sop : s)));
  };

  const handleDeleteSop = async (id: string) => {
    const res = await fetch(`/api/sops/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSops((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleCreateStaff = async (
    staffPayload: Omit<StaffAccount, 'id' | 'lastLogin'>
  ) => {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffPayload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambah akun petugas.');
    }
    setStaffAccounts((prev) => [...prev, data.staff]);
  };

  const handleUpdateStaff = async (
    id: string,
    updates: Partial<StaffAccount>
  ) => {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui akun petugas.');
    }
    setStaffAccounts((prev) =>
      prev.map((s) => (s.id === id ? data.staff : s))
    );
    if (currentUser.id === id) {
      setCurrentUser(data.staff);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStaffAccounts((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          pinCode: loginPin.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk ke akun petugas.');
      }
      setCurrentUser(data.user);
      window.localStorage.setItem('sisuko_active_staff_id', data.user.id);
      setStaffAccounts((prev) =>
        prev.map((s) => (s.id === data.user.id ? data.user : s))
      );
      setLoginPin('');
      setIsLoginModalOpen(false);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Gagal masuk ke sistem.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickQueue = () => {
    setActiveSection('antrean');
    setIsQueueModalOpen(true);
  };

  const revisionAlertCount = queueTickets.filter(
    (q) => q.status === 'PERLU_REVISI'
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        revisionAlertCount={revisionAlertCount}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopHeader
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickQueue={handleQuickQueue}
          currentUser={currentUser}
          onOpenLoginModal={() => {
            setLoginIdentifier(currentUser.username);
            setLoginPin('');
            setLoginError(null);
            setIsLoginModalOpen(true);
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              queueTickets={queueTickets}
              weeklyVolume={weeklyVolume}
              villageRecaps={villageRecaps}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'tanya-sop' && <ChatSopView sops={sops} />}

          {activeSection === 'cek-berkas' && <DocumentCheckView sops={sops} />}

          {activeSection === 'antrean' && (
            <QueueTrackingView
              queueTickets={queueTickets}
              onCreateTicket={handleCreateTicket}
              onUpdateTicketStatus={handleUpdateTicketStatus}
              isCreateModalOpen={isQueueModalOpen}
              onOpenCreateModal={() => setIsQueueModalOpen(true)}
              onCloseCreateModal={() => setIsQueueModalOpen(false)}
            />
          )}

          {activeSection === 'rekap-data' && (
            <RecapDataView villageRecaps={villageRecaps} />
          )}

          {activeSection === 'pengaturan-sop' && (
            <SopSettingsView
              sops={sops}
              staffAccounts={staffAccounts}
              currentUser={currentUser}
              onCreateSop={handleCreateSop}
              onUpdateSop={handleUpdateSop}
              onDeleteSop={handleDeleteSop}
              onCreateStaff={handleCreateStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onOpenLoginModal={() => {
                setLoginIdentifier(currentUser.username);
                setLoginPin('');
                setLoginError(null);
                setIsLoginModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* Staff Login / Switch Account Modal */}
      {isLoginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-staff-login-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-700" />
                <h3
                  id="modal-staff-login-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Masuk / Ganti Akun Petugas Pelayanan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70"
                aria-label="Tutup dialog masuk petugas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStaffLogin} className="p-5 space-y-4">
              {loginError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Cepat Petugas Pelayanan (5 Akun)
                </label>
                <select
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {staffAccounts.map((st) => (
                    <option key={st.id} value={st.username}>
                      {st.fullName} — {STAFF_ROLE_LABELS[st.role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="staff-login-username"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Username atau Email Dinas
                </label>
                <input
                  id="staff-login-username"
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-login-pin"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  PIN Petugas (6 Digit)
                </label>
                <input
                  id="staff-login-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={loginPin}
                  onChange={(e) =>
                    setLoginPin(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="Masukkan 6 digit PIN (awal: 123456)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  PIN bawaan awal untuk kelima akun petugas adalah{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    123456
                  </span>
                  . Ubah PIN masing-masing di menu Pengaturan SOP &gt; Akun Petugas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="rounded-lg bg-[#0B2244] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143566] disabled:opacity-50"
                >
                  {loginLoading ? 'Memverifikasi...' : 'Masuk Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
