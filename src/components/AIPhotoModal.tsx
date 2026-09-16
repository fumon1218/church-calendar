import React, { useState, useRef } from 'react';
import { Sparkles, Upload, Image, X, Check, Loader2, AlertCircle, Trash2, Calendar, Clock } from 'lucide-react';
import { ChurchEvent, EventCategory } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';

interface AIPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseYear: number;
  baseMonth: number;
  onAddEvents: (events: Omit<ChurchEvent, 'id'>[]) => void;
}

interface ParsedItem {
  id: string;
  selected: boolean;
  date: string;
  category: EventCategory;
  title: string;
  time: string;
  memo: string;
}

export const AIPhotoModal: React.FC<AIPhotoModalProps> = ({
  isOpen,
  onClose,
  baseYear,
  baseMonth,
  onAddEvents,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedItem[]>([]);
  const [summary, setSummary] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;

    setIsLoading(true);
    setErrorMessage(null);
    setParsedEvents([]);

    try {
      const res = await fetch('/api/ai/parse-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          baseYear,
          baseMonth: baseMonth + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '사진 분석 중 오류가 발생했습니다.');
      }

      const items: ParsedItem[] = (data.events || []).map((ev: any, idx: number) => ({
        id: `parsed-${idx}-${Date.now()}`,
        selected: true,
        date: ev.date || `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}-01`,
        category: (['worship', 'district', 'youth', 'praise', 'event', 'family'].includes(ev.category)
          ? ev.category
          : 'event') as EventCategory,
        title: ev.title || '새 일정',
        time: ev.time || '',
        memo: ev.memo || '',
      }));

      setParsedEvents(items);
      setSummary(data.summary || `${items.length}개의 일정이 감지되었습니다.`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '이미지 분석에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = parsedEvents.every((e) => e.selected);
    setParsedEvents((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  const toggleItem = (id: string) => {
    setParsedEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateItemField = (id: string, field: keyof ParsedItem, val: any) => {
    setParsedEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const deleteItem = (id: string) => {
    setParsedEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleConfirmAdd = () => {
    const selected = parsedEvents.filter((e) => e.selected);
    if (selected.length === 0) return;

    onAddEvents(
      selected.map((e) => ({
        date: e.date,
        category: e.category,
        title: e.title,
        time: e.time || undefined,
        memo: e.memo || undefined,
      }))
    );

    onClose();
  };

  const selectedCount = parsedEvents.filter((e) => e.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3E7C74]/20 text-[#25544E] dark:text-[#64A79A] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[var(--ink)]">
                AI 주보·일정표 사진으로 일정 추가
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                교회 주보, 소식지, 게시판 사진을 올리면 Gemini AI가 일정을 자동으로 추출합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Upload Area */}
          {!imagePreview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--line)] hover:border-[#3E7C74] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[var(--surface-soft)]/40 hover:bg-[var(--surface-soft)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-[#3E7C74]/15 text-[#25544E] dark:text-[#64A79A] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">
                교회 주보나 일정표 사진을 업로드하세요
              </p>
              <p className="text-xs text-[var(--ink-soft)] mb-2">
                파일을 드래그하거나 클릭하여 이미지 선택 (JPG, PNG, WebP)
              </p>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-soft)]">
                스마트폰으로 찍은 주보 사진도 즉시 인식됩니다
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview Card */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imagePreview}
                    alt="업로드된 주보 미리보기"
                    className="w-14 h-14 object-cover rounded-lg border border-[var(--line)] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--ink)] truncate">
                      주보/일정표 이미지 준비됨
                    </p>
                    <p className="text-[11px] text-[var(--ink-soft)]">
                      기준 연도/월: {baseYear}년 {baseMonth + 1}월
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      setParsedEvents([]);
                      setErrorMessage(null);
                    }}
                    className="text-xs px-2.5 py-1 text-[var(--ink-soft)] hover:text-[var(--red)] border border-[var(--line)] rounded-full hover:bg-[var(--surface)]"
                  >
                    사진 교체
                  </button>

                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#3E7C74] text-white hover:bg-[#346a63] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 분석 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>일정 추출하기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Parsed Events Review List */}
              {parsedEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--ink)]">
                        추출된 일정 ({selectedCount}/{parsedEvents.length}개 선택됨)
                      </h4>
                      {summary && (
                        <p className="text-[11px] text-[var(--ink-soft)]">{summary}</p>
                      )}
                    </div>

                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline cursor-pointer"
                    >
                      {parsedEvents.every((e) => e.selected) ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {parsedEvents.map((item) => {
                      const cat = CATEGORY_MAP[item.category] || { color: '#6B7280' };

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border text-xs transition-all flex flex-col gap-2 ${
                            item.selected
                              ? 'bg-[var(--surface)] border-[var(--primary)] shadow-xs'
                              : 'bg-[var(--surface-soft)] opacity-60 border-[var(--line)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleItem(item.id)}
                                className="rounded text-[var(--primary)] focus:ring-0 cursor-pointer"
                              />

                              <input
                                type="date"
                                value={item.date}
                                onChange={(e) => updateItemField(item.id, 'date', e.target.value)}
                                className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)] font-mono"
                              />

                              <select
                                value={item.category}
                                onChange={(e) =>
                                  updateItemField(item.id, 'category', e.target.value as EventCategory)
                                }
                                className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)]"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="time"
                                value={item.time}
                                onChange={(e) => updateItemField(item.id, 'time', e.target.value)}
                                placeholder="시간"
                                className="px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink)] font-mono w-24"
                              />
                            </div>

                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-[var(--ink-faint)] hover:text-[var(--red)] p-1"
                              title="제외"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                              placeholder="일정 제목"
                              className="px-2 py-1 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs font-medium text-[var(--ink)]"
                            />
                            <input
                              type="text"
                              value={item.memo}
                              onChange={(e) => updateItemField(item.id, 'memo', e.target.value)}
                              placeholder="메모/설교자/장소 (선택)"
                              className="px-2 py-1 bg-[var(--surface-soft)] border border-[var(--line)] rounded text-xs text-[var(--ink-soft)]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-soft)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-[var(--line)] rounded-full text-[var(--ink-soft)] hover:bg-[var(--surface)] transition-colors"
          >
            닫기
          </button>

          {parsedEvents.length > 0 && (
            <button
              onClick={handleConfirmAdd}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-40 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>선택한 {selectedCount}개 일정 캘린더에 추가</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
