export type EventCategory = 'worship' | 'district' | 'youth' | 'praise' | 'event' | 'family';

export interface ChurchEvent {
  id: string;
  date: string; // YYYY-MM-DD
  category: EventCategory;
  title: string;
  time?: string; // HH:mm or e.g. "10:00"
  memo?: string;
  location?: string;
  lat?: number; // 카카오 지도 검색으로 채워지는 위도 (선택)
  lng?: number; // 카카오 지도 검색으로 채워지는 경도 (선택)
  isImportant?: boolean;
  praiseSong?: string; // 찬양곡 (예: "은혜찬송가 52장", "찬송가 404장", "악보곡")
  praiseSubtitle?: string; // 부제 (예: "망망한 인생의 거친 바다에", "주를 보라")
  startHymn?: string; // 시작찬송 (예: "은찬 69, 91", "찬 408, 411")
  sermonTitle?: string; // 설교 제목 (예: "은혜로 살아가는 삶")
  sermonSpeaker?: string; // 설교자 (예: "정현 목사")
  sermonBible?: string; // 본문 말씀 (예: "로마서 8장 1~11절")
  sermonSummary?: string; // 핵심 요약 문구
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
  locationLabel?: string; // 교회 위치 표시 이름 (날씨 예보 기준점)
  lat?: number;
  lng?: number;
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

