import { CategoryMeta, EventCategory } from '../types';

export const CATEGORIES: CategoryMeta[] = [
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

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<EventCategory, CategoryMeta>;
