import React, { useState } from 'react';
import { Sparkles, FileText, X, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { ChurchEvent, EventCategory } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';

interface AITextModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseYear: number;
  baseMonth: number;
  onAddEvents: (events: Omit<ChurchEvent, 'id'>[]) => void;
}

interface ParsedItem {
  id: string;
  selected: boolean;
  date: string;
  category: EventCategory;
  title: string;
  time: string;
  memo: string;
}

export const AITextModal: React.FC<AITextModalProps> = ({
  isOpen,
  onClose,
  baseYear,
  baseMonth,
  onAddEvents,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedItem[]>([]);
  const [summary, setSummary] = useState<string>('');

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setParsedEvents([]);

    try {
      const res = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          baseYear,
          baseMonth: baseMonth + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '텍스트 분석 중 오류가 발생했습니다.');
      }

      const items: ParsedItem[] = (data.events || []).map((ev: any, idx: number) => ({
        id: `parsed-txt-${idx}-${Date.now()}`,
        selected: true,
        date: ev.date || `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}-01`,
        category: (CATEGORY_MAP[ev.category] ? ev.category : 'event') as EventCategory,
        title: ev.title || '새 일정',
        time: ev.time || '',
        memo: ev.memo || '',
      }));

      setParsedEvents(items);
      setSummary(data.summary || `${items.length}개의 일정이 분석되었습니다.`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '텍스트 분석에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = parsedEvents.every((e) => e.selected);
    setParsedEvents((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  const toggleItem = (id: string) => {
    setParsedEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateItemField = (id: string, field: keyof ParsedItem, val: any) => {
    setParsedEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const deleteItem = (id: string) => {
    setParsedEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleConfirmAdd = () => {
    const selected = parsedEvents.filter((e) => e.selected);
    if (selected.length === 0) return;

    onAddEvents(
      selected.map((e) => ({
        date: e.date,
        category: e.category,
        title: e.title,
        time: e.time || undefined,
        memo: e.memo || undefined,
      }))
    );

    onClose();
  };

  const handleSampleText = () => {
    setInputText(`[교회 주간 일정 공지]
- 10월 18일(주일) 주일말씀 (정현 목사)
- 10월 18일(주일) 예배 후 구역별 야외교제 진행
- 10월 20일(화) 22구역 소집회 (소강당)
- 10월 21일(수) 수요말씀
- 10월 24일(토) 청년회 및 중고등부 모임`);
  };

  const selectedCount = parsedEvents.filter((e) => e.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#7A5C8C]/20 text-[#563D65] dark:text-[#A98CC0] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[var(--ink)]">
                AI 공지문·카카오톡 텍스트로 일정 추가
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                카카오톡 단체방 공지나 주보 텍스트를 붙여넣으면 Gemini가 일정들을 자동 분류합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--ink-soft)]">
                공지사항 또는 문자 내용 붙여넣기
              </label>
              <button
                type="button"
                onClick={handleSampleText}
                className="text-[11px] text-[#7A5C8C] dark:text-[#A98CC0] hover:underline"
              >
                예시 문구 채우기
              </button>
            </div>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="예: 이번 주 수요일(10/21) 수요예배 후 성가대 연습이 있으며, 토요일에는 청년회 모임이 있습니다..."
              className="w-full p-3 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--ink-faint)]">
              기준 연도: {baseYear}년 {baseMonth + 1}월
            </span>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#7A5C8C] text-white hover:bg-[#684b7a] transition-colors disabled:opacity-40 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>일정 추출하기</span>
                </>
              )}
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed list */}
          {parsedEvents.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--line-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--ink)]">
                    추출된 일정 ({selectedCount}/{parsedEvents.length}개 선택됨)
                  </h4>
                  {summary && (
                    <p className="text-[11px] text-[var(--ink-soft)]">{summary}</p>
                  )}
                </div>

                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline cursor-pointer"
                >
                  {parsedEvents.every((e) => e.selected) ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {parsedEvents.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition-all flex flex-col gap-2 ${
                      item.selected
                        ? 'bg-[var(--surface)] border-[var(--primary)] shadow-xs'
                        : 'bg-[var(--surface-soft)] opacity-60 border-[var(--line)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItem(item.id)}
                          className="rounded text-[var(--primary)] focus:ring-0 cursor-pointer"
                        />
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateItemField(item.id, 'date', e.target.value)}
                          className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)] font-mono"
                        />
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateItemField(item.id, 'category', e.target.value as EventCategory)
                          }
                          className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)]"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateItemField(item.id, 'time', e.target.value)}
                          className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)] font-mono w-24"
                        />
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-[var(--ink-faint)] hover:text-[var(--red)] p-1"
                        title="제외"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                        placeholder="일정 제목"
                        className="px-2 py-1 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs font-medium text-[var(--ink)]"
                      />
                      <input
                        type="text"
                        value={item.memo}
                        onChange={(e) => updateItemField(item.id, 'memo', e.target.value)}
                        placeholder="메모/장소/설교자 (선택)"
                        className="px-2 py-1 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink-soft)]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-soft)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-[var(--line)] rounded-full text-[var(--ink-soft)] hover:bg-[var(--surface)] transition-colors"
          >
            닫기
          </button>

          {parsedEvents.length > 0 && (
            <button
              onClick={handleConfirmAdd}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-40 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>선택한 {selectedCount}개 일정 캘린더에 추가</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
