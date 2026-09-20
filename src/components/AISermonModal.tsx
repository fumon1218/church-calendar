import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, BookOpen, Share2, Calendar, Check, Download, Layers, Quote, Eraser } from 'lucide-react';
import { ChurchEvent } from '../types';

const DRAFT_KEY = 'church-calendar-sermon-draft-v1';

interface SermonDraft {
  date: string;
  sermonTitle: string;
  sermonSpeaker: string;
  sermonBible: string;
  rawText: string;
  summaryPoints: string[];
}

function loadDraft(): SermonDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AISermonModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseYear: number;
  baseMonth: number;
  onAddEvent: (event: Partial<ChurchEvent>) => void;
}

type CardTheme = 'navy' | 'wood' | 'emerald' | 'sunset';

export const AISermonModal: React.FC<AISermonModalProps> = ({
  isOpen,
  onClose,
  baseYear,
  baseMonth,
  onAddEvent,
}) => {
  if (!isOpen) return null;

  const monthNum = baseMonth + 1;
  const defaultDateStr = `${baseYear}-${String(monthNum).padStart(2, '0')}-04`;

  // 이전에 쓰다 만 내용(임시저장)이 있으면 그걸로 시작하고, 없으면 예시 문구로 시작합니다.
  const draft = loadDraft();

  // Form States
  const [date, setDate] = useState(draft?.date || defaultDateStr);
  const [sermonTitle, setSermonTitle] = useState(draft?.sermonTitle ?? '은혜 위에 은혜라');
  const [sermonSpeaker, setSermonSpeaker] = useState(draft?.sermonSpeaker ?? '정현 목사');
  const [sermonBible, setSermonBible] = useState(draft?.sermonBible ?? '요한복음 1장 14~18절');
  const [rawText, setRawText] = useState(
    draft?.rawText ??
      '말씀이 육신이 되어 우리 가운데 거하시매 우리가 그의 영광을 보니 아버지의 독생자의 영광이요 은혜와 진리가 충만하더라. 우리는 하나님의 무한한 사랑과 구원의 은혜로 살아가며, 어두운 세상 속에서 진리의 빛을 발하는 성도가 되어야 합니다.'
  );

  const [summaryPoints, setSummaryPoints] = useState<string[]>(
    draft?.summaryPoints ?? [
      '1. 말씀이 육신이 되어 우리 가운데 거하시는 하나님 은혜',
      '2. 세상의 어둠을 이기는 독생자의 충만한 은혜와 진리',
      '3. 매일의 삶 속에서 구원의 감사와 사랑을 전하는 공동체',
    ]
  );

  const [cardTheme, setCardTheme] = useState<CardTheme>('navy');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const firstRender = useRef(true);

  // 입력하는 대로 자동으로 임시저장 (등록 버튼을 안 눌러도, 창을 닫았다 다시 열어도 남습니다)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ date, sermonTitle, sermonSpeaker, sermonBible, rawText, summaryPoints })
      );
      setSavedIndicator(true);
      const t = setTimeout(() => setSavedIndicator(false), 1200);
      return () => clearTimeout(t);
    } catch (e) {
      console.error('임시저장 실패', e);
    }
  }, [date, sermonTitle, sermonSpeaker, sermonBible, rawText, summaryPoints]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setDate(defaultDateStr);
    setSermonTitle('');
    setSermonSpeaker('');
    setSermonBible('');
    setRawText('');
    setSummaryPoints(['', '', '']);
  };

  // AI Summary Generator Simulation
  const handleGenerateAISummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      if (rawText.trim()) {
        const sentences = rawText
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.trim().length > 5);
        if (sentences.length >= 3) {
          setSummaryPoints([
            `1. ${sentences[0].slice(0, 45)}...`,
            `2. ${sentences[1].slice(0, 45)}...`,
            `3. ${sentences[2].slice(0, 45)}...`,
          ]);
        } else {
          setSummaryPoints([
            `1. ${sermonTitle} - 하나님의 선하신 뜻과 은혜를 새기는 삶`,
            `2. ${sermonBible} 본문을 통한 구원과 영적 결단`,
            `3. 주일 말씀을 일상의 기도와 순종으로 이어가는 성도`,
          ]);
        }
      }
      setIsGenerating(false);
    }, 600);
  };

  const handleApplyToCalendar = () => {
    onAddEvent({
      date,
      category: 'worship',
      title: `주일말씀 (${sermonSpeaker})`,
      time: '11:00',
      sermonTitle,
      sermonSpeaker,
      sermonBible,
      sermonSummary: summaryPoints.join('\n'),
      memo: `[설교: ${sermonTitle}] 본문: ${sermonBible} (${sermonSpeaker})`,
    });
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 1200);
  };

  const handleCopyKaTalk = () => {
    let text = `📖 [동해교회 주일 말씀 요약]\n\n`;
    text += `📌 설교 제목: ${sermonTitle}\n`;
    text += `👤 설교자: ${sermonSpeaker}\n`;
    text += `📖 성경 본문: ${sermonBible}\n`;
    text += `📅 일시: ${date}\n\n`;
    text += `✨ [핵심 말씀 포인트]\n`;
    summaryPoints.forEach((pt) => {
      text += `${pt}\n`;
    });
    text += `\n"말씀과 기도로 거룩하여지는 동해교회 공동체"`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Card theme styles mapping
  const themeStyles: Record<
    CardTheme,
    { bg: string; text: string; subText: string; accent: string; border: string }
  > = {
    navy: {
      bg: 'from-[#094E85] via-[#0D3B66] to-[#052648]',
      text: 'text-white',
      subText: 'text-blue-200',
      accent: 'bg-amber-400 text-slate-900',
      border: 'border-blue-400/30',
    },
    wood: {
      bg: 'from-[#4A3525] via-[#3A281C] to-[#261A12]',
      text: 'text-[#F5EBE6]',
      subText: 'text-[#D4C3B7]',
      accent: 'bg-[#C8963E] text-white',
      border: 'border-[#8C6D53]/40',
    },
    emerald: {
      bg: 'from-[#1B4D3E] via-[#12382D] to-[#0A241D]',
      text: 'text-emerald-50',
      subText: 'text-emerald-200',
      accent: 'bg-emerald-400 text-slate-900',
      border: 'border-emerald-400/30',
    },
    sunset: {
      bg: 'from-[#7C2D12] via-[#5C1D18] to-[#3B1110]',
      text: 'text-orange-50',
      subText: 'text-orange-200',
      accent: 'bg-amber-400 text-slate-900',
      border: 'border-orange-400/30',
    },
  };

  const st = themeStyles[cardTheme];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
                <span>AI 주일 말씀 요약 & SNS 카드 생성기</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                  AI Smart
                </span>
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                주일 설교 핵심 요약 및 카카오톡/SNS 공유용 말씀 카드를 자동 생성합니다.
                <span className={`ml-2 text-[10px] font-semibold transition-opacity ${savedIndicator ? 'opacity-100 text-emerald-600 dark:text-emerald-400' : 'opacity-0'}`}>
                  ✓ 자동 저장됨
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - 2 Columns (Form & Card Preview) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Inputs */}
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-3 bg-[var(--surface-soft)]/50 p-4 rounded-2xl border border-[var(--line-soft)]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-amber-500" />
                  <span>주일 설교 정보 입력</span>
                </h4>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  title="입력한 내용을 모두 지우고 새로 시작합니다"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] flex items-center gap-1"
                >
                  <Eraser className="w-3 h-3" />
                  <span>새로 시작</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                    예배 날짜
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                    설교자 (목사님)
                  </label>
                  <input
                    type="text"
                    value={sermonSpeaker}
                    onChange={(e) => setSermonSpeaker(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl text-[var(--ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  설교 제목
                </label>
                <input
                  type="text"
                  value={sermonTitle}
                  onChange={(e) => setSermonTitle(e.target.value)}
                  placeholder="예: 은혜 위에 은혜라"
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl font-bold text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  성경 본문
                </label>
                <input
                  type="text"
                  value={sermonBible}
                  onChange={(e) => setSermonBible(e.target.value)}
                  placeholder="예: 요한복음 1장 14~18절"
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl text-[var(--ink)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[var(--ink-soft)]">
                    설교 원고 / 메모 / 요약 텍스트
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAISummary}
                    disabled={isGenerating}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 hover:bg-amber-500/20 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGenerating ? 'AI 요약 중...' : 'AI 요약 자동 추출'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="주보의 설교 요약문이나 메모를 자유롭게 붙여넣으세요..."
                  className="w-full p-2.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl text-[var(--ink)] focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Generated 3 Points Editing */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>핵심 말씀 3가지 포인트 (직접 수정 가능)</span>
              </span>
              {summaryPoints.map((pt, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={pt}
                  onChange={(e) => {
                    const next = [...summaryPoints];
                    next[idx] = e.target.value;
                    setSummaryPoints(next);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-xl font-medium text-[var(--ink)]"
                />
              ))}
            </div>
          </div>

          {/* Right Column: Live SNS Card Preview */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>SNS 말씀 카드 실시간 미리보기</span>
              </span>

              {/* Theme selector buttons */}
              <div className="flex items-center gap-1 bg-[var(--surface-soft)] p-1 rounded-full border border-[var(--line-soft)] text-[10px]">
                <button
                  type="button"
                  onClick={() => setCardTheme('navy')}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    cardTheme === 'navy' ? 'bg-[#094E85] text-white' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  네이비
                </button>
                <button
                  type="button"
                  onClick={() => setCardTheme('wood')}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    cardTheme === 'wood' ? 'bg-[#4A3525] text-white' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  우드
                </button>
                <button
                  type="button"
                  onClick={() => setCardTheme('emerald')}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    cardTheme === 'emerald' ? 'bg-[#1B4D3E] text-white' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  에메랄드
                </button>
                <button
                  type="button"
                  onClick={() => setCardTheme('sunset')}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    cardTheme === 'sunset' ? 'bg-[#7C2D12] text-white' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  선셋
                </button>
              </div>
            </div>

            {/* Generated Card Render */}
            <div
              className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-br ${st.bg} ${st.text} border ${st.border} shadow-2xl flex flex-col justify-between min-h-[360px] relative overflow-hidden transition-all`}
            >
              {/* Top Watermark Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-serif text-xs font-bold">
                    동해
                  </div>
                  <div>
                    <h5 className="text-xs font-bold tracking-wide">동해교회 주일말씀</h5>
                    <p className={`text-[10px] ${st.subText}`}>{date} 주일 예배</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.accent}`}>
                  {sermonSpeaker}
                </span>
              </div>

              {/* Main Sermon Title & Scripture */}
              <div className="my-5 space-y-2 text-center">
                <p className={`text-xs font-serif italic ${st.subText}`}>"{sermonBible}"</p>
                <h2 className="text-xl sm:text-2xl font-serif font-extrabold tracking-tight leading-snug">
                  {sermonTitle}
                </h2>
              </div>

              {/* 3 Points Summary Card Box */}
              <div className="bg-black/25 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-2">
                <p className={`text-[10px] font-bold tracking-wider uppercase ${st.subText}`}>
                  ✨ 오늘의 설교 핵심 메시지
                </p>
                <div className="space-y-1.5 text-xs font-medium leading-relaxed">
                  {summaryPoints.map((pt, i) => (
                    <p key={i} className="line-clamp-2">
                      {pt}
                    </p>
                  ))}
                </div>
              </div>

              {/* Footer Motto */}
              <div className="mt-4 pt-2 text-center border-t border-white/10">
                <p className={`text-[10px] font-serif ${st.subText}`}>
                  말씀과 기도로 거룩하여지는 동해교회 공동체
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[var(--surface-soft)] border-t border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyKaTalk}
            className="px-3.5 py-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{copied ? '카톡 요약 텍스트 복사됨!' : '카톡 말씀 요약 복사'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleApplyToCalendar}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5"
            >
              {applied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>달력 등록 완료!</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>달력 주일 말씀으로 등록</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
