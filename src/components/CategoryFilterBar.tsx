import React from 'react';
import { Pencil } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { EventCategory, ChurchEvent } from '../types';

interface CategoryFilterBarProps {
  selectedCategory: EventCategory | 'all';
  onSelectCategory: (cat: EventCategory | 'all') => void;
  events: ChurchEvent[];
  onEditCategories?: () => void;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  events,
  onEditCategories,
}) => {
  // Compute counts per category
  const countMap = events.reduce((acc, ev) => {
    acc[ev.category] = (acc[ev.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs">
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium flex items-center gap-1.5 border ${
          selectedCategory === 'all'
            ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-xs'
            : 'bg-[var(--surface)] text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ink-faint)]'
        }`}
      >
        <span>전체 부서</span>
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
          selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[var(--surface-soft)] text-[var(--ink-faint)]'
        }`}>
          {events.length}
        </span>
      </button>

      {CATEGORIES.map((cat) => {
        const count = countMap[cat.id] || 0;
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium flex items-center gap-1.5 border ${
              isSelected
                ? 'shadow-xs text-white'
                : 'bg-[var(--surface)] text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ink-faint)]'
            }`}
            style={{
              backgroundColor: isSelected ? cat.color : undefined,
              borderColor: isSelected ? cat.color : undefined,
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color }}
            />
            <span>{cat.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/25 text-white' : 'bg-[var(--surface-soft)] text-[var(--ink-faint)]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {onEditCategories && (
        <button
          type="button"
          onClick={onEditCategories}
          title="부서 분류 만들기·편집"
          className="px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium flex items-center gap-1.5 border border-dashed border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--ink-faint)]"
        >
          <Pencil className="w-3 h-3" />
          <span>분류 편집</span>
        </button>
      )}
    </div>
  );
};
