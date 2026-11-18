import React, { useState } from 'react';
import { LogIn, Menu, Plus } from 'lucide-react';
import { NavSection, StaffAccount } from '../types.ts';
import { STAFF_ROLE_LABELS } from '../data/initialData.ts';

interface TopHeaderProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onQuickQueue: () => void;
  currentUser: StaffAccount;
  onOpenLoginModal: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard Pelayanan',
  'tanya-sop': 'Tanya SOP AI',
  'cek-berkas': 'Cek Berkas Mandiri',
  antrean: 'Antrean & Layanan PATEN',
  'rekap-data': 'Rekap Data 19 Desa',
  'pengaturan-sop': 'Pengaturan SOP & Akun Petugas',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeSection,
  onOpenMobileMenu,
  onQuickQueue,
  currentUser,
  onOpenLoginModal,
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const initials = currentUser.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left Zone: Mobile toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">
            Kecamatan Sukodono
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      {/* Right Zone: Primary CTA + Active Staff Account Switcher */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <button
          type="button"
          onClick={onQuickQueue}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#143566] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Ambil Antrean</span>
        </button>

        <button
          type="button"
          onClick={onOpenLoginModal}
          className="flex items-center gap-2.5 border-l border-slate-200 pl-3 sm:pl-4 text-left hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          title="Klik untuk masuk atau ganti akun petugas pelayanan"
        >
          {currentUser.username === 'pengolah.data' && !avatarError ? (
            <img
              src="/src/assets/images/petugas_paten_avatar_1794934746522.jpg"
              alt={currentUser.fullName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-900 border border-blue-200 shrink-0">
              {initials || 'PT'}
            </div>
          )}
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-medium text-slate-900 whitespace-nowrap max-w-[160px] truncate">
              {currentUser.fullName}
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap max-w-[160px] truncate">
              {STAFF_ROLE_LABELS[currentUser.role]}
            </div>
          </div>
          <LogIn className="h-4 w-4 text-slate-400 hidden sm:block shrink-0" />
        </button>
      </div>
    </header>
  );
};
