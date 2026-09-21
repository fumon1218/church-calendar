import { ChurchEvent, EventCategory } from '../types';

// CSV의 각 칸(필드)에 쉼표/따옴표/줄바꿈이 있어도 안전하게 감싸줍니다.
function csvEscape(value: any): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS: (keyof ChurchEvent)[] = [
  'date',
  'category',
  'title',
  'time',
  'memo',
  'location',
  'lat',
  'lng',
  'praiseSong',
  'praiseSubtitle',
  'startHymn',
  'sermonTitle',
  'sermonSpeaker',
  'sermonBible',
  'sermonSummary',
];

export function exportEventsToCsv(events: ChurchEvent[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = events.map((ev) => CSV_COLUMNS.map((col) => csvEscape((ev as any)[col])).join(','));
  // 엑셀에서 한글이 깨지지 않도록 BOM을 앞에 붙입니다.
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

// 한 줄(raw CSV line 여러 줄이 합쳐진 전체 텍스트)을 필드 배열의 배열로 분해합니다.
// 따옴표로 감싸진 필드 안의 줄바꿈/쉼표도 올바르게 처리합니다.
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const VALID_CATEGORIES: EventCategory[] = ['worship', 'district', 'youth', 'praise', 'event', 'family'];

export function parseEventsFromCsv(text: string): Partial<ChurchEvent>[] {
  // 맨 앞 BOM 제거
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows = parseCsvText(cleaned);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return dataRows
    .map((cols) => {
      const obj: any = {};
      header.forEach((key, idx) => {
        const val = cols[idx];
        if (val === undefined || val === '') return;
        if (key === 'lat' || key === 'lng') {
          const num = Number(val);
          if (!Number.isNaN(num)) obj[key] = num;
        } else {
          obj[key] = val;
        }
      });
      return obj;
    })
    .filter((obj) => obj.date && obj.title)
    .map((obj) => ({
      ...obj,
      category: VALID_CATEGORIES.includes(obj.category) ? obj.category : 'event',
    }));
}
