import React, { useState } from 'react';
import { ChurchConfig, ChurchEvent, RecurringTemplate, EventCategory } from '../types';
import { X, Download, Upload, RotateCcw, Check, Save, Zap, Plus, Trash2 } from 'lucide-react';
import { downloadFile } from '../utils/calendar';
import { ChurchLogo } from './ChurchLogo';
import { CATEGORY_MAP, CATEGORIES } from '../data/categories';
import { getStoredRecurringTemplates, saveStoredRecurringTemplates, DEFAULT_RECURRING_TEMPLATES } from '../data/recurringTemplates';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchConfig: ChurchConfig;
  onUpdateChurchConfig: (config: ChurchConfig) => void;
  events: ChurchEvent[];
  onImportEvents: (events: ChurchEvent[]) => void;
  onResetSeed: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  churchConfig,
  onUpdateChurchConfig,
  events,
  onImportEvents,
  onResetSeed,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'templates' | 'data'>('general');
  const [churchName, setChurchName] = useState(churchConfig.churchName);
  const [subTitle, setSubTitle] = useState(churchConfig.subTitle);
  const [motto, setMotto] = useState(churchConfig.motto);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Recurring templates management state
  const [templates, setTemplates] = useState<RecurringTemplate[]>(() => getStoredRecurringTemplates());
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplCat, setNewTmplCat] = useState<EventCategory>('worship');
  const [newTmplTime, setNewTmplTime] = useState('');
  const [newTmplFreq, setNewTmplFreq] = useState('');
  const [confirmResetTemplates, setConfirmResetTemplates] = useState(false);
  const [confirmResetSeed, setConfirmResetSeed] = useState(false);

  if (!isOpen) return null;

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplTitle.trim()) return;

    const newTmpl: RecurringTemplate = {
      id: `custom-tmpl-${Date.now()}`,
      title: newTmplTitle.trim(),
      category: newTmplCat,
      time: newTmplTime || undefined,
      frequencyLabel: newTmplFreq.trim() || '정기 일정',
    };

    const updated = [...templates, newTmpl];
    setTemplates(updated);
    saveStoredRecurringTemplates(updated);
    setNewTmplTitle('');
    setNewTmplTime('');
    setNewTmplFreq('');
    setStatusMsg('새 반복 일정 템플릿이 등록되었습니다.');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveStoredRecurringTemplates(updated);
    setStatusMsg('반복 일정 템플릿이 삭제되었습니다.');
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleResetTemplates = () => {
    setTemplates(DEFAULT_RECURRING_TEMPLATES);
    saveStoredRecurringTemplates(DEFAULT_RECURRING_TEMPLATES);
    setConfirmResetTemplates(false);
    setStatusMsg('반복 일정 템플릿이 기본값으로 초기화되었습니다.');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateChurchConfig({
      churchName: churchName.trim() || '교회',
      subTitle: subTitle.trim() || '부서 일정 달력',
      motto: motto.trim() || '말씀과 기도로 거룩하여지는 공동체',
    });
    setStatusMsg('교회 정보가 성공적으로 저장되었습니다.');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(events, null, 2);
    downloadFile(
      `${churchName.replace(/\s+/g, '_')}_일정백업_${new Date().toISOString().slice(0, 10)}.json`,
      dataStr,
      'application/json'
    );
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportEvents(parsed);
          setStatusMsg(`${parsed.length}개의 일정을 성공적으로 복원했습니다.`);
          setTimeout(() => setStatusMsg(null), 2500);
        } else {
          alert('올바른 일정 백업 JSON 파일이 아닙니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center p-0.5 overflow-hidden shadow-xs">
              <ChurchLogo size={26} />
            </div>
            <h3 className="text-base font-serif font-bold text-[var(--ink)]">
              교회 환경 및 데이터 설정
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            기본 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span>반복 일정 드롭다운</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--line)] text-[var(--ink-soft)]">
              {templates.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            데이터 백업
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 text-xs overflow-y-auto max-h-[80vh]">
          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-1.5">
                <h4 className="text-xs font-bold text-[var(--ink)]">
                  교회 명칭 및 공식 로고
                </h4>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  공식 로고 적용됨
                </span>
              </div>

              {/* Logo Preview Banner */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-[var(--surface)] border border-[var(--line)] shadow-xs flex items-center justify-center p-1 flex-shrink-0">
                  <ChurchLogo size={42} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--ink)]">동해교회 공식 심볼 로고</p>
                  <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">지구본 위의 성령 평화의 비둘기 엠블럼</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  교회 이름
                </label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  상단 부제목
                </label>
                <input
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  이번 달 교회 표어 / 말씀
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="예: 믿음의 주 온전케 하시는 예수를 바라보자"
                  className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--ink)] text-[var(--bg)] font-medium hover:opacity-90 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>설정 저장</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Recurring Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-[var(--ink)]">
                    반복 일정 드롭다운 목록 관리
                  </h4>
                  <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                    빈 날짜를 클릭했을 때 드롭다운에 표시되는 자주 쓰는 일정 목록입니다.
                  </p>
                </div>
                {confirmResetTemplates ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">초기화할까요?</span>
                    <button
                      type="button"
                      onClick={handleResetTemplates}
                      className="px-2 py-0.5 text-[10px] rounded bg-amber-600 text-white font-semibold shadow-2xs"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetTemplates(false)}
                      className="px-2 py-0.5 text-[10px] rounded border border-[var(--line)] text-[var(--ink-soft)]"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetTemplates(true)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>기본 목록 복원</span>
                  </button>
                )}
              </div>

              {/* Add New Template Form */}
              <form onSubmit={handleAddTemplate} className="p-3 bg-[var(--surface-soft)] border border-[var(--line)] rounded-2xl space-y-2.5">
                <p className="text-[11px] font-bold text-[var(--ink)] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>새 반복 템플릿 등록</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="일정명 (예: 청년회 분반)"
                    value={newTmplTitle}
                    onChange={(e) => setNewTmplTitle(e.target.value)}
                    className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]"
                  />
                  <select
                    value={newTmplCat}
                    onChange={(e) => setNewTmplCat(e.target.value as EventCategory)}
                    className="px-2 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={newTmplTime}
                    onChange={(e) => setNewTmplTime(e.target.value)}
                    className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]"
                  />
                  <input
                    type="text"
                    placeholder="주기 (예: 매주 주일, 수요일)"
                    value={newTmplFreq}
                    onChange={(e) => setNewTmplFreq(e.target.value)}
                    className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-full bg-[var(--primary)] text-white text-xs font-semibold shadow-2xs hover:opacity-90"
                  >
                    + 드롭다운 목록에 추가
                  </button>
                </div>
              </form>

              {/* Current Templates List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {templates.map((tmpl) => {
                  const cat = CATEGORY_MAP[tmpl.category] || {
                    color: '#6B7280',
                    label: '기타',
                    bgColor: '#F3F4F6',
                    textColor: '#1F2937',
                  };
                  return (
                    <div
                      key={tmpl.id}
                      className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--ink)] truncate">
                            {tmpl.title}
                          </p>
                          <p className="text-[10px] text-[var(--ink-faint)]">
                            {cat.label} {tmpl.time ? `· ${tmpl.time}` : ''} {tmpl.frequencyLabel ? `· ${tmpl.frequencyLabel}` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1 rounded text-[var(--ink-faint)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="템플릿 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Data Backup */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--ink)] border-b border-[var(--line-soft)] pb-1.5 flex items-center justify-between">
                  <span>일정 데이터 백업 및 복원</span>
                  <span className="font-normal text-[var(--ink-faint)]">
                    현재 {events.length}건 저장됨
                  </span>
                </h4>

                <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
                  기기를 변경하거나 브라우저 캐시를 삭제할 때를 대비하여 일정 데이터를 파일로 안전하게 백업하세요.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--ink-faint)]" />
                    <span>JSON 백업 다운로드</span>
                  </button>

                  <label className="py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                    <Upload className="w-3.5 h-3.5 text-[var(--ink-faint)]" />
                    <span>백업 파일 복원</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Reset to Seed Data */}
              <div className="pt-2 border-t border-[var(--line-soft)]">
                {confirmResetSeed ? (
                  <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      10월 기본 일정으로 초기화할까요?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmResetSeed(false)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onResetSeed();
                          setConfirmResetSeed(false);
                          setStatusMsg('초기 일정 데이터로 복원되었습니다.');
                          setTimeout(() => setStatusMsg(null), 2500);
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-2xs"
                      >
                        초기화 실행
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetSeed(true)}
                    className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>동해교회 10월 기본 일정으로 초기화</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
