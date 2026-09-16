import React, { useState } from 'react';
import { ChurchEvent, EventCategory, RecurringTemplate } from '../types';
import { CATEGORY_MAP, CATEGORIES } from '../data/categories';
import { formatKoreanDate, getDayOfWeek } from '../utils/calendar';
import { Plus, Edit2, Trash2, Clock, MapPin, Calendar, X, Zap } from 'lucide-react';
import { RecurringScheduleDropdown } from './RecurringScheduleDropdown';
import { getStoredRecurringTemplates } from '../data/recurringTemplates';

interface DayDetailPanelProps {
  selectedDate: string | null;
  events: ChurchEvent[];
  onClose?: () => void;
  onSaveEvent: (event: Partial<ChurchEvent> & { title: string; category: EventCategory; date: string }) => void;
  onDeleteEvent: (id: string) => void;
  onOpenFullFormModal?: (date?: string, event?: ChurchEvent) => void;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  selectedDate,
  events,
  onClose,
  onSaveEvent,
  onDeleteEvent,
  onOpenFullFormModal,
}) => {
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state for inline add/edit
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('worship');
  const [time, setTime] = useState('');
  const [memo, setMemo] = useState('');

  const dayEvents = selectedDate
    ? events
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    : [];

  const handleStartAdd = () => {
    setIsAddingInline(true);
    setEditingId(null);
    setTitle('');
    setCategory('worship');
    setTime('');
    setMemo('');
  };

  const handleStartEdit = (ev: ChurchEvent) => {
    setEditingId(ev.id);
    setIsAddingInline(false);
    setTitle(ev.title);
    setCategory(ev.category);
    setTime(ev.time || '');
    setMemo(ev.memo || '');
  };

  const handleCancel = () => {
    setIsAddingInline(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) return;

    onSaveEvent({
      id: editingId || undefined,
      date: selectedDate,
      category,
      title: title.trim(),
      time: time || undefined,
      memo: memo.trim() || undefined,
    });

    handleCancel();
  };

  const handleApplyTemplate = (tmpl: RecurringTemplate, autoSaveImmediately: boolean) => {
    if (!selectedDate) return;
    if (autoSaveImmediately) {
      onSaveEvent({
        date: selectedDate,
        category: tmpl.category,
        title: tmpl.title,
        time: tmpl.time || undefined,
        memo: tmpl.memo || undefined,
        location: tmpl.location || undefined,
      });
    } else {
      setIsAddingInline(true);
      setEditingId(null);
      setTitle(tmpl.title);
      setCategory(tmpl.category);
      setTime(tmpl.time || '');
      setMemo(tmpl.memo || (tmpl.location ? `장소: ${tmpl.location}` : ''));
    }
  };

  if (!selectedDate) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 shadow-xs text-center flex flex-col items-center justify-center min-h-[300px]">
        <Calendar className="w-10 h-10 text-[var(--ink-faint)] mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-[var(--ink)] mb-1">날짜를 선택해주세요</h4>
        <p className="text-xs text-[var(--ink-soft)] leading-relaxed max-w-[220px]">
          달력에서 원하는 날짜를 클릭하면 해당 날짜의 부서 일정 목록 확인 및 새 일정 추가가 가능합니다.
        </p>
      </div>
    );
  }

  const dow = getDayOfWeek(selectedDate);
  const isSun = dow === 0;
  const isSat = dow === 6;

  let titleColor = 'text-[var(--ink)]';
  if (isSun) titleColor = 'text-[var(--red)] font-bold';
  if (isSat) titleColor = 'text-[var(--blue)] font-bold';

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Panel Header */}
      <div className="p-4 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[var(--ink-soft)] font-medium">선택한 날짜</p>
          <h3 className={`text-base sm:text-lg font-serif truncate ${titleColor}`}>
            {formatKoreanDate(selectedDate)}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <RecurringScheduleDropdown
            targetDate={selectedDate}
            onApplyTemplate={handleApplyTemplate}
            variant="compact"
            buttonLabel="반복 일정 ▾"
          />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
        {dayEvents.length === 0 && !isAddingInline ? (
          <div className="space-y-3 py-1">
            <RecurringScheduleDropdown
              targetDate={selectedDate}
              onApplyTemplate={handleApplyTemplate}
              variant="hero-card"
            />
          </div>
        ) : (
          dayEvents.map((ev) => {
            const cat = CATEGORY_MAP[ev.category] || {
              color: '#6B7280',
              label: '기타',
              bgColor: '#F3F4F6',
              textColor: '#1F2937',
            };

            if (editingId === ev.id) {
              return (
                <form
                  key={ev.id}
                  onSubmit={handleSave}
                  className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--surface-soft)] space-y-2.5 text-xs shadow-xs"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                      일정 제목 *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        부서 분류
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as EventCategory)}
                        className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        시간 (선택)
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                      메모/장소/담당자
                    </label>
                    <textarea
                      rows={2}
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="예: 소강당, 김진평 성도 자녀"
                      className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteEvent(ev.id);
                        handleCancel();
                      }}
                      className="px-2.5 py-1 text-xs rounded-full border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>일정 삭제</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-3 py-1 text-xs rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface)]"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 text-xs rounded-full bg-[var(--primary)] text-white hover:opacity-90 font-medium"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </form>
              );
            }

            if (confirmDeleteId === ev.id) {
              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 flex items-center justify-between gap-2 animate-in fade-in shadow-2xs"
                >
                  <div className="min-w-0 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 font-semibold">
                    <Trash2 className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="truncate">'{ev.title}' 삭제할까요?</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteEvent(ev.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-2xs transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] hover:border-[var(--line)] transition-all flex items-start justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="text-xs font-semibold text-[var(--ink)] leading-snug">
                        {ev.title}
                      </h5>
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded-full font-medium"
                        style={{
                          backgroundColor: cat.bgColor,
                          color: cat.textColor,
                        }}
                      >
                        {cat.label}
                      </span>
                    </div>

                    {(ev.praiseSong || ev.startHymn) && (
                      <div className="mt-1.5 p-2 rounded-lg bg-[#094E85]/10 border border-[#094E85]/20 text-[11px] space-y-0.5">
                        {ev.praiseSong && (
                          <div className="font-bold text-[#094E85] dark:text-[#64B5F6] flex items-center gap-1 flex-wrap">
                            <span>🎵 찬양곡: {ev.praiseSong}</span>
                            {ev.praiseSubtitle && (
                              <span className="font-medium text-[10px] text-[var(--ink-soft)]">
                                ({ev.praiseSubtitle})
                              </span>
                            )}
                          </div>
                        )}
                        {ev.startHymn && (
                          <div className="text-[10px] font-medium text-[var(--ink-soft)]">
                            시작찬송: <span className="font-bold text-[var(--ink)]">{ev.startHymn}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(ev.sermonTitle || ev.sermonBible || ev.sermonSummary) && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] space-y-1">
                        <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 flex-wrap">
                          <span>📖 설교: {ev.sermonTitle || ev.title}</span>
                          {ev.sermonSpeaker && (
                            <span className="font-normal text-[10px]">({ev.sermonSpeaker})</span>
                          )}
                        </div>
                        {ev.sermonBible && (
                          <div className="text-[10px] italic text-[var(--ink-soft)] font-serif">
                            본문: {ev.sermonBible}
                          </div>
                        )}
                        {ev.sermonSummary && (
                          <div className="text-[10px] text-[var(--ink-soft)] whitespace-pre-line leading-relaxed font-medium pt-0.5 border-t border-amber-500/20">
                            {ev.sermonSummary}
                          </div>
                        )}
                      </div>
                    )}

                    {(ev.time || (ev.memo && !ev.praiseSong && !ev.sermonTitle)) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[var(--ink-soft)]">
                        {ev.time && (
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-2.5 h-2.5 text-[var(--ink-faint)]" />
                            {ev.time}
                          </span>
                        )}
                        {ev.memo && !ev.praiseSong && <span>{ev.memo}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 opacity-70 hover:opacity-100">
                  <button
                    onClick={() => handleStartEdit(ev)}
                    className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]"
                    title="수정"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(ev.id)}
                    className="p-1 rounded text-[var(--ink-faint)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Inline Add Form */}
        {isAddingInline && (
          <form
            onSubmit={handleSave}
            className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--surface-soft)] space-y-2.5 text-xs shadow-xs"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--line-soft)]">
              <span className="font-semibold text-xs text-[var(--ink)]">새 일정 추가</span>
              
              {/* Quick Template Selector dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--ink-faint)]">반복 템플릿:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const tmpls = getStoredRecurringTemplates();
                    const found = tmpls.find((t) => t.id === val);
                    if (found) {
                      setTitle(found.title);
                      setCategory(found.category);
                      if (found.time) setTime(found.time);
                      if (found.memo || found.location) {
                        setMemo(found.memo || (found.location ? `장소: ${found.location}` : ''));
                      }
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[10px] text-[var(--ink)] font-medium focus:outline-none"
                >
                  <option value="">선택하여 채우기...</option>
                  {getStoredRecurringTemplates().map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.time ? `(${t.time})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                일정 제목 *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 주일말씀, 구역모임, 찬양대"
                className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  부서 분류
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  시간 (선택)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                메모 / 장소 / 담당자
              </label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="장소, 준비물, 설교자 등"
                className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 text-xs rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface)]"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 text-xs rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 font-medium"
              >
                추가
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer / Add Button */}
      {!isAddingInline && (
        <div className="p-3 bg-[var(--surface-soft)] border-t border-[var(--line-soft)] flex items-center gap-2">
          <button
            onClick={handleStartAdd}
            className="flex-1 py-2 px-3 rounded-xl border border-dashed border-[var(--ink-faint)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-xs text-[var(--ink-soft)] font-medium flex items-center justify-center gap-1.5 transition-colors bg-[var(--surface)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 일정 직접 입력</span>
          </button>

          <RecurringScheduleDropdown
            targetDate={selectedDate}
            onApplyTemplate={handleApplyTemplate}
            variant="button"
            buttonLabel="반복 일정 드롭다운"
          />
        </div>
      )}
    </div>
  );
};
