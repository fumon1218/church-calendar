import { CategoryMeta, EventCategory } from '../types';

export const DEFAULT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'worship',
    label: '예배·말씀',
    color: '#4A6FA5',
    bgColor: '#EDF2F9',
    borderColor: '#C4D6ED',
    textColor: '#2D4A77',
    description: '주일예배, 수요말씀, 특별집회',
  },
  {
    id: 'district',
    label: '구역모임',
    color: '#3E7C74',
    bgColor: '#EDF6F5',
    borderColor: '#BFE0DC',
    textColor: '#25544E',
    description: '구역예배, 조모임, 어머니회, 직장조',
  },
  {
    id: 'youth',
    label: '청년·학생부',
    color: '#7A5C8C',
    bgColor: '#F5EEF8',
    borderColor: '#DDC9E5',
    textColor: '#563D65',
    description: '청년회, 중고등부, 이삭부, 유초등부',
  },
  {
    id: 'praise',
    label: '찬양',
    color: '#A5793A',
    bgColor: '#FBF5EB',
    borderColor: '#ECD8BA',
    textColor: '#735222',
    description: '찬양대(성가대), 찬양의 밤, 찬양팀',
  },
  {
    id: 'event',
    label: '행사·수련회',
    color: '#6E7D3F',
    bgColor: '#F2F6E8',
    borderColor: '#CFDEC0',
    textColor: '#4C5827',
    description: '교사모임, 봉사회, 수련회, 야외교제, 교육',
  },
  {
    id: 'family',
    label: '경조사·공휴일',
    color: '#A44A3F',
    bgColor: '#FAEEEE',
    borderColor: '#F1C7C3',
    textColor: '#762F27',
    description: '결혼식, 장례, 심방, 공휴일, 기념일',
  },
];

const DEFAULT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

// 기본으로 들어 있는 분류인지 (기본 분류는 이름·색상은 바꿀 수 있지만 삭제할 수는 없습니다)
export const isDefaultCategory = (id: string) => DEFAULT_IDS.has(id);

// 색상 고르기용 기본 팔레트
export const CATEGORY_PALETTE = [
  '#4A6FA5',
  '#3E7C74',
  '#7A5C8C',
  '#A5793A',
  '#6E7D3F',
  '#A44A3F',
  '#C2607A',
  '#3D8BA8',
  '#8A6D5A',
  '#5E6B78',
  '#B5862B',
  '#4F8A5B',
];

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

function mixWith(hex: string, target: number, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v * (1 - t) + target * t)
  );
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// 대표 색상 하나로 배경/테두리/글자 색을 자동으로 만들어 줍니다.
export function deriveColors(color: string) {
  return {
    color,
    bgColor: mixWith(color, 255, 0.9),
    borderColor: mixWith(color, 255, 0.72),
    textColor: mixWith(color, 0, 0.4),
  };
}

// 이름·설명·대표 색상으로 분류 하나를 완성합니다. (기본 분류의 색이 그대로면 원래 손으로 고른 색을 유지)
export function buildCategoryMeta(
  id: string,
  label: string,
  description: string,
  color: string
): CategoryMeta {
  const base = DEFAULT_CATEGORIES.find((d) => d.id === id);
  const safeColor = isHex(color) ? color.toUpperCase() : base?.color ?? '#5E6B78';
  const colors =
    base && base.color.toUpperCase() === safeColor ? base : deriveColors(safeColor);
  return {
    id,
    label,
    description,
    color: safeColor,
    bgColor: colors.bgColor,
    borderColor: colors.borderColor,
    textColor: colors.textColor,
  };
}

export const makeCategoryId = () =>
  `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// 화면 곳곳에서 가져다 쓰는 "현재 분류 목록"입니다.
// 여러 컴포넌트가 이 배열/객체를 그대로 읽기 때문에, 새로 만들지 않고 안의 내용만 바꿔 끼웁니다.
export const CATEGORIES: CategoryMeta[] = [...DEFAULT_CATEGORIES];
export const CATEGORY_MAP: Record<EventCategory, CategoryMeta> = {};

function rebuildMap() {
  Object.keys(CATEGORY_MAP).forEach((k) => delete CATEGORY_MAP[k]);
  CATEGORIES.forEach((c) => {
    CATEGORY_MAP[c.id] = c;
  });
}
rebuildMap();

// 저장된 분류 목록(churchConfig.categories)을 현재 목록에 반영합니다.
// 저장된 게 없거나 일부 기본 분류가 빠져 있으면 기본 분류로 채웁니다.
export function applyCategories(saved?: CategoryMeta[] | null) {
  const list: CategoryMeta[] = [];
  const seen = new Set<string>();
  (Array.isArray(saved) ? saved : []).forEach((c) => {
    if (!c || typeof c.id !== 'string' || !c.id || seen.has(c.id)) return;
    const base = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
    const label = (typeof c.label === 'string' ? c.label : '').trim() || base?.label;
    if (!label) return;
    seen.add(c.id);
    list.push(
      buildCategoryMeta(
        c.id,
        label,
        typeof c.description === 'string' ? c.description : base?.description ?? '',
        c.color
      )
    );
  });
  DEFAULT_CATEGORIES.forEach((d) => {
    if (!seen.has(d.id)) list.push(d);
  });
  CATEGORIES.splice(0, CATEGORIES.length, ...list);
  rebuildMap();
}
