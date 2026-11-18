import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_QUEUE_TICKETS,
  INITIAL_SOPS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_VILLAGE_RECAPS,
  SERVICE_LABELS,
  STAFF_ROLE_LABELS,
  WEEKLY_VOLUME_DATA,
} from './src/data/initialData.ts';
import type {
  QueueStatus,
  QueueTicket,
  ServiceCategory,
  SopDocument,
  StaffAccount,
  StaffRole,
  VillageRecap,
} from './src/types.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sisuko-db.json');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function getCurrentWibTime(): string {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace('.', ':') + ' WIB'
  );
}

function getCurrentWibDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

interface PersistedState {
  sops: SopDocument[];
  queue: QueueTicket[];
  staff: StaffAccount[];
}

function loadState(): PersistedState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        Array.isArray(parsed.sops) &&
        Array.isArray(parsed.queue) &&
        Array.isArray(parsed.staff)
      ) {
        return {
          sops: parsed.sops,
          queue: parsed.queue,
          staff: parsed.staff,
        };
      }
    }
  } catch (err) {
    console.warn('Gagal membaca sisuko-db.json, menggunakan data awal:', err);
  }
  return {
    sops: [...INITIAL_SOPS],
    queue: [...INITIAL_QUEUE_TICKETS],
    staff: [...INITIAL_STAFF_ACCOUNTS],
  };
}

function saveState(state: PersistedState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Gagal menyimpan sisuko-db.json:', err);
  }
}

const state = loadState();
let sopsStore: SopDocument[] = state.sops;
let queueStore: QueueTicket[] = state.queue;
let staffStore: StaffAccount[] = state.staff;
const villageRecapsStore: VillageRecap[] = [...INITIAL_VILLAGE_RECAPS];

function sanitizeStaff(s: StaffAccount) {
  return {
    id: s.id,
    fullName: s.fullName,
    nip: s.nip,
    username: s.username,
    email: s.email,
    role: s.role,
    counterAssignment: s.counterAssignment,
    pinCode: '••••••',
    active: s.active,
    lastLogin: s.lastLogin,
  };
}

function buildSopKnowledgeContext(sops: SopDocument[]): string {
  const activeSops = sops.filter((s) => s.active);
  return activeSops
    .map((sop) => {
      const categoryLabel =
        sop.serviceType === 'UMUM'
          ? 'Standar Operasional Umum Pelayanan PATEN'
          : `${SERVICE_LABELS[sop.serviceType]} (${sop.serviceType})`;
      return `
[${sop.code}] ${sop.title}
Kelompok SOP: ${sop.group === 'STANDAR_UMUM' ? 'Standar Operasional Umum' : 'Layanan Administrasi Warga'}
Kategori: ${categoryLabel}
Dasar Hukum: ${sop.legalBasis}
Estimasi Waktu Penyelesaian: ${sop.estimatedTime}
Biaya Layanan: ${sop.fee}
Ketentuan & Persyaratan Wajib:
${sop.requirements.map((req, idx) => `${idx + 1}. ${req}`).join('\n')}
Catatan Penting: ${sop.notes}
`;
    })
    .join('\n---\n');
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SI-SUKO AI Kecamatan Sukodono' });
});

// SOP Endpoints
app.get('/api/sops', (_req, res) => {
  res.json({ sops: sopsStore });
});

app.post('/api/sops', (req, res) => {
  const body = req.body as Partial<SopDocument>;
  if (!body.title || !body.code || !body.serviceType) {
    res
      .status(400)
      .json({ error: 'Kode SOP, judul, dan kategori layanan wajib diisi.' });
    return;
  }
  const newSop: SopDocument = {
    id: `sop-${Date.now()}`,
    code: body.code.trim().toUpperCase(),
    group:
      body.group ??
      (body.serviceType === 'UMUM' ? 'STANDAR_UMUM' : 'LAYANAN_DOKUMEN'),
    serviceType: body.serviceType,
    title: body.title.trim(),
    legalBasis:
      body.legalBasis?.trim() || 'SOP Pelayanan PATEN Kecamatan Sukodono',
    estimatedTime: body.estimatedTime?.trim() || '1 hari kerja',
    fee: body.fee?.trim() || 'Gratis (Rp 0)',
    requirements: Array.isArray(body.requirements)
      ? body.requirements.filter((r) => r.trim().length > 0)
      : [],
    notes: body.notes?.trim() || '',
    updatedAt: getCurrentWibDate(),
    active: body.active ?? true,
  };
  sopsStore = [newSop, ...sopsStore];
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.status(201).json({ sop: newSop });
});

app.put('/api/sops/:id', (req, res) => {
  const { id } = req.params;
  const idx = sopsStore.findIndex((s) => s.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Data SOP tidak ditemukan.' });
    return;
  }
  const body = req.body as Partial<SopDocument>;
  const updated: SopDocument = {
    ...sopsStore[idx],
    ...body,
    requirements: Array.isArray(body.requirements)
      ? body.requirements.filter((r) => r.trim().length > 0)
      : sopsStore[idx].requirements,
    updatedAt: getCurrentWibDate(),
  };
  sopsStore[idx] = updated;
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ sop: updated });
});

app.delete('/api/sops/:id', (req, res) => {
  const { id } = req.params;
  const exists = sopsStore.some((s) => s.id === id);
  if (!exists) {
    res.status(404).json({ error: 'Data SOP tidak ditemukan.' });
    return;
  }
  sopsStore = sopsStore.filter((s) => s.id !== id);
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ deleted: true });
});

// Staff Account & Authentication Endpoints
app.get('/api/staff', (_req, res) => {
  res.json({ staff: staffStore.map(sanitizeStaff) });
});

app.post('/api/staff', (req, res) => {
  const body = req.body as Partial<StaffAccount>;
  if (!body.fullName || !body.username || !body.role || !body.pinCode) {
    res.status(400).json({
      error: 'Nama lengkap, username, peran pelayanan, dan PIN 6 digit wajib diisi.',
    });
    return;
  }
  const cleanUsername = body.username.trim().toLowerCase();
  if (staffStore.some((s) => s.username.toLowerCase() === cleanUsername)) {
    res.status(409).json({ error: 'Username sudah terdaftar pada sistem.' });
    return;
  }
  const cleanPin = body.pinCode.replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    res.status(400).json({ error: 'PIN petugas harus terdiri dari 6 digit angka.' });
    return;
  }

  const created: StaffAccount = {
    id: `staff-${Date.now()}`,
    fullName: body.fullName.trim(),
    nip: body.nip?.trim() || '-',
    username: cleanUsername,
    email:
      body.email?.trim() ||
      `${cleanUsername}@sukodono.sidoarjokab.go.id`,
    role: body.role as StaffRole,
    counterAssignment:
      body.counterAssignment?.trim() || STAFF_ROLE_LABELS[body.role as StaffRole],
    pinCode: cleanPin,
    active: body.active ?? true,
    lastLogin: 'Belum pernah masuk',
  };

  staffStore = [...staffStore, created];
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.status(201).json({ staff: sanitizeStaff(created) });
});

app.put('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const idx = staffStore.findIndex((s) => s.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Akun petugas tidak ditemukan.' });
    return;
  }
  const body = req.body as Partial<StaffAccount>;
  let nextPin = staffStore[idx].pinCode;
  if (body.pinCode && body.pinCode !== '••••••') {
    const cleaned = body.pinCode.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      res.status(400).json({ error: 'PIN baru harus tepat 6 digit angka.' });
      return;
    }
    nextPin = cleaned;
  }

  const updated: StaffAccount = {
    ...staffStore[idx],
    fullName: body.fullName?.trim() ?? staffStore[idx].fullName,
    nip: body.nip?.trim() ?? staffStore[idx].nip,
    username: body.username?.trim().toLowerCase() ?? staffStore[idx].username,
    email: body.email?.trim() ?? staffStore[idx].email,
    role: (body.role as StaffRole) ?? staffStore[idx].role,
    counterAssignment:
      body.counterAssignment?.trim() ?? staffStore[idx].counterAssignment,
    active: body.active ?? staffStore[idx].active,
    pinCode: nextPin,
  };
  staffStore[idx] = updated;
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ staff: sanitizeStaff(updated) });
});

app.delete('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  if (staffStore.length <= 1) {
    res.status(400).json({
      error: 'Minimal harus tersisa 1 akun administrator/petugas aktif.',
    });
    return;
  }
  staffStore = staffStore.filter((s) => s.id !== id);
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ deleted: true });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, pinCode } = req.body as {
    identifier?: string;
    pinCode?: string;
  };
  if (!identifier || !pinCode) {
    res.status(400).json({ error: 'Username/email dan PIN 6 digit wajib diisi.' });
    return;
  }
  const key = identifier.trim().toLowerCase();
  const matched = staffStore.find(
    (s) => s.username.toLowerCase() === key || s.email.toLowerCase() === key
  );
  if (!matched) {
    res.status(401).json({ error: 'Akun petugas tidak ditemukan.' });
    return;
  }
  if (!matched.active) {
    res.status(403).json({
      error: 'Akun petugas ini sedang dinonaktifkan oleh Kasi Pelayanan.',
    });
    return;
  }
  if (matched.pinCode !== pinCode.trim()) {
    res.status(401).json({ error: 'PIN 6 digit tidak sesuai.' });
    return;
  }

  matched.lastLogin = `Hari ini, ${getCurrentWibTime()}`;
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ user: sanitizeStaff(matched) });
});

// Queue & Tracking Endpoints
app.get('/api/queue', (_req, res) => {
  res.json({ queue: queueStore, weeklyVolume: WEEKLY_VOLUME_DATA });
});

app.post('/api/queue', (req, res) => {
  const { applicantName, nikLast4, village, serviceType, notes } = req.body as {
    applicantName?: string;
    nikLast4?: string;
    village?: string;
    serviceType?: ServiceCategory;
    notes?: string;
  };

  if (!applicantName || !village || !serviceType) {
    res.status(400).json({
      error: 'Nama pemohon, asal desa, dan jenis layanan wajib diisi.',
    });
    return;
  }

  const prefixMap: Record<ServiceCategory, string> = {
    KTP: 'A',
    KK: 'B',
    PINDAH_DATANG: 'C',
    SURAT_NIKAH: 'D',
    WARIS: 'E',
    SKU: 'F',
  };
  const counterMap: Record<ServiceCategory, string> = {
    KTP: 'Loket 1',
    KK: 'Loket 1',
    PINDAH_DATANG: 'Loket 2',
    SURAT_NIKAH: 'Loket 2',
    WARIS: 'Loket 3',
    SKU: 'Loket 3',
  };

  const countSamePrefix = queueStore.filter(
    (q) => q.serviceType === serviceType
  ).length;
  const nextNum = String(countSamePrefix + 45).padStart(3, '0');
  const trackingSeq = String(846 + queueStore.length).padStart(4, '0');
  const cleanLast4 = (nikLast4 || '0001')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');

  const ticket: QueueTicket = {
    id: `q-${Date.now()}`,
    queueNumber: `${prefixMap[serviceType]}-${nextNum}`,
    trackingCode: `SKD-2026-${trackingSeq}`,
    applicantName: applicantName.trim(),
    maskedNik: `351513******${cleanLast4}`,
    village,
    serviceType,
    submittedAt: getCurrentWibTime(),
    estimatedReady:
      serviceType === 'WARIS' ? '2 Hari Kerja' : 'Estimasi 20–45 menit',
    status: 'DITERIMA_LOKET',
    officerNote:
      notes?.trim() || 'Pendaftaran antrean online warga melalui SI-SUKO AI.',
    counter: counterMap[serviceType],
  };

  queueStore = [ticket, ...queueStore];
  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.status(201).json({ ticket });
});

app.patch('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  const { status, officerNote } = req.body as {
    status?: QueueStatus;
    officerNote?: string;
  };
  const idx = queueStore.findIndex((q) => q.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Nomor antrean/berkas tidak ditemukan.' });
    return;
  }

  queueStore[idx] = {
    ...queueStore[idx],
    status: status ?? queueStore[idx].status,
    officerNote:
      officerNote !== undefined ? officerNote : queueStore[idx].officerNote,
    estimatedReady:
      status === 'SIAP_DIAMBIL'
        ? 'Sudah Siap Diambil'
        : status === 'PERLU_REVISI'
          ? 'Menunggu Revisi'
          : queueStore[idx].estimatedReady,
  };

  saveState({ sops: sopsStore, queue: queueStore, staff: staffStore });
  res.json({ ticket: queueStore[idx] });
});

// Recap 19 Desa Endpoint
app.get('/api/recap', (_req, res) => {
  res.json({ villages: villageRecapsStore });
});

// Tanya SOP AI (RAG Grounded Chatbot)
app.post('/api/chat-sop', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY belum tersedia pada konfigurasi server. Silakan periksa panel Secrets.',
      });
      return;
    }

    const { message, history } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
      return;
    }

    const sopContext = buildSopKnowledgeContext(sopsStore);
    const activeCodes = sopsStore
      .filter((s) => s.active)
      .map((s) => `${s.code} (${s.title})`)
      .join(', ');

    const systemInstruction = `Anda adalah Asisten Virtual Resmi "SI-SUKO AI" untuk Pelayanan Administrasi Terpadu Kecamatan (PATEN) Kecamatan Sukodono, Kabupaten Sidoarjo, Jawa Timur.

ATURAN WAJIB (RAG GROUNDING):
1. Anda HANYA diperbolehkan menjawab berdasarkan dokumen SOP Resmi Kecamatan Sukodono (baik SOP Layanan Dokumen maupun SOP Umum Pelayanan) yang diberikan di bawah ini.
2. Gunakan Bahasa Indonesia yang sopan, ramah, formal namun mudah dipahami masyarakat umum (sapa warga dengan "Bapak/Ibu" atau "Warga Sukodono").
3. DILARANG KERAS mengarang persyaratan, tarif, estimasi waktu, atau menjanjikan jalan pintas / pungutan liar di luar SOP resmi. Semua pelayanan PATEN Kecamatan Sukodono adalah Gratis (Rp 0).
4. Jika warga bertanya tentang layanan atau hal di luar kewenangan Kecamatan Sukodono atau tidak ada dalam SOP di bawah ini (misalnya pengurusan paspor imigrasi, SIM kepolisian, pajak kendaraan, atau topik non-pemerintahan), tolak dengan sangat sopan, jelaskan bahwa informasi tersebut tidak tercantum dalam SOP PATEN Kecamatan Sukodono, dan arahkan ke instansi berwenang atau Loket Informasi PATEN Kecamatan Sukodono.
5. Di akhir jawaban yang relevan, sebutkan kode SOP yang dirujuk (contoh: "Rujukan: SOP-PATEN-01" atau "Rujukan: SOP-UMUM-02").
6. Berikan format jawaban terstruktur dengan poin bernomor atau daftar singkat agar mudah dibaca warga di HP.

DAFTAR SOP AKTIF YANG TERSEDIA: ${activeCodes}

ISI DOKUMEN SOP RESMI KECAMATAN SUKODONO:
${sopContext}`;

    const conversationHistory = (history || [])
      .slice(-6)
      .map(
        (item) =>
          `${item.role === 'user' ? 'Warga' : 'Asisten SI-SUKO'}: ${item.content}`
      )
      .join('\n\n');

    const promptText = conversationHistory
      ? `Riwayat percakapan sebelumnya:\n${conversationHistory}\n\nPertanyaan Warga terbaru:\n${message.trim()}`
      : `Pertanyaan Warga:\n${message.trim()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction,
      },
    });

    const answer =
      response.text?.trim() ||
      'Mohon maaf, sistem belum dapat menyusun jawaban saat ini.';

    const citedSops = sopsStore
      .filter(
        (sop) =>
          sop.active &&
          (answer.includes(sop.code) ||
            (sop.serviceType !== 'UMUM' &&
              message
                .toLowerCase()
                .includes(sop.serviceType.toLowerCase().replace('_', ' '))))
      )
      .map((sop) => ({ code: sop.code, title: sop.title }));

    res.json({ answer, citedSops });
  } catch (err) {
    console.error('Error /api/chat-sop:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat menghubungi layanan Gemini AI.';
    res.status(500).json({ error: errorMessage });
  }
});

// Cek Berkas AI (Multimodal Document Pre-Verification)
app.post('/api/verify-document', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY belum tersedia pada konfigurasi server. Silakan periksa panel Secrets.',
      });
      return;
    }

    const { imageBase64, mimeType, serviceType, documentType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      serviceType?: ServiceCategory;
      documentType?: string;
    };

    if (!imageBase64 || !mimeType || !serviceType || !documentType) {
      res.status(400).json({
        error: 'Foto dokumen, jenis layanan, dan jenis dokumen wajib dilengkapi.',
      });
      return;
    }

    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;
    const matchedSop = sopsStore.find(
      (s) => s.serviceType === serviceType && s.active
    );

    const sopDetails = matchedSop
      ? `SOP Acuan: ${matchedSop.code} - ${matchedSop.title}\nPersyaratan Resmi:\n${matchedSop.requirements
          .map((r, i) => `${i + 1}. ${r}`)
          .join('\n')}`
      : `Layanan: ${SERVICE_LABELS[serviceType]}`;

    const prompt = `Anda adalah petugas pra-verifikasi dokumen cerdas pada sistem SI-SUKO AI Kecamatan Sukodono, Kabupaten Sidoarjo.
Warga mengunggah foto dokumen untuk pemeriksaan awal mandiri sebelum datang ke loket PATEN.

Jenis Layanan yang Dipilih: ${SERVICE_LABELS[serviceType]}
Jenis Dokumen yang Diklaim Warga: ${documentType}
${sopDetails}

Tugas Anda menganalisis gambar yang diunggah secara objektif:
1. Periksa kualitas visual foto: apakah teks terbaca jelas, tidak buram/blur, pencahayaan cukup, tidak tertutup pantulan cahaya, dan seluruh bagian penting dokumen tidak terpotong.
2. Periksa kesesuaian jenis dokumen: apakah gambar benar-benar terlihat seperti "${documentType}" (atau surat pengantar / dokumen administrasi kependudukan Indonesia yang relevan), atau justru foto yang tidak relevan / kosong / terbalik parah / salah dokumen.
3. Tentukan status akhir:
   - "SESUAI": Foto jelas terbaca, tidak terpotong, dan sesuai dengan jenis dokumen yang dipilih.
   - "PERLU_REVISI": Dokumen tampaknya relevan tetapi foto agak buram, pencahayaan kurang, bagian tepi/stempel/tanda tangan terpotong, atau perlu kelengkapan tambahan sesuai SOP.
   - "DITOLAK": Gambar sangat buram hingga teks tidak terbaca sama sekali, atau gambar bukan merupakan dokumen administratif yang dimaksud.
4. Berikan skor kejernihan visual 0-100, daftar checklist 3-4 poin konkret, ringkasan ramah dalam Bahasa Indonesia sopan, dan rekomendasi perbaikan jika diperlukan.
5. Ingatkan bahwa hasil ini adalah pra-verifikasi mandiri dan pengesahan akhir tetap dilakukan petugas loket PATEN saat berkas fisik/asli ditunjukkan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: 'Harus salah satu dari: SESUAI, PERLU_REVISI, atau DITOLAK',
            },
            isReadable: {
              type: Type.BOOLEAN,
              description: 'Apakah tulisan pada dokumen dapat dibaca dengan jelas',
            },
            documentMatch: {
              type: Type.BOOLEAN,
              description:
                'Apakah isi gambar sesuai dengan jenis dokumen yang dipilih warga',
            },
            clarityScore: {
              type: Type.INTEGER,
              description: 'Skor kejernihan & kelengkapan visual dari 0 sampai 100',
            },
            summary: {
              type: Type.STRING,
              description:
                'Ringkasan hasil pra-verifikasi dalam Bahasa Indonesia yang sopan dan jelas',
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  note: { type: Type.STRING },
                },
                required: ['item', 'passed', 'note'],
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Saran tindak lanjut praktis bagi warga',
            },
          },
          required: [
            'status',
            'isReadable',
            'documentMatch',
            'clarityScore',
            'summary',
            'checklist',
            'recommendations',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ result: parsed });
  } catch (err) {
    console.error('Error /api/verify-document:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Gagal memeriksa dokumen dengan layanan AI. Silakan coba beberapa saat lagi.';
    res.status(500).json({ error: errorMessage });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SI-SUKO AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
