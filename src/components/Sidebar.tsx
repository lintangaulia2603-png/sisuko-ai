import React from 'react';
import {
  LayoutDashboard,
  MessageSquareText,
  FileCheck2,
  ClipboardList,
  BarChart3,
  Settings2,
  X,
  Clock,
  MapPin,
} from 'lucide-react';
import { NavSection } from '../types.ts';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  revisionAlertCount: number;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtitle: 'Statistik & ringkasan',
    icon: LayoutDashboard,
  },
  {
    id: 'tanya-sop',
    label: 'Tanya SOP AI',
    subtitle: 'Konsultasi syarat 24/7',
    icon: MessageSquareText,
  },
  {
    id: 'cek-berkas',
    label: 'Cek Berkas',
    subtitle: 'Pra-verifikasi foto AI',
    icon: FileCheck2,
  },
  {
    id: 'antrean',
    label: 'Antrean & Layanan',
    subtitle: 'Loket PATEN & lacak',
    icon: ClipboardList,
  },
  {
    id: 'rekap-data',
    label: 'Rekap Data',
    subtitle: 'Laporan 19 desa',
    icon: BarChart3,
  },
  {
    id: 'pengaturan-sop',
    label: 'Pengaturan SOP',
    subtitle: 'Regulasi layanan',
    icon: Settings2,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  revisionAlertCount,
}) => {
  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0B2244] text-slate-100 border-r border-[#16335E] transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigasi Utama SI-SUKO AI"
      >
        {/* Brand Identity */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#16335E]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#143566] border border-[#244D8A]">
              <svg
                viewBox="0 0 36 36"
                className="h-6 w-6"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 3L5 8.5V17.5C5 25.4 10.55 31.95 18 34C25.45 31.95 31 25.4 31 17.5V8.5L18 3Z"
                  stroke="#EAB308"
                  strokeWidth="2"
                  fill="#0F2C59"
                />
                <path
                  d="M18 9L11.5 14V24H24.5V14L18 9Z"
                  stroke="#93C5FD"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 24V18.5H20.5V24"
                  stroke="#EAB308"
                  strokeWidth="1.75"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight text-white truncate">
                SI-SUKO AI
              </div>
              <div className="text-xs text-blue-200/80 truncate">
                Kec. Sukodono · Sidoarjo
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-[#16335E] hover:text-white lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-slate-200 hover:bg-[#13325F] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-white' : 'text-sky-300/80 group-hover:text-sky-200'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight whitespace-nowrap truncate">
                      {item.label}
                    </div>
                    <div
                      className={`text-[11px] leading-tight mt-0.5 truncate ${
                        isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                {item.id === 'antrean' && revisionAlertCount > 0 && (
                  <span
                    className="ml-2 font-mono text-xs font-semibold tabular-nums text-amber-300 shrink-0"
                    title={`${revisionAlertCount} berkas perlu revisi`}
                  >
                    {revisionAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Civic Hours & Location Footer */}
        <div className="border-t border-[#16335E] px-4 py-4 text-xs text-slate-300 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <div className="font-medium text-slate-100">Jam Layanan PATEN</div>
              <div className="text-slate-300/90 tabular-nums">
                Sen–Kam: 08.00–15.30 WIB
              </div>
              <div className="text-slate-300/90 tabular-nums">
                Jumat: 08.00–14.30 WIB
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
            <div className="text-slate-300/90 leading-relaxed">
              Jl. Raya Sukodono No. 1, Kab. Sidoarjo 61258
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
