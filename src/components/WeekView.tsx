import React from 'react';
import { getWeekDays, WEEKDAYS, formatShortKoreanDate } from '../utils/calendar';
import { CATEGORY_MAP } from '../data/categories';
import { ChurchEvent } from '../types';
import { Clock, MapPin, Plus } from 'lucide-react';
import { HolidayMap } from '../utils/holidays';
import { WeatherMap, weatherEmoji } from '../utils/weather';

interface WeekViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  events: ChurchEvent[];
  onOpenNewEventForDate: (date: string) => void;
  holidays?: HolidayMap;
  weather?: WeatherMap;
}

export const WeekView: React.FC<WeekViewProps> = ({
  selectedDate,
  onSelectDate,
  events,
  onOpenNewEventForDate,
  holidays = {},
  weather = {},
}) => {
  const weekDays = getWeekDays(selectedDate);

  const eventsByDate = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, ChurchEvent[]>);

  // Sort events by time
  Object.keys(eventsByDate).forEach((d) => {
    eventsByDate[d].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden">
      <div className="p-3 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] flex items-center justify-between text-xs text-[var(--ink-soft)]">
        <span>
          주간 일정: {formatShortKoreanDate(weekDays[0].date)} ~ {formatShortKoreanDate(weekDays[6].date)}
        </span>
        <span className="hidden sm:inline">날짜를 클릭하여 상세 일정 및 수정을 할 수 있습니다.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[var(--line-soft)] min-h-[420px]">
        {weekDays.map((cell) => {
          const dayEvents = eventsByDate[cell.date] || [];
          const isSelected = selectedDate === cell.date;
          const isSun = cell.dayOfWeek === 0;
          const isSat = cell.dayOfWeek === 6;

          let headerColor = 'text-[var(--ink)]';
          if (isSun) headerColor = 'text-[var(--red)] font-bold';
          if (isSat) headerColor = 'text-[var(--blue)] font-bold';

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={`flex flex-col cursor-pointer transition-colors p-3 ${
                isSelected ? 'bg-[var(--surface-soft)] ring-2 ring-inset ring-[var(--primary)]' : 'hover:bg-[var(--surface-hover)]/30'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2 mb-3">
                <div>
                  <span className={`text-xs ${headerColor}`}>
                    {isSun ? '주일' : `${WEEKDAYS[cell.dayOfWeek]}요일`}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-lg font-serif font-bold ${
                        cell.isToday
                          ? 'w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm shadow-xs'
                          : headerColor
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cell.isToday && (
                      <span className="text-[10px] text-[var(--primary)] font-bold whitespace-nowrap flex-shrink-0 px-1 py-0.5 bg-[var(--primary)]/10 rounded leading-none">
                        오늘
                      </span>
                    )}
                    {weather[cell.date] && (
                      <span
                        className="text-[10px] flex items-center gap-0.5 flex-shrink-0"
                        title={`최고 ${Math.round(weather[cell.date].tMax)}° / 최저 ${Math.round(weather[cell.date].tMin)}°`}
                      >
                        <span>{weatherEmoji(weather[cell.date].code)}</span>
                        <span className="text-[var(--ink-faint)]">{Math.round(weather[cell.date].tMax)}°</span>
                      </span>
                    )}
                  </div>
                  {holidays[cell.date] && (
                    <div className="text-[10px] text-[var(--red)] font-semibold mt-0.5">
                      {holidays[cell.date]}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNewEventForDate(cell.date);
                  }}
                  className="p-1 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]"
                  title="일정 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day Events Stack */}
              <div className="flex-1 flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--ink-faint)] italic">
                    일정 없음
                  </div>
                ) : (
                  dayEvents.map((ev) => {
                    const cat = CATEGORY_MAP[ev.category] || {
                      color: '#6B7280',
                      bgColor: '#F3F4F6',
                      textColor: '#1F2937',
                    };

                    return (
                      <div
                        key={ev.id}
                        className="p-2 rounded-lg text-xs border shadow-2xs transition-all hover:translate-y-[-1px]"
                        style={{
                          backgroundColor: cat.bgColor,
                          borderColor: cat.color + '40',
                          color: cat.textColor,
                        }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-semibold leading-tight line-clamp-2">
                            {ev.title}
                          </span>
                        </div>

                        {ev.time && (
                          <div className="flex items-center gap-1 text-[11px] opacity-80 mb-0.5">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{ev.time}</span>
                          </div>
                        )}

                        {ev.memo && (
                          <div className="text-[10px] opacity-75 line-clamp-2">
                            {ev.memo}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
