export type NavSection =
  | 'dashboard'
  | 'tanya-sop'
  | 'cek-berkas'
  | 'antrean'
  | 'rekap-data'
  | 'pengaturan-sop';

export type ServiceCategory =
  | 'KTP'
  | 'KK'
  | 'PINDAH_DATANG'
  | 'SURAT_NIKAH'
  | 'WARIS'
  | 'SKU';

export type SopGroup = 'LAYANAN_DOKUMEN' | 'STANDAR_UMUM';

export type QueueStatus =
  | 'DITERIMA_LOKET'
  | 'VERIFIKASI_KASI'
  | 'PARAF_CAMAT'
  | 'SIAP_DIAMBIL'
  | 'PERLU_REVISI';

export type StaffRole =
  | 'KASI_PELAYANAN'
  | 'PENGOLAH_DATA'
  | 'PETUGAS_LOKET_1'
  | 'PETUGAS_LOKET_2'
  | 'PETUGAS_LOKET_3';

export interface StaffAccount {
  id: string;
  fullName: string;
  nip: string;
  username: string;
  email: string;
  role: StaffRole;
  counterAssignment: string;
  pinCode: string;
  active: boolean;
  lastLogin: string;
}

export interface SopDocument {
  id: string;
  code: string;
  group: SopGroup;
  serviceType: ServiceCategory | 'UMUM';
  title: string;
  legalBasis: string;
  estimatedTime: string;
  fee: string;
  requirements: string[];
  notes: string;
  updatedAt: string;
  active: boolean;
}

export interface QueueTicket {
  id: string;
  queueNumber: string;
  trackingCode: string;
  applicantName: string;
  maskedNik: string;
  village: string;
  serviceType: ServiceCategory;
  submittedAt: string;
  estimatedReady: string;
  status: QueueStatus;
  officerNote: string;
  counter: string;
}

export interface VillageRecap {
  id: string;
  villageName: string;
  ktpCount: number;
  kkCount: number;
  pindahCount: number;
  nikahCount: number;
  warisCount: number;
  skuCount: number;
  totalProcessed: number;
  completedOnTime: number;
  revisionCount: number;
  ikmScore: number;
}

export interface DailyVolumePoint {
  label: string;
  dateLabel: string;
  totalApplicants: number;
  completed: number;
  revisions: number;
}

export interface VerificationChecklistItem {
  item: string;
  passed: boolean;
  note: string;
}

export interface DocumentVerificationResult {
  status: 'SESUAI' | 'PERLU_REVISI' | 'DITOLAK';
  isReadable: boolean;
  documentMatch: boolean;
  clarityScore: number;
  summary: string;
  checklist: VerificationChecklistItem[];
  recommendations: string[];
}

export interface ChatCitation {
  code: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedSops?: ChatCitation[];
  isError?: boolean;
}
