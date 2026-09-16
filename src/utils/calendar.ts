import { CalendarDayCell, ChurchEvent } from '../types';

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function padZero(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDateStr(year: number, monthZeroIndexed: number, day: number): string {
  return `${year}-${padZero(monthZeroIndexed + 1)}-${padZero(day)}`;
}

export function getTodayStr(): string {
  const d = new Date();
  return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function getDayOfWeekLabel(dateStr: string): string {
  const dow = getDayOfWeek(dateStr);
  if (dow === 0) return '주일';
  return `${WEEKDAYS[dow]}요일`;
}

export function formatKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 (${getDayOfWeekLabel(dateStr)})`;
}

export function formatShortKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일 (${getDayOfWeekLabel(dateStr)})`;
}

// Generates 35 or 42 cells representing the calendar grid for a given year & month (0-indexed)
export function getMonthMatrix(year: number, month: number): CalendarDayCell[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = getTodayStr();

  const cells: CalendarDayCell[] = [];

  // Previous month trailing days
  for (let i = 0; i < startOffset; i++) {
    const d = daysInPrev - startOffset + 1 + i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = formatDateStr(prevYear, prevMonth, d);
    cells.push({
      date: dateStr,
      day: d,
      inMonth: false,
      isToday: dateStr === today,
      dayOfWeek: i,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateStr(year, month, d);
    const dow = (startOffset + d - 1) % 7;
    cells.push({
      date: dateStr,
      day: d,
      inMonth: true,
      isToday: dateStr === today,
      dayOfWeek: dow,
    });
  }

  // Next month leading days to complete grid
  while (cells.length % 7 !== 0) {
    const d = cells.length - (startOffset + daysInMonth) + 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = formatDateStr(nextYear, nextMonth, d);
    cells.push({
      date: dateStr,
      day: d,
      inMonth: false,
      isToday: dateStr === today,
      dayOfWeek: cells.length % 7,
    });
  }

  return cells;
}

// Generates 7 days of the week containing the reference date
export function getWeekDays(referenceDateStr: string): CalendarDayCell[] {
  const [y, m, d] = referenceDateStr.split('-').map(Number);
  const refDate = new Date(y, m - 1, d);
  const dow = refDate.getDay(); // 0 = Sun
  const today = getTodayStr();

  const weekCells: CalendarDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const diff = i - dow;
    const currDate = new Date(y, m - 1, d + diff);
    const dateStr = formatDateStr(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
    weekCells.push({
      date: dateStr,
      day: currDate.getDate(),
      inMonth: true,
      isToday: dateStr === today,
      dayOfWeek: i,
    });
  }
  return weekCells;
}

// Export events to standard iCalendar (.ics) format for Google/Apple Calendar
export function generateICS(events: ChurchEvent[], churchName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Church Department Calendar//KO',
    `X-WR-CALNAME:${churchName || '교회'} 일정표`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const ev of events) {
    const dateClean = ev.date.replace(/-/g, '');
    let dtStart = `VALUE=DATE:${dateClean}`;
    let dtEnd = `VALUE=DATE:${dateClean}`;

    if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
      const [hh, mm] = ev.time.split(':');
      dtStart = `${dateClean}T${hh}${mm}00`;
      // default 1 hour duration
      const endHour = String((parseInt(hh, 10) + 1) % 24).padStart(2, '0');
      dtEnd = `${dateClean}T${endHour}${mm}00`;
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:ev-${ev.id}-${dateClean}@church-calendar`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;${dtStart}`);
    lines.push(`DTEND;${dtEnd}`);
    lines.push(`SUMMARY:[${ev.category}] ${ev.title}`);
    if (ev.memo) {
      lines.push(`DESCRIPTION:${ev.memo.replace(/\n/g, '\\n')}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${ev.location}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
