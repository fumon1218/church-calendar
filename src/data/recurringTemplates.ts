import { RecurringTemplate, ChurchEvent, EventCategory } from '../types';

export const DEFAULT_RECURRING_TEMPLATES: RecurringTemplate[] = [
  // 주일 (Sunday = 0)
  {
    id: 'tmpl-sun-worship-main',
    title: '주일말씀 (정현 목사)',
    category: 'worship',
    location: '본당',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },
  {
    id: 'tmpl-sun-isaac',
    title: '이삭부',
    category: 'youth',
    location: '유아실/소강당',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },
  {
    id: 'tmpl-sun-praise',
    title: '주일 찬양 연습',
    category: 'praise',
    location: '찬양대실',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },
  {
    id: 'tmpl-sun-youth',
    title: '청년회',
    category: 'youth',
    location: '소강당',
    memo: '주일 정기 모임',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },
  {
    id: 'tmpl-sun-midhigh',
    title: '중고등부',
    category: 'youth',
    location: '중고등부실',
    memo: '주일 분반 및 모임',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },
  {
    id: 'tmpl-sun-fellowship',
    title: '구역교제',
    category: 'district',
    location: '친교실/식당',
    suggestedDayOfWeek: 0,
    frequencyLabel: '매주 주일',
  },

  // 수요일 (Wednesday = 3)
  {
    id: 'tmpl-wed-worship',
    title: '수요말씀',
    category: 'worship',
    location: '본당',
    suggestedDayOfWeek: 3,
    frequencyLabel: '매주 수요일',
  },

  // 화요일 (Tuesday = 2)
  {
    id: 'tmpl-tue-district',
    title: '구역모임',
    category: 'district',
    memo: '각 구역 처소 / 소강당',
    suggestedDayOfWeek: 2,
    frequencyLabel: '매주 화요일',
  },
  {
    id: 'tmpl-tue-district-meeting',
    title: '구역 소집회',
    category: 'district',
    location: '소강당',
    suggestedDayOfWeek: 2,
    frequencyLabel: '매주 화요일',
  },
  {
    id: 'tmpl-tue-mothers',
    title: '어머니회',
    category: 'district',
    location: '소강당',
    suggestedDayOfWeek: 2,
    frequencyLabel: '화요일',
  },

  // 목요일 (Thursday = 4)
  {
    id: 'tmpl-thu-teachers',
    title: '교사모임',
    category: 'event',
    location: '교사실',
    suggestedDayOfWeek: 4,
    frequencyLabel: '매주 목요일',
  },
  {
    id: 'tmpl-thu-service',
    title: '봉사회',
    category: 'event',
    memo: '전체',
    suggestedDayOfWeek: 4,
    frequencyLabel: '목요일',
  },

  // 토요일 (Saturday = 6)
  {
    id: 'tmpl-sat-youth',
    title: '청년회',
    category: 'youth',
    location: '소강당',
    suggestedDayOfWeek: 6,
    frequencyLabel: '매주 토요일',
  },
  {
    id: 'tmpl-sat-midhigh',
    title: '중고등부',
    category: 'youth',
    location: '중고등부실',
    suggestedDayOfWeek: 6,
    frequencyLabel: '매주 토요일',
  },
];

const TEMPLATES_STORAGE_KEY = 'church-calendar-recurring-templates-v1';

export function getStoredRecurringTemplates(): RecurringTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        // Filter out dawn prayer (새벽기도회) and Friday prayer (금요기도회)
        const filtered = parsed.filter(
          (tmpl: RecurringTemplate) =>
            !tmpl.title.includes('새벽기도회') &&
            !tmpl.title.includes('금요기도회') &&
            tmpl.id !== 'tmpl-daily-dawn' &&
            tmpl.id !== 'tmpl-fri-prayer'
        );
        if (filtered.length !== parsed.length) {
          changed = true;
        }

        const migrated = filtered.map((tmpl: RecurringTemplate) => {
          let updated = { ...tmpl };
          // Remove default preset time so user enters time freely
          if (updated.time) {
            delete updated.time;
            changed = true;
          }

          // Remove '대예배' text
          if (updated.memo === '대예배') {
            delete updated.memo;
            changed = true;
          } else if (updated.memo && updated.memo.includes('대예배')) {
            updated.memo = updated.memo.replace(/대예배/g, '').trim();
            if (!updated.memo) delete updated.memo;
            changed = true;
          }

          if (updated.title === '찬양대') {
            updated.title = '주일 찬양 연습';
            changed = true;
          }

          return updated;
        });

        if (changed) {
          saveStoredRecurringTemplates(migrated);
        }
        return migrated;
      }
    }
  } catch (e) {
    console.error('Failed to load recurring templates', e);
  }
  return DEFAULT_RECURRING_TEMPLATES;
}

export function saveStoredRecurringTemplates(templates: RecurringTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save recurring templates', e);
  }
}

/**
 * Get templates prioritized by the selected date's day of week (0=Sun, 6=Sat)
 */
export function getTemplatesForDate(
  templates: RecurringTemplate[],
  dayOfWeek?: number
): { recommended: RecurringTemplate[]; others: RecurringTemplate[] } {
  if (dayOfWeek === undefined) {
    return { recommended: [], others: templates };
  }

  const recommended: RecurringTemplate[] = [];
  const others: RecurringTemplate[] = [];

  templates.forEach((t) => {
    if (t.suggestedDayOfWeek === dayOfWeek) {
      recommended.push(t);
    } else {
      others.push(t);
    }
  });

  return { recommended, others };
}

/**
 * Extract unique past events as potential recurring templates
 */
export function extractUniqueEventsFromHistory(events: ChurchEvent[]): RecurringTemplate[] {
  const seen = new Set<string>();
  const list: RecurringTemplate[] = [];

  events.forEach((ev) => {
    const key = `${ev.title}-${ev.category}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({
        id: `hist-${ev.id}`,
        title: ev.title,
        category: ev.category,
        time: ev.time,
        memo: ev.memo,
        location: ev.location,
        frequencyLabel: '기존 등록 일정',
      });
    }
  });

  return list;
}
