import React, { useState } from 'react';
import { ChurchEvent } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { formatKoreanDate, getDayOfWeek } from '../utils/calendar';
import { Clock, MapPin, Edit2, Trash2, Plus, Calendar } from 'lucide-react';

interface AgendaViewProps {
  events: ChurchEvent[];
  onSelectDate: (date: string) => void;
  onEditEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (id: string) => void;
  onOpenNewEventForDate: (date: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectDate,
  onEditEvent,
  onDeleteEvent,
  onOpenNewEventForDate,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });

  // Group by date
  const groupedByDate = sortedEvents.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, ChurchEvent[]>);

  const dates = Object.keys(groupedByDate).sort();

  if (dates.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-12 text-center shadow-xs">
        <Calendar className="w-12 h-12 mx-auto text-[var(--ink-faint)] mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-[var(--ink)] mb-1">표시할 일정이 없습니다</h3>
        <p className="text-xs text-[var(--ink-soft)] mb-4">
          검색어 또는 부서 필터를 변경하거나 새로운 일정을 등록해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((dateStr) => {
        const dayEvents = groupedByDate[dateStr];
        const dow = getDayOfWeek(dateStr);
        const isSun = dow === 0;
        const isSat = dow === 6;

        let dateColor = 'text-[var(--ink)]';
        if (isSun) dateColor = 'text-[var(--red)] font-bold';
        if (isSat) dateColor = 'text-[var(--blue)] font-bold';

        return (
          <div
            key={dateStr}
            className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden"
          >
            {/* Group Header */}
            <div className="px-4 py-3 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm sm:text-base font-serif ${dateColor}`}>
                  {formatKoreanDate(dateStr)}
                </span>
                <span className="text-xs text-[var(--ink-soft)] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--line-soft)]">
                  {dayEvents.length}개 일정
                </span>
              </div>
              <button
                onClick={() => onOpenNewEventForDate(dateStr)}
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1 font-medium px-2 py-1 rounded-full hover:bg-[var(--surface)]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            </div>

            {/* List Items */}
            <div className="divide-y divide-[var(--line-soft)]">
              {dayEvents.map((ev) => {
                const cat = CATEGORY_MAP[ev.category] || {
                  color: '#6B7280',
                  label: '기타',
                  bgColor: '#F3F4F6',
                  textColor: '#1F2937',
                };

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 sm:px-5 flex items-start justify-between gap-4 hover:bg-[var(--surface-hover)]/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[var(--ink)] sm:text-sm">
                            {ev.title}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: cat.bgColor,
                              color: cat.textColor,
                            }}
                          >
                            {cat.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
                          {ev.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[var(--ink-faint)]" />
                              <span>{ev.time}</span>
                            </span>
                          )}
                          {ev.memo && (
                            <span className="flex items-center gap-1">
                              <span>{ev.memo}</span>
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1 text-[var(--ink-faint)]">
                              <MapPin className="w-3 h-3" />
                              <span>{ev.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {confirmDeleteId === ev.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] rounded border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEvent(ev.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-red-600 hover:bg-red-700 text-white font-semibold shadow-2xs"
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onEditEvent(ev)}
                            className="p-1.5 rounded-md text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(ev.id)}
                            className="p-1.5 rounded-md text-[var(--ink-faint)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
