import React from 'react';
import { getMonthMatrix, WEEKDAYS, getDayOfWeek } from '../utils/calendar';
import { CATEGORY_MAP } from '../data/categories';
import { ChurchEvent, RecurringTemplate } from '../types';
import { RecurringScheduleDropdown } from './RecurringScheduleDropdown';
import { Zap } from 'lucide-react';

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  events: ChurchEvent[];
  onOpenNewEventForDate: (date: string) => void;
  onApplyRecurringTemplate?: (date: string, tmpl: RecurringTemplate) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  selectedDate,
  onSelectDate,
  events,
  onOpenNewEventForDate,
  onApplyRecurringTemplate,
}) => {
  const cells = getMonthMatrix(year, month);

  // Group events by date string
  const eventsByDate = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, ChurchEvent[]>);

  // Sort events by time within each date
  Object.keys(eventsByDate).forEach((d) => {
    eventsByDate[d].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs relative">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-[var(--line-soft)] bg-[var(--surface-soft)] rounded-t-2xl overflow-hidden">
        {WEEKDAYS.map((w, idx) => {
          let textColorClass = 'text-[var(--ink-soft)]';
          if (idx === 0) textColorClass = 'text-[var(--red)] font-semibold';
          if (idx === 6) textColorClass = 'text-[var(--blue)] font-semibold';

          return (
            <div
              key={w}
              className={`py-2.5 text-center text-xs font-medium ${textColorClass}`}
            >
              {idx === 0 ? '주일' : `${w}요일`}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dayEvents = eventsByDate[cell.date] || [];
          const isSelected = selectedDate === cell.date;
          const isSun = cell.dayOfWeek === 0;
          const isSat = cell.dayOfWeek === 6;

          // Max 3 chips to display, then "+N"
          const visibleEvents = dayEvents.slice(0, 3);
          const extraCount = dayEvents.length - visibleEvents.length;

          let numColor = 'text-[var(--ink)]';
          if (!cell.inMonth) {
            numColor = 'text-[var(--ink-faint)] opacity-50';
          } else if (isSun) {
            numColor = 'text-[var(--red)] font-semibold';
          } else if (isSat) {
            numColor = 'text-[var(--blue)] font-semibold';
          }

          return (
            <div
              key={cell.date + '-' + idx}
              onClick={() => onSelectDate(cell.date)}
              onDoubleClick={() => onOpenNewEventForDate(cell.date)}
              className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-[var(--line-soft)] last:border-r-0 transition-all flex flex-col justify-between cursor-pointer relative group hover:z-20 focus-within:z-30 ${
                cell.inMonth ? 'bg-[var(--surface)]' : 'bg-[var(--surface-soft)]/50'
              } ${
                isSelected
                  ? 'ring-2 ring-[var(--primary)] ring-inset bg-[var(--surface-soft)] z-10'
                  : 'hover:bg-[var(--surface-hover)]/40'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1 gap-1">
                <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                  <span
                    className={`text-xs sm:text-sm leading-none flex items-center justify-center font-serif flex-shrink-0 ${
                      cell.isToday
                        ? 'w-6 h-6 rounded-full bg-[var(--primary)] text-white font-bold shadow-xs'
                        : numColor
                    }`}
                  >
                    {cell.day}
                  </span>

                  {cell.isToday && (
                    <span className="text-[10px] text-[var(--primary)] font-semibold whitespace-nowrap flex-shrink-0 px-1 py-0.5 bg-[var(--primary)]/10 rounded leading-none">
                      오늘
                    </span>
                  )}
                </div>

                {/* Quick Add & Recurring Dropdown on hover / focus */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {onApplyRecurringTemplate && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <RecurringScheduleDropdown
                        targetDate={cell.date}
                        onApplyTemplate={(tmpl, autoSave) => {
                          if (autoSave) {
                            onApplyRecurringTemplate(cell.date, tmpl);
                          } else {
                            onOpenNewEventForDate(cell.date);
                          }
                        }}
                        variant="compact"
                        buttonLabel="반복 ▾"
                        className="scale-90 origin-right"
                      />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewEventForDate(cell.date);
                    }}
                    className="text-[var(--ink-faint)] hover:text-[var(--ink)] text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-[var(--surface-soft)]"
                    title="이 날짜에 새 일정 직접 작성"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Event Chips or Empty Placeholder */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden justify-start">
                {dayEvents.length === 0 && cell.inMonth ? (
                  <div className="h-full flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-[var(--ink-faint)] flex items-center gap-1 font-medium bg-[var(--surface-soft)] px-2 py-0.5 rounded-md border border-[var(--line-soft)]">
                      <Zap className="w-2.5 h-2.5 text-amber-500" />
                      <span>클릭시 반복 일정 선택</span>
                    </span>
                  </div>
                ) : (
                  visibleEvents.map((ev) => {
                  const cat = CATEGORY_MAP[ev.category] || {
                    color: '#6B7280',
                    bgColor: '#F3F4F6',
                    textColor: '#1F2937',
                    borderColor: '#E5E7EB',
                  };

                  return (
                    <div
                      key={ev.id}
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 shadow-2xs transition-transform hover:scale-[1.01]"
                      style={{
                        backgroundColor: cat.bgColor,
                        color: cat.textColor,
                        borderLeft: `2.5px solid ${cat.color}`,
                      }}
                      title={`${ev.time ? `[${ev.time}] ` : ''}${ev.title}${ev.memo ? ` (${ev.memo})` : ''}`}
                    >
                      {ev.time && (
                        <span className="opacity-75 text-[9px] tabular-nums flex-shrink-0">
                          {ev.time}
                        </span>
                      )}
                      <span className="truncate">{ev.title}</span>
                    </div>
                  );
                })
              )}

                {extraCount > 0 && (
                  <span className="text-[10px] font-medium text-[var(--ink-soft)] px-1 hover:underline">
                    +{extraCount}개 더보기
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
