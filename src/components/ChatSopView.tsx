import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ChatMessage, SopDocument } from '../types.ts';
import { SERVICE_SHORT_LABELS } from '../data/initialData.ts';

interface ChatSopViewProps {
  sops: SopDocument[];
}

const SUGGESTED_QUESTIONS: string[] = [
  'Apa saja syarat mengurus KTP-el hilang di Kecamatan Sukodono?',
  'Bagaimana prosedur pengajuan Surat Keterangan Usaha (SKU) untuk UMKM?',
  'Apa syarat mengurus Surat Keterangan Ahli Waris dan berapa lama prosesnya?',
  'Berapa biaya pengurusan Kartu Keluarga (KK) baru dan dokumen apa yang dibawa?',
  'Apakah di Kecamatan Sukodono bisa membuat paspor atau perpanjang SIM?',
];

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFormattedMessage(content: string): React.ReactNode {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }
        if (/^[-*]\s+/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" />
              <span>{renderInlineBold(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }
        return <div key={idx}>{renderInlineBold(rawLine)}</div>;
      })}
    </div>
  );
}

export const ChatSopView: React.FC<ChatSopViewProps> = ({ sops }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Selamat datang di Layanan Konsultasi SOP SI-SUKO AI Kecamatan Sukodono, Kabupaten Sidoarjo.\n\nSilakan tanyakan persyaratan, estimasi waktu, atau alur pengurusan KTP-el, Kartu Keluarga, Pindah Datang, Rekomendasi Nikah, Surat Waris, dan SKU. Jawaban saya mengacu langsung pada SOP resmi PATEN Kecamatan Sukodono yang berlaku.',
      timestamp: 'Siap 24 Jam',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSopPreview, setSelectedSopPreview] = useState<SopDocument | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeSops = sops.filter((s) => s.active);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nowTime = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace('.', ':');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: `${nowTime} WIB`,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory
            .filter((m) => m.id !== 'welcome-msg' && !m.isError)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan jawaban dari server.');
      }

      const replyTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .format(new Date())
        .replace('.', ':');

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: `${replyTime} WIB`,
          citedSops: data.citedSops,
        },
      ]);
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Terjadi gangguan koneksi saat menghubungi Asisten AI.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Maaf, permintaan Anda belum dapat diproses: ${errMsg}`,
          timestamp: 'Gagal memproses',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages((prev) => [prev[0]]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Chat Area (2/3) */}
      <div className="lg:col-span-2 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden h-[calc(100vh-11rem)] min-h-[540px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B2244] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900 truncate">
                Konsultasi SOP Resmi Kecamatan Sukodono
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Terikat pada {activeSops.length} regulasi SOP PATEN aktif · Bebas pungutan liar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Percakapan Baru</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-white"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">
                    {isUser ? 'Warga Pemohon' : 'Asisten SI-SUKO AI'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-[#0B2244] text-white'
                      : msg.isError
                        ? 'border border-red-200 bg-red-50 text-red-900'
                        : 'border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {msg.isError && (
                    <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Kendala Layanan AI</span>
                    </div>
                  )}
                  {isUser ? msg.content : renderFormattedMessage(msg.content)}

                  {msg.citedSops && msg.citedSops.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">
                        Dasar SOP Rujukan:{' '}
                      </span>
                      {msg.citedSops.map((c, i) => (
                        <span key={c.code}>
                          {i > 0 && ' · '}
                          <span className="font-mono text-blue-800 font-medium">
                            {c.code}
                          </span>{' '}
                          ({c.title})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="mb-1 text-[11px] text-slate-500">
                Asisten SI-SUKO AI · Memeriksa basis data SOP...
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Sedang menyusun jawaban sesuai regulasi Kecamatan Sukodono...
              </div>
            </div>
          )}
        </div>

        {/* Quick Questions & Input Form */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => sendMessage(q)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda tentang syarat KTP, KK, Pindah, Nikah, Waris, atau SKU..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B2244] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#143566] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>

      {/* RAG Reference SOP Sidebar (1/3) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col h-fit max-h-[calc(100vh-11rem)] overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
          <BookOpen className="h-4 w-4 text-blue-700 shrink-0" />
          <h3 className="font-display text-base font-semibold text-slate-900">
            Basis Pengetahuan SOP Aktif
          </h3>
        </div>
        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
          Chatbot hanya menjawab berdasarkan dokumen regulasi di bawah ini. Perubahan pada menu Pengaturan SOP otomatis memperbarui jawaban AI.
        </p>

        <div className="mt-4 divide-y divide-slate-100">
          {activeSops.map((sop) => {
            const isExpanded = selectedSopPreview?.id === sop.id;
            return (
              <div key={sop.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSopPreview(isExpanded ? null : sop)
                  }
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-800">
                      {sop.code}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {sop.serviceType === 'UMUM'
                        ? 'Standar Umum'
                        : SERVICE_SHORT_LABELS[sop.serviceType]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                    {sop.title}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 space-y-2 border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900">
                        Biaya:{' '}
                      </span>
                      {sop.fee}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        Estimasi:{' '}
                      </span>
                      {sop.estimatedTime}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 mb-1">
                        Syarat Utama:
                      </div>
                      <ul className="list-disc pl-4 space-y-1">
                        {sop.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
