export type EventCategory = 'worship' | 'district' | 'youth' | 'praise' | 'event' | 'family';

export interface ChurchEvent {
  id: string;
  date: string; // YYYY-MM-DD
  category: EventCategory;
  title: string;
  time?: string; // HH:mm or e.g. "10:00"
  memo?: string;
  location?: string;
  isImportant?: boolean;
}

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export type ViewMode = 'month' | 'week' | 'agenda';

export interface ChurchConfig {
  churchName: string;
  subTitle: string;
  motto: string;
}

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0=Sun, 6=Sat
}

export interface RecurringTemplate {
  id: string;
  title: string;
  category: EventCategory;
  time?: string; // HH:mm
  memo?: string;
  location?: string;
  suggestedDayOfWeek?: number; // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  frequencyLabel?: string; // e.g. "매주 주일", "매주 수요일", "화요일"
}

