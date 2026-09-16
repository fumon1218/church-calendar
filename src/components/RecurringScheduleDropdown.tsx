import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RecurringTemplate, EventCategory } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { getStoredRecurringTemplates, getTemplatesForDate } from '../data/recurringTemplates';
import { getDayOfWeek } from '../utils/calendar';
import { 
  ChevronDown, 
  Sparkles, 
  Clock, 
  MapPin, 
  Search, 
  Plus, 
  Zap, 
  Check, 
  ArrowRight, 
  Calendar, 
  SlidersHorizontal 
} from 'lucide-react';

interface RecurringScheduleDropdownProps {
  targetDate: string; // YYYY-MM-DD
  onApplyTemplate: (template: RecurringTemplate, autoSaveImmediately: boolean) => void;
  variant?: 'button' | 'hero-card' | 'compact' | 'minimal';
  buttonLabel?: string;
  className?: string;
}

export const RecurringScheduleDropdown: React.FC<RecurringScheduleDropdownProps> = ({
  targetDate,
  onApplyTemplate,
  variant = 'button',
  buttonLabel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const templates = useMemo(() => {
    return getStoredRecurringTemplates();
  }, [isOpen]);

  const dow = getDayOfWeek(targetDate);
  const dayNames = ['주일(일요일)', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayShort = ['주일', '월', '화', '수', '목', '금', '토'][dow];

  const { recommended, others } = useMemo(() => {
    return getTemplatesForDate(templates, dow);
  }, [templates, dow]);

  // Filter with search
  const filteredRecommended = useMemo(() => {
    if (!searchTerm.trim()) return recommended;
    const q = searchTerm.toLowerCase();
    return recommended.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.memo && t.memo.toLowerCase().includes(q)) ||
        (t.location && t.location.toLowerCase().includes(q)) ||
        (t.frequencyLabel && t.frequencyLabel.toLowerCase().includes(q))
    );
  }, [recommended, searchTerm]);

  const filteredOthers = useMemo(() => {
    if (!searchTerm.trim()) return others;
    const q = searchTerm.toLowerCase();
    return others.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.memo && t.memo.toLowerCase().includes(q)) ||
        (t.location && t.location.toLowerCase().includes(q)) ||
        (t.frequencyLabel && t.frequencyLabel.toLowerCase().includes(q))
    );
  }, [others, searchTerm]);

  const handleSelect = (tmpl: RecurringTemplate, autoSave: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onApplyTemplate(tmpl, autoSave);
    setJustAddedId(tmpl.id);
    setTimeout(() => {
      setJustAddedId(null);
      if (autoSave) {
        setIsOpen(false);
      }
    }, 450);
  };

  // Rendering for Hero Card (used in DayDetailPanel when date is empty)
  if (variant === 'hero-card') {
    return (
      <div
        ref={dropdownRef}
        className={`p-4 rounded-2xl bg-gradient-to-b from-[var(--primary)]/5 via-[var(--surface-soft)] to-[var(--surface-soft)] border border-[var(--primary)]/20 shadow-xs relative ${className}`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <span>반복 일정 바로 등록</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                  {dayShort} 맞춤 추천
                </span>
              </h4>
              <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                드롭다운에서 선택하여 이 날짜에 1초 만에 등록하세요
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shadow-2xs transition-all flex-shrink-0"
          >
            <span>전체 드롭다운</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Quick Click Recommendation Chips for this Day */}
        {recommended.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] font-semibold text-[var(--ink-faint)] tracking-wider">
              {dayNames[dow]} 자주 반복되는 일정 (클릭 즉시 등록):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommended.slice(0, 4).map((tmpl) => {
                const cat = CATEGORY_MAP[tmpl.category] || {
                  color: '#6B7280',
                  bgColor: '#F3F4F6',
                  textColor: '#1F2937',
                };
                const isJustAdded = justAddedId === tmpl.id;

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={(e) => handleSelect(tmpl, true, e)}
                    className={`text-left px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs group ${
                      isJustAdded
                        ? 'bg-emerald-500 text-white border-emerald-500 scale-95'
                        : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border-[var(--line)] text-[var(--ink)]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isJustAdded ? '#fff' : cat.color }}
                    />
                    <span className="font-semibold">{tmpl.title}</span>
                    {tmpl.time && (
                      <span className="text-[10px] font-mono text-[var(--ink-faint)] group-hover:text-[var(--ink-soft)]">
                        {tmpl.time}
                      </span>
                    )}
                    {isJustAdded ? (
                      <Check className="w-3 h-3 text-white ml-0.5" />
                    ) : (
                      <Plus className="w-3 h-3 text-[var(--ink-faint)] group-hover:text-[var(--primary)] ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Popup Dropdown Menu when opened */}
        {isOpen && renderDropdownMenu()}
      </div>
    );
  }

  // Standard Button variant
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs select-none ${
          variant === 'minimal'
            ? 'bg-transparent hover:bg-[var(--surface-soft)] border-[var(--line)] text-[var(--ink-soft)]'
            : variant === 'compact'
            ? 'px-2 py-1 text-[11px] bg-[var(--surface)] hover:bg-[var(--surface-soft)] border-[var(--line)] text-[var(--ink)]'
            : 'bg-[var(--surface)] hover:bg-[var(--surface-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--primary)]'
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        <span>{buttonLabel || '반복 일정 넣기'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-faint)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && renderDropdownMenu()}
    </div>
  );

  function renderDropdownMenu() {
    return (
      <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-80 max-w-[calc(100vw-32px)] bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Menu Header with Search */}
        <div className="p-3 bg-[var(--surface-soft)] border-b border-[var(--line-soft)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>반복 일정 선택</span>
            </div>
            <span className="text-[10px] text-[var(--ink-soft)] font-mono">
              {targetDate} ({dayShort})
            </span>
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-[var(--ink-faint)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="일정 검색 (예: 주일말씀, 구역, 청년)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--primary)]"
              autoFocus
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-3 divide-y divide-[var(--line-soft)]">
          {/* Recommended Section for This Day */}
          {filteredRecommended.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-[var(--primary)] flex items-center justify-between">
                <span>🌟 {dayNames[dow]} 맞춤 정기 일정</span>
                <span className="text-[9px] font-normal text-[var(--ink-faint)]">클릭시 즉시 등록</span>
              </div>
              <div className="space-y-1">
                {filteredRecommended.map((tmpl) => renderTemplateItem(tmpl, true))}
              </div>
            </div>
          )}

          {/* Other Recurring Templates */}
          {filteredOthers.length > 0 && (
            <div className="pt-2 space-y-1">
              <div className="px-2 pb-0.5 text-[10px] font-bold text-[var(--ink-soft)] flex items-center justify-between">
                <span>📋 다른 요일 및 전체 정기 일정</span>
                <span className="text-[9px] font-normal text-[var(--ink-faint)]">{filteredOthers.length}개</span>
              </div>
              <div className="space-y-1">
                {filteredOthers.map((tmpl) => renderTemplateItem(tmpl, false))}
              </div>
            </div>
          )}

          {filteredRecommended.length === 0 && filteredOthers.length === 0 && (
            <div className="py-6 text-center text-xs text-[var(--ink-soft)]">
              검색된 반복 일정이 없습니다.
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="p-2.5 bg-[var(--surface-soft)] border-t border-[var(--line-soft)] flex items-center justify-between text-[11px] text-[var(--ink-soft)]">
          <span className="text-[10px] text-[var(--ink-faint)]">
            항목 클릭 시 즉시 추가됩니다.
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[10px] text-[var(--ink)] font-semibold hover:underline"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  function renderTemplateItem(tmpl: RecurringTemplate, isRecommended: boolean) {
    const cat = CATEGORY_MAP[tmpl.category] || {
      color: '#6B7280',
      label: '기타',
      bgColor: '#F3F4F6',
      textColor: '#1F2937',
    };
    const isJustAdded = justAddedId === tmpl.id;

    return (
      <div
        key={tmpl.id}
        onClick={(e) => handleSelect(tmpl, true, e)}
        className={`w-full p-2 rounded-xl transition-all flex items-center justify-between gap-2 group cursor-pointer ${
          isJustAdded
            ? 'bg-emerald-500 text-white'
            : isRecommended
            ? 'hover:bg-[var(--primary)]/10 bg-[var(--primary)]/5 text-[var(--ink)]'
            : 'hover:bg-[var(--surface-hover)] text-[var(--ink)]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isJustAdded ? '#fff' : cat.color }}
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold truncate text-xs">{tmpl.title}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded-full font-medium ${
                  isJustAdded
                    ? 'bg-white/20 text-white'
                    : ''
                }`}
                style={
                  !isJustAdded
                    ? { backgroundColor: cat.bgColor, color: cat.textColor }
                    : undefined
                }
              >
                {cat.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] opacity-75 mt-0.5">
              {tmpl.time && (
                <span className="flex items-center gap-0.5 font-mono">
                  <Clock className="w-2.5 h-2.5" />
                  {tmpl.time}
                </span>
              )}
              {tmpl.location && (
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5" />
                  {tmpl.location}
                </span>
              )}
              {tmpl.frequencyLabel && (
                <span className="opacity-90">{tmpl.frequencyLabel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            title="폼에 채워 넣어서 수정 후 등록"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(tmpl, false, e);
              setIsOpen(false);
            }}
            className={`p-1 rounded-lg transition-colors text-[10px] flex items-center gap-1 ${
              isJustAdded
                ? 'text-white hover:bg-white/20'
                : 'text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)]'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden group-hover:inline text-[9px]">수정</span>
          </button>

          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isJustAdded
                ? 'bg-white text-emerald-600 font-bold'
                : 'bg-[var(--surface)] group-hover:bg-[var(--primary)] group-hover:text-white text-[var(--ink-soft)] shadow-2xs'
            }`}
          >
            {isJustAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>
    );
  }
};
