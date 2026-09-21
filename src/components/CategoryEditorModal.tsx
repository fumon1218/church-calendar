import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { CategoryMeta, ChurchEvent } from '../types';
import {
  CATEGORY_PALETTE,
  buildCategoryMeta,
  isDefaultCategory,
  makeCategoryId,
} from '../data/categories';

interface CategoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryMeta[];
  events: ChurchEvent[];
  onSave: (categories: CategoryMeta[]) => void;
}

interface DraftCategory {
  id: string;
  label: string;
  description: string;
  color: string;
}

export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  isOpen,
  onClose,
  categories,
  events,
  onSave,
}) => {
  const [draft, setDraft] = useState<DraftCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 창을 열 때마다 현재 분류 목록을 복사해서 편집용으로 가져옵니다. (저장 전에는 원본이 바뀌지 않습니다)
  useEffect(() => {
    if (!isOpen) return;
    setDraft(
      categories.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description,
        color: c.color,
      }))
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const countFor = (id: string) => events.filter((e) => e.category === id).length;

  const updateItem = (id: string, patch: Partial<DraftCategory>) => {
    setError(null);
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAdd = () => {
    setError(null);
    const used = new Set(draft.map((c) => c.color.toUpperCase()));
    const color = CATEGORY_PALETTE.find((p) => !used.has(p.toUpperCase())) || CATEGORY_PALETTE[0];
    setDraft((prev) => [...prev, { id: makeCategoryId(), label: '', description: '', color }]);
    setTimeout(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  };

  const handleRemove = (id: string) => {
    setError(null);
    setDraft((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    const names = draft.map((c) => c.label.trim());
    if (names.some((n) => !n)) {
      setError('이름이 비어 있는 분류가 있습니다. 이름을 입력하거나 삭제해 주세요.');
      return;
    }
    if (new Set(names).size !== names.length) {
      setError('같은 이름의 분류가 두 개 이상 있습니다. 이름을 서로 다르게 해 주세요.');
      return;
    }
    onSave(
      draft.map((c) => buildCategoryMeta(c.id, c.label.trim(), c.description.trim(), c.color))
    );
    onClose();
  };

  const inputCls =
    'w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <h3 className="text-base font-serif font-bold text-[var(--ink)] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[var(--ink-faint)]" />
            부서 분류 편집
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={listRef} className="p-4 sm:p-5 space-y-3 overflow-y-auto text-xs">
          <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed">
            이름과 색상을 바꾸거나 새 분류를 만들 수 있습니다. 기본 분류는 삭제할 수 없고, 일정이 들어 있는
            분류도 삭제할 수 없습니다.
          </p>

          {draft.map((c) => {
            const isDefault = isDefaultCategory(c.id);
            const count = countFor(c.id);
            const canDelete = !isDefault && count === 0;
            return (
              <div
                key={c.id}
                className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <input
                    type="text"
                    value={c.label}
                    maxLength={20}
                    placeholder="분류 이름 (예: 새가족부)"
                    onChange={(e) => updateItem(c.id, { label: e.target.value })}
                    className={`${inputCls} font-semibold`}
                  />
                  {isDefault ? (
                    <span className="text-[10px] text-[var(--ink-faint)] whitespace-nowrap px-1">기본</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canDelete}
                      onClick={() => handleRemove(c.id)}
                      title={
                        canDelete
                          ? '이 분류 삭제'
                          : `이 분류에 등록된 일정이 ${count}개 있어 삭제할 수 없습니다`
                      }
                      className="p-2 rounded-full text-[var(--ink-faint)] hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-[var(--ink-faint)] disabled:hover:bg-transparent transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={c.description}
                  maxLength={60}
                  placeholder="설명 (선택) 예: 새가족 환영회, 정착 교육"
                  onChange={(e) => updateItem(c.id, { description: e.target.value })}
                  className={inputCls}
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORY_PALETTE.map((p) => {
                    const selected = p.toUpperCase() === c.color.toUpperCase();
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateItem(c.id, { color: p })}
                        aria-label={`색상 ${p}`}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          selected ? 'border-[var(--ink)] scale-110' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: p }}
                      />
                    );
                  })}
                  <label
                    className="w-5 h-5 rounded-full border border-dashed border-[var(--ink-faint)] flex items-center justify-center text-[10px] text-[var(--ink-faint)] cursor-pointer overflow-hidden relative"
                    title="원하는 색 직접 고르기"
                  >
                    +
                    <input
                      type="color"
                      value={c.color}
                      onChange={(e) => updateItem(c.id, { color: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                  <span className="ml-auto text-[10px] text-[var(--ink-faint)]">일정 {count}개</span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink-faint)] hover:text-[var(--ink)] font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 분류 추가
          </button>

          {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
        </div>

        <div className="p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--surface-soft)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-full text-[var(--ink-soft)] hover:bg-[var(--surface)] border border-[var(--line)] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
