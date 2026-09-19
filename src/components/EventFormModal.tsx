import React, { useState, useEffect } from 'react';
import { ChurchEvent, EventCategory } from '../types';
import { CATEGORIES } from '../data/categories';
import { getStoredRecurringTemplates } from '../data/recurringTemplates';
import { X, Calendar, Clock, MapPin, Tag, Zap, Trash2 } from 'lucide-react';
import { AddressSearchInput } from './AddressSearchInput';
import { KakaoMapPreview } from './KakaoMapPreview';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ChurchEvent> & { title: string; category: EventCategory; date: string }) => void;
  onDelete?: (id: string) => void;
  initialDate?: string;
  initialEvent?: ChurchEvent | null;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialEvent,
}) => {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<EventCategory>('worship');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [memo, setMemo] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
    if (initialEvent) {
      setDate(initialEvent.date);
      setCategory(initialEvent.category);
      setTitle(initialEvent.title);
      setTime(initialEvent.time || '');
      setMemo(initialEvent.memo || '');
      setLocation(initialEvent.location || '');
      setLat(initialEvent.lat);
      setLng(initialEvent.lng);
    } else {
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setCategory('worship');
      setTitle('');
      setTime('');
      setMemo('');
      setLocation('');
      setLat(undefined);
      setLng(undefined);
    }
  }, [initialEvent, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onSave({
      id: initialEvent?.id,
      date,
      category,
      title: title.trim(),
      time: time || undefined,
      memo: memo.trim() || undefined,
      location: location.trim() || undefined,
      lat,
      lng,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <h3 className="text-base font-serif font-bold text-[var(--ink)]">
            {initialEvent ? '교회 일정 수정' : '새 부서 일정 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Quick Autofill from Recurring Templates */}
          <div className="p-2.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[var(--ink)] font-semibold text-xs min-w-0">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 flex-shrink-0" />
              <span className="truncate">반복 일정 불러오기</span>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const tmpls = getStoredRecurringTemplates();
                const found = tmpls.find((t) => t.id === val);
                if (found) {
                  setTitle(found.title);
                  setCategory(found.category);
                  if (found.time) setTime(found.time);
                  if (found.memo) setMemo(found.memo);
                  if (found.location) setLocation(found.location);
                }
              }}
              className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">템플릿 선택 (자동 입력)...</option>
              {getStoredRecurringTemplates().map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.time ? `(${t.time})` : ''} - {t.frequencyLabel || '반복'}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--ink-faint)]" />
                <span>날짜 *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--ink-faint)]" />
                <span>시간 (선택)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[var(--ink-faint)]" />
              <span>부서 분류 *</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`p-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-[var(--ink)] font-bold text-white shadow-xs'
                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:border-[var(--ink-faint)]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? c.color : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : c.color }}
                    />
                    <span className="text-[11px] truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
              일정 제목 *
            </label>
            <input
              type="text"
              required
              placeholder="예: 주일말씀 (정현 목사), 11구역모임, 찬양의 밤"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--ink-faint)]" />
              <span>장소 (선택)</span>
            </label>
            <input
              type="text"
              placeholder="예: 본당, 소강당, 교육관 2층, 야외"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLat(undefined);
                setLng(undefined);
              }}
              className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)] mb-1.5"
            />
            <AddressSearchInput
              onSelect={(r) => {
                setLocation(r.address);
                setLat(r.lat);
                setLng(r.lng);
              }}
            />
            {lat != null && lng != null && (
              <div className="mt-1.5">
                <KakaoMapPreview lat={lat} lng={lng} height={120} />
              </div>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
              메모 / 설교자 / 비고 (선택)
            </label>
            <textarea
              rows={2}
              placeholder="설교자, 담당 조, 기간 또는 세부 준비사항"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full p-2.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line-soft)]">
            {initialEvent && onDelete ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold">정말 삭제할까요?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(initialEvent.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1 text-xs rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>일정 삭제</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium border border-[var(--line)] rounded-full text-[var(--ink-soft)] hover:bg-[var(--surface)] transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity shadow-xs"
              >
                {initialEvent ? '수정 완료' : '일정 등록'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
