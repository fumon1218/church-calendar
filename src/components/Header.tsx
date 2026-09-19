import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  Columns, 
  Sparkles, 
  FileText, 
  Printer, 
  Download, 
  Settings, 
  Sun, 
  Moon,
  Search,
  Music,
  BookOpen,
  BookMarked
} from 'lucide-react';
import { ViewMode, ChurchConfig } from '../types';
import { ChurchLogo } from './ChurchLogo';

interface HeaderProps {
  year: number;
  month: number; // 0-indexed
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onTodayClick: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  churchConfig: ChurchConfig;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewEvent: () => void;
  onOpenAIPhoto: () => void;
  onOpenAIText: () => void;
  onOpenAISermon: () => void;
  onOpenPraiseTable: () => void;
  onOpenBibleSearch: () => void;
  onOpenBibleReader: () => void;
  onOpenPrint: () => void;
  onExportICS: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  onTodayClick,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  churchConfig,
  theme,
  onToggleTheme,
  onOpenNewEvent,
  onOpenAIPhoto,
  onOpenAIText,
  onOpenAISermon,
  onOpenPraiseTable,
  onOpenBibleSearch,
  onOpenBibleReader,
  onOpenPrint,
  onExportICS,
  onOpenSettings,
}) => {
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInputValue, setYearInputValue] = useState(String(year));

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(11);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(0);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const commitYear = () => {
    const val = parseInt(yearInputValue, 10);
    if (Number.isFinite(val) && val >= 1970 && val <= 2099) {
      onYearChange(val);
    } else {
      setYearInputValue(String(year));
    }
    setIsEditingYear(false);
  };

  return (
    <header className="no-print mb-6 border-b border-[var(--line)] pb-5">
      {/* Top Banner with Church Branding, Search & Utility Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[var(--surface)] border border-[var(--line)] shadow-xs flex items-center justify-center p-1 flex-shrink-0 overflow-hidden">
            <ChurchLogo size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-soft)]">
                {churchConfig.churchName}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] border border-[var(--line-soft)]">
                {churchConfig.subTitle}
              </span>
            </div>
            <p className="text-xs text-[var(--ink-faint)] italic mt-0.5">
              "{churchConfig.motto}"
            </p>
          </div>
        </div>

        {/* Search and Secondary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="text"
              placeholder="일정, 설교자, 장소 검색..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors"
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenPrint}
            className="p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors"
            title="주보 인쇄용 출력"
            aria-label="주보 인쇄"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onExportICS}
            className="p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors"
            title="iCal (.ics) 캘린더 파일 다운로드"
            aria-label="iCal 내보내기"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors"
            title="설정 및 데이터 관리"
            aria-label="설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Row: Month & Year, View Modes, and AI / Add Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Month, Year & Date Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTodayClick}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            오늘
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--surface-soft)] transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-baseline px-2 gap-1.5 min-w-[130px] justify-center">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                {month + 1}월
              </span>
              {isEditingYear ? (
                <input
                  type="number"
                  value={yearInputValue}
                  onChange={(e) => setYearInputValue(e.target.value)}
                  onBlur={commitYear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitYear();
                    if (e.key === 'Escape') setIsEditingYear(false);
                  }}
                  autoFocus
                  className="font-serif text-base w-20 px-1.5 py-0.5 border border-[var(--primary)] rounded text-center bg-[var(--surface)] text-[var(--ink)] focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setYearInputValue(String(year));
                    setIsEditingYear(true);
                  }}
                  className="font-serif text-base text-[var(--ink-soft)] hover:text-[var(--ink)] hover:underline cursor-pointer"
                  title="클릭하여 연도 직접 변경"
                >
                  {year}년
                </button>
              )}
            </div>

            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--surface-soft)] transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher & Action Callouts */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Mode Segmented Control */}
          <div className="flex p-1 bg-[var(--surface)] border border-[var(--line)] rounded-full">
            <button
              onClick={() => onViewModeChange('month')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                viewMode === 'month'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>월간</span>
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                viewMode === 'week'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>주간</span>
            </button>
            <button
              onClick={() => onViewModeChange('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>목록</span>
            </button>
          </div>

          {/* AI Features & Praise Table */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0 flex-shrink-0">
            <button
              onClick={onOpenAISermon}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500/20 to-amber-700/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 transition-colors shadow-xs whitespace-nowrap"
              title="주일 말씀 요약 및 SNS 말씀 카드 생성"
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>AI 말씀 요약</span>
            </button>

            <button
              onClick={onOpenAIPhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[#3E7C74]/15 hover:bg-[#3E7C74]/25 text-[#25544E] dark:text-[#64A79A] border border-[#3E7C74]/30 transition-colors shadow-xs whitespace-nowrap"
              title="주보나 일정표 사진을 업로드하여 일정 자동 추출"
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>AI 주보 사진</span>
            </button>

            <button
              onClick={onOpenAIText}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[#7A5C8C]/15 hover:bg-[#7A5C8C]/25 text-[#563D65] dark:text-[#A98CC0] border border-[#7A5C8C]/30 transition-colors shadow-xs whitespace-nowrap"
              title="카카오톡 공지문 텍스트로 일정 빠른 추가"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span>AI 공지 텍스트</span>
            </button>

            <button
              onClick={onOpenPraiseTable}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#094E85]/15 hover:bg-[#094E85]/25 text-[#094E85] dark:text-[#64B5F6] border border-[#094E85]/30 transition-colors shadow-xs whitespace-nowrap"
              title="월별 찬양곡 표 (주보 양식) 확인 및 등록"
            >
              <Music className="w-3.5 h-3.5 flex-shrink-0" />
              <span>월별 찬양표</span>
            </button>

            <button
              onClick={onOpenBibleSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] border border-[var(--primary)]/30 transition-colors shadow-xs whitespace-nowrap"
              title="성경 구절 검색 (개역한글/새번역)"
            >
              <BookMarked className="w-3.5 h-3.5 flex-shrink-0" />
              <span>성경검색</span>
            </button>

            <button
              onClick={onOpenBibleReader}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors shadow-xs whitespace-nowrap"
              title="성경 읽기 (오프라인, 개역한글/NIV/주석)"
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span>성경읽기</span>
            </button>
          </div>

          {/* Manual Add Event */}
          <button
            onClick={onOpenNewEvent}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity shadow-xs ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>일정 추가</span>
          </button>
        </div>
      </div>
    </header>
  );
};
