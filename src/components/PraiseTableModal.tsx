import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Share2, Music, Calendar, Sparkles } from 'lucide-react';
import { ChurchEvent } from '../types';

export interface PraiseRowItem {
  id: string;
  dateStr: string; // e.g. "9월 6일" or "2026-09-06"
  fullDate: string; // YYYY-MM-DD
  praiseSong: string; // e.g. "은혜찬송가 52장"
  praiseSubtitle: string; // e.g. "(망망한 인생의 거친 바다에)"
  startHymn: string; // e.g. "은찬 69, 91"
  eventId?: string; // 달력에 이미 저장된 일정이면 그 일정의 id (다시 등록할 때 중복 생성 대신 수정하기 위함)
}

interface PraiseTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number; // 0-indexed (8 = 9월)
  events: ChurchEvent[]; // 달력에 저장된 전체 일정 (해당 월의 찬양 일정을 표로 만드는 데 사용)
  onApplyEvents: (events: Partial<ChurchEvent>[]) => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// 달력에 저장된 해당 월의 찬양대 일정을 날짜순으로 표 행으로 변환합니다.
// ('주일 찬양 연습', '찬양의 밤'처럼 찬양곡 정보가 없는 일정은 제외)
const buildRowsFromEvents = (events: ChurchEvent[], year: number, month: number): PraiseRowItem[] => {
  const prefix = `${year}-${pad2(month + 1)}-`;
  return events
    .filter(
      (e) =>
        e.category === 'praise' &&
        e.date.startsWith(prefix) &&
        (e.praiseSong || e.startHymn || /^찬양대\s*-/.test(e.title))
    )
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .map((e) => {
      const day = Number(e.date.slice(8, 10));
      const song = (e.praiseSong || e.title.replace(/^찬양대\s*-\s*/, '')).trim();
      const subtitle = (e.praiseSubtitle || '').replace(/[()]/g, '').trim();
      return {
        id: `pr-${e.id}`,
        eventId: e.id,
        dateStr: `${month + 1}월 ${day}일`,
        fullDate: e.date,
        praiseSong: song,
        praiseSubtitle: subtitle ? `(${subtitle})` : '',
        startHymn: e.startHymn || '',
      };
    });
};

export const PraiseTableModal: React.FC<PraiseTableModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  events,
  onApplyEvents,
}) => {
  if (!isOpen) return null;

  const currentMonthNum = month + 1;

  // Initial preset for 9월 (matching the image) or empty for other months
  const default9MonthItems: PraiseRowItem[] = [
    {
      id: 'pr-01',
      dateStr: '9월 6일',
      fullDate: `${year}-09-06`,
      praiseSong: '은혜찬송가 52장',
      praiseSubtitle: '(망망한 인생의 거친 바다에)',
      startHymn: '은찬 69, 91',
    },
    {
      id: 'pr-02',
      dateStr: '9월 13일',
      fullDate: `${year}-09-13`,
      praiseSong: '찬송가 404장',
      praiseSubtitle: '(그 크신 하나님의 사랑)',
      startHymn: '찬 408, 411',
    },
    {
      id: 'pr-03',
      dateStr: '9월 20일',
      fullDate: `${year}-09-20`,
      praiseSong: '찬송가 309장',
      praiseSubtitle: '(논밭에 오곡백과)',
      startHymn: '찬 313, 316',
    },
    {
      id: 'pr-04',
      dateStr: '9월 27일',
      fullDate: `${year}-09-27`,
      praiseSong: '악보곡',
      praiseSubtitle: '(주를 보라)',
      startHymn: '은찬 222, 223',
    },
  ];

  // 달력에 저장된 그 달의 찬양 일정이 있으면 그것을 표로 보여주고,
  // 하나도 없을 때만 기본값(9월 예시 / 빈 예시 행)을 보여줍니다.
  const calendarItems = buildRowsFromEvents(events, year, month);

  const [items, setItems] = useState<PraiseRowItem[]>(
    calendarItems.length > 0
      ? calendarItems
      : currentMonthNum === 9 ? default9MonthItems : [
      {
        id: 'pr-101',
        dateStr: `${currentMonthNum}월 4일`,
        fullDate: `${year}-${String(currentMonthNum).padStart(2, '0')}-04`,
        praiseSong: '찬송가 00장',
        praiseSubtitle: '(찬양 곡목 또는 부제)',
        startHymn: '찬 00, 00',
      }
    ]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleAddItem = () => {
    const nextId = 'pr-' + Date.now();
    setItems([
      ...items,
      {
        id: nextId,
        dateStr: `${currentMonthNum}월 1일`,
        fullDate: `${year}-${String(currentMonthNum).padStart(2, '0')}-01`,
        praiseSong: '',
        praiseSubtitle: '',
        startHymn: '',
      },
    ]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PraiseRowItem, val: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleApplyToCalendar = () => {
    const newEvents: Partial<ChurchEvent>[] = items.map((item) => {
      const cleanSubtitle = item.praiseSubtitle.replace(/[()]/g, '').trim();
      if (item.eventId) {
        return {
          id: item.eventId,
          date: item.fullDate,
          category: 'praise',
          title: `찬양대 - ${item.praiseSong}`,
          praiseSong: item.praiseSong,
          praiseSubtitle: cleanSubtitle,
          startHymn: item.startHymn,
        };
      }
      return {
        date: item.fullDate,
        category: 'praise',
        title: `찬양대 - ${item.praiseSong}`,
        time: '11:00',
        praiseSong: item.praiseSong,
        praiseSubtitle: cleanSubtitle,
        startHymn: item.startHymn,
        memo: `[시작찬송: ${item.startHymn}] ${cleanSubtitle ? `(${cleanSubtitle})` : ''}`,
      };
    });

    onApplyEvents(newEvents);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleCopyKaTalk = () => {
    let text = `🎵 [동해교회 ${currentMonthNum}월 찬양 목록]\n\n`;
    items.forEach((item) => {
      text += `📍 ${item.dateStr}\n`;
      text += ` • 찬양곡: ${item.praiseSong} ${item.praiseSubtitle}\n`;
      text += ` • 시작찬송: ${item.startHymn}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#094E85] text-white flex items-center justify-center shadow-xs">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
                <span>{currentMonthNum}월 찬양곡 표 (주보 양식)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#094E85]/10 text-[#094E85] font-semibold">
                  찬양대 / 예배
                </span>
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                주보에 인쇄되는 찬양 목록 표 양식 그대로 확인 및 등록할 수 있습니다.
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

        {/* Modal Body - Table Display matching the user's image */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-soft)]">
              {year}년 {currentMonthNum}월 찬양대 및 시작찬송 목록
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  isEditing
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-[var(--surface-soft)] border-[var(--line-soft)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {isEditing ? '완료 (보기 모드)' : '✏️ 표 내용 수정'}
              </button>
            </div>
          </div>

          {/* User Image Style Table Frame */}
          <div className="border-2 border-[#094E85] rounded-xl overflow-hidden shadow-md bg-white text-slate-900">
            {/* Table Header: Dark Blue (#094E85) */}
            <div className="grid grid-cols-12 bg-[#094E85] text-white font-bold text-base sm:text-lg text-center py-3 border-b-2 border-[#094E85]">
              <div className="col-span-8 tracking-wide flex items-center justify-center gap-2">
                <span>{currentMonthNum}월 찬양곡</span>
              </div>
              <div className="col-span-4 border-l-2 border-white/30 tracking-wide flex items-center justify-center">
                <span>시작찬송</span>
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y-2 divide-slate-300">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 items-center min-h-[64px] transition-colors hover:bg-slate-50">
                  {/* Left part: Date + Song Title & Subtitle */}
                  <div className="col-span-8 grid grid-cols-12 items-center py-2.5 px-2 sm:px-4">
                    {/* Date Column (e.g. 9월 6일) */}
                    <div className="col-span-4 border-r-2 border-slate-300 font-bold text-center text-sm sm:text-base pr-2">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.dateStr}
                            onChange={(e) => handleUpdateItem(item.id, 'dateStr', e.target.value)}
                            className="w-full text-center border rounded px-1 py-0.5 text-xs font-bold"
                          />
                          <input
                            type="date"
                            value={item.fullDate}
                            onChange={(e) => handleUpdateItem(item.id, 'fullDate', e.target.value)}
                            className="w-full text-[10px] border rounded px-1"
                          />
                        </div>
                      ) : (
                        <span>{item.dateStr}</span>
                      )}
                    </div>

                    {/* Praise Song Title + Subtitle */}
                    <div className="col-span-8 text-center px-2">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="찬양곡명 (예: 은혜찬송가 52장)"
                            value={item.praiseSong}
                            onChange={(e) => handleUpdateItem(item.id, 'praiseSong', e.target.value)}
                            className="w-full text-center border rounded px-1 py-0.5 font-bold text-xs"
                          />
                          <input
                            type="text"
                            placeholder="부제/가사 (예: (망망한 인생의 거친 바다에))"
                            value={item.praiseSubtitle}
                            onChange={(e) => handleUpdateItem(item.id, 'praiseSubtitle', e.target.value)}
                            className="w-full text-center border rounded px-1 py-0.5 text-[11px]"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-extrabold text-base sm:text-lg leading-tight text-slate-900">
                            {item.praiseSong}
                          </span>
                          {item.praiseSubtitle && (
                            <span className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5">
                              {item.praiseSubtitle.startsWith('(') ? item.praiseSubtitle : `(${item.praiseSubtitle})`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right part: Start Hymn (시작찬송) */}
                  <div className="col-span-4 border-l-2 border-slate-300 text-center font-bold text-sm sm:text-base py-2.5 px-2 flex items-center justify-center relative">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          placeholder="시작찬송 (예: 은찬 69, 91)"
                          value={item.startHymn}
                          onChange={(e) => handleUpdateItem(item.id, 'startHymn', e.target.value)}
                          className="w-full text-center border rounded px-1 py-0.5 font-semibold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span>{item.startHymn}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Row Button when editing */}
          {isEditing && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2 border-2 border-dashed border-[var(--line)] hover:border-[var(--primary)] text-[var(--ink-soft)] hover:text-[var(--primary)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ 행 추가하기 ({currentMonthNum}월 새 찬양 주일)</span>
            </button>
          )}

          {/* Tip Note */}
          <div className="p-3 bg-[var(--surface-soft)] border border-[var(--line-soft)] rounded-xl text-xs text-[var(--ink-soft)] space-y-1">
            <div className="font-semibold text-[var(--ink)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>스마트 안내</span>
            </div>
            <p>
              아래 <b>[달력에 일괄 등록]</b> 버튼을 누르시면, 위 표 내용이 해당 날짜의 <b>[찬양대 일정]</b>으로 달력에 자동 저장됩니다!
            </p>
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
            <span>{copied ? '복사 완료! (카톡에 붙여넣기)' : '카톡 공지 텍스트 복사'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              닫기
            </button>

            <button
              type="button"
              onClick={handleApplyToCalendar}
              className="px-5 py-2 rounded-full bg-[#094E85] text-white text-xs font-bold hover:bg-[#094E85]/90 transition-opacity shadow-xs flex items-center gap-1.5"
            >
              {applied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>달력 등록 완료!</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>달력에 찬양표 일괄 등록</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
