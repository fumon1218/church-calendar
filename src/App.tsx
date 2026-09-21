/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { AgendaView } from './components/AgendaView';
import { DayDetailPanel } from './components/DayDetailPanel';
import { AIPhotoModal } from './components/AIPhotoModal';
import { AITextModal } from './components/AITextModal';
import { EventFormModal } from './components/EventFormModal';
import { PrintViewModal } from './components/PrintViewModal';
import { SettingsModal } from './components/SettingsModal';
import { PraiseTableModal } from './components/PraiseTableModal';
import { AISermonModal } from './components/AISermonModal';
import { BibleSearchModal } from './components/BibleSearchModal';
import { BibleReaderModal } from './components/BibleReaderModal';
import { AccountModal } from './components/AccountModal';
import { initSync, getAuth, watchUserDoc, saveUserDoc, SYNC_ENABLED } from './utils/accountSync';

import { ChurchEvent, EventCategory, ViewMode, ChurchConfig, RecurringTemplate } from './types';
import { INITIAL_EVENTS } from './data/seedEvents';
import { generateICS, downloadFile, getTodayStr } from './utils/calendar';
import { fetchHolidaysAround, HolidayMap } from './utils/holidays';
import { fetchWeather, WeatherMap } from './utils/weather';
import { TodaysVerseBanner } from './components/TodaysVerseBanner';
import { CheckCircle2, Sparkles, CalendarDays } from 'lucide-react';

const STORAGE_EVENTS_KEY = 'church-calendar-events-v1';
const STORAGE_CONFIG_KEY = 'church-calendar-config-v1';
const STORAGE_THEME_KEY = 'church-calendar-theme-v1';
const STORAGE_LAST_LOCAL_UPDATE_KEY = 'church-calendar-last-local-update-v1';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Church Configuration
  const [churchConfig, setChurchConfig] = useState<ChurchConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      churchName: '동해교회',
      subTitle: '부서 일정 달력',
      motto: '말씀과 기도로 거룩하여지는 공동체',
    };
  });

  const handleUpdateChurchConfig = (cfg: ChurchConfig) => {
    setChurchConfig(cfg);
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(cfg));
  };

  // Events Data
  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EVENTS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((ev: ChurchEvent) => {
              // Delete 새벽 기도회, 금요 기도회
              const title = ev.title || '';
              if (title.includes('새벽') && title.includes('기도')) return false;
              if (title.includes('금요') && title.includes('기도')) return false;
              if (title === '새벽기도회' || title === '금요기도회') return false;
              return true;
            })
            .map((ev: ChurchEvent) => {
              let updated = { ...ev };

              // Remove preset time so user can enter time freely
              delete updated.time;

              // Remove '대예배' from memo or title
              if (updated.memo === '대예배') {
                delete updated.memo;
              } else if (updated.memo && updated.memo.includes('대예배')) {
                updated.memo = updated.memo.replace(/대예배/g, '').trim();
                if (!updated.memo) delete updated.memo;
              }
              if (updated.title && updated.title.includes('대예배')) {
                updated.title = updated.title.replace(/대예배/g, '').trim();
              }

              // Sunday praise practice: update title to 주일 찬양 연습
              if (
                updated.title === '찬양대' ||
                updated.title.includes('찬양 연습') ||
                updated.title === '주일 찬양 연습'
              ) {
                if (updated.title === '찬양대') {
                  updated.title = '주일 찬양 연습';
                }
              }

              return updated;
            });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_EVENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [events]);

  /* ================= 이메일 계정 기반 기기 간 동기화 ================= */
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountUidRef = React.useRef<string | null>(null);
  const applyingRemoteRef = React.useRef(false);
  // events/churchConfig의 "최신 값"을 항상 담아두는 참조입니다.
  // (아래 onSnapshot 콜백은 로그인 시 한 번만 만들어지기 때문에, 그냥 state를 직접 참조하면
  //  그 시점의 오래된 값을 계속 쓰게 되는 문제가 있어 ref로 최신 값을 따로 추적합니다)
  const latestEventsRef = React.useRef(events);
  const latestChurchConfigRef = React.useRef(churchConfig);
  useEffect(() => {
    latestEventsRef.current = events;
  }, [events]);
  useEffect(() => {
    latestChurchConfigRef.current = churchConfig;
  }, [churchConfig]);

  // 이 기기에서 마지막으로 데이터를 바꾼 시각. 이 값보다 "오래된"(더 이전 시각의) 클라우드
  // 데이터가 오면, 그건 옛날 것이므로 절대 적용하지 않고 무시합니다.
  // (Firestore 연결이 불안정할 때, 예전 캐시 데이터가 방금 만든 내용을 덮어쓰는 사고를 막습니다)
  // 새로고침해도 이 "기억"이 사라지지 않도록 localStorage에도 같이 저장합니다.
  const lastLocalUpdateAtRef = React.useRef<number>(
    Number(localStorage.getItem(STORAGE_LAST_LOCAL_UPDATE_KEY)) || 0
  );
  const markLocalUpdateNow = () => {
    const now = Date.now();
    lastLocalUpdateAtRef.current = now;
    try {
      localStorage.setItem(STORAGE_LAST_LOCAL_UPDATE_KEY, String(now));
    } catch {
      // ignore
    }
    return now;
  };

  useEffect(() => {
    if (!SYNC_ENABLED) return;
    initSync();
    const auth = getAuth();
    if (!auth) return;
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((user: any) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (user) {
        accountUidRef.current = user.uid;
        setAccountEmail(user.email);
        unsubDoc = watchUserDoc(user.uid, (data) => {
          if (data) {
            const remoteUpdatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0;
            if (remoteUpdatedAt < lastLocalUpdateAtRef.current) {
              // 이 기기에서 이미 더 최신 데이터를 만든 상태 → 오래된 클라우드 데이터는 무시하고,
              // 대신 이 기기의 최신 데이터를 다시 클라우드로 밀어 올려서 클라우드도 최신으로 맞춰둡니다.
              saveUserDoc(user.uid, {
                events: latestEventsRef.current,
                churchConfig: latestChurchConfigRef.current,
              }).catch((e) => console.error('클라우드 재동기화 실패:', e));
              return;
            }
            applyingRemoteRef.current = true;
            if (Array.isArray(data.events)) setEvents(data.events);
            if (data.churchConfig) setChurchConfig(data.churchConfig);
            lastLocalUpdateAtRef.current = remoteUpdatedAt;
            try {
              localStorage.setItem(STORAGE_LAST_LOCAL_UPDATE_KEY, String(remoteUpdatedAt));
            } catch {
              // ignore
            }
            setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 0);
          } else {
            // 이 계정으로는 처음 로그인 → "지금 이 순간" 갖고 있는 최신 로컬 데이터를
            // 클라우드의 시작값으로 저장합니다. (오래된 값이 아니라 항상 최신 값을 씁니다)
            markLocalUpdateNow();
            saveUserDoc(user.uid, {
              events: latestEventsRef.current,
              churchConfig: latestChurchConfigRef.current,
            }).catch((e) => console.error('클라우드 초기 저장 실패:', e));
          }
        });
      } else {
        accountUidRef.current = null;
        setAccountEmail(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 상태에서 일정/설정이 바뀌면 클라우드에도 저장 (다른 기기와 동기화)
  useEffect(() => {
    if (!accountUidRef.current || applyingRemoteRef.current) return;
    markLocalUpdateNow();
    saveUserDoc(accountUidRef.current, { events, churchConfig }).catch((e) =>
      console.error('클라우드 자동 저장 실패:', e)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, churchConfig, accountEmail]);

  // 이 기기(지금 로그인된 브라우저)가 갖고 있는 데이터를 클라우드에 강제로 덮어씁니다.
  // (다른 기기/예전 로그인 때문에 클라우드에 이상한 데이터가 들어간 경우, 확실한 쪽 기기에서 눌러 바로잡는 용도)
  const handleForcePushToCloud = () => {
    if (!accountUidRef.current) return;
    markLocalUpdateNow();
    saveUserDoc(accountUidRef.current, {
      events: latestEventsRef.current,
      churchConfig: latestChurchConfigRef.current,
    })
      .then(() => {
        showToast('이 기기의 데이터를 클라우드에 저장했습니다.');
      })
      .catch((e: any) => {
        console.error('클라우드 덮어쓰기 실패:', e);
        showToast('클라우드 저장에 실패했습니다. 콘솔을 확인해주세요.');
      });
  };

  // Calendar Navigation State
  // 오늘 날짜로 시작합니다.
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 공휴일 (연도가 바뀔 때마다 자동으로 다시 불러옵니다)
  const [holidays, setHolidays] = useState<HolidayMap>({});
  useEffect(() => {
    let cancelled = false;
    fetchHolidaysAround(year).then((map) => {
      if (!cancelled) setHolidays(map);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  // 날씨 (교회 위치가 설정에 저장돼 있으면 그 위치, 없으면 서울 기준)
  const [weather, setWeather] = useState<WeatherMap>({});
  useEffect(() => {
    const lat = churchConfig.lat ?? 37.5665;
    const lng = churchConfig.lng ?? 126.978;
    let cancelled = false;
    fetchWeather(lat, lng)
      .then((map) => {
        if (!cancelled) setWeather(map);
      })
      .catch(() => {
        if (!cancelled) setWeather({});
      });
    return () => {
      cancelled = true;
    };
  }, [churchConfig.lat, churchConfig.lng]);

  // Modals state
  const [isAIPhotoOpen, setIsAIPhotoOpen] = useState(false);
  const [isAITextOpen, setIsAITextOpen] = useState(false);
  const [isAISermonOpen, setIsAISermonOpen] = useState(false);
  const [isPraiseTableOpen, setIsPraiseTableOpen] = useState(false);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBibleSearchOpen, setIsBibleSearchOpen] = useState(false);
  const [isBibleReaderOpen, setIsBibleReaderOpen] = useState(false);

  // Event modal targets
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | undefined>(undefined);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Today handler
  const handleTodayClick = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    const todayStr = getTodayStr();

    setYear(curYear);
    setMonth(curMonth);
    setSelectedDate(todayStr);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(query);
        const matchMemo = ev.memo?.toLowerCase().includes(query) || false;
        const matchLocation = ev.location?.toLowerCase().includes(query) || false;
        const matchTime = ev.time?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchMemo && !matchLocation && !matchTime) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  // CRUD Handlers
  const handleSaveEvent = (
    data: Partial<ChurchEvent> & { title: string; category: EventCategory; date: string }
  ) => {
    if (data.id) {
      // Update existing
      setEvents((prev) =>
        prev.map((e) => (e.id === data.id ? ({ ...e, ...data } as ChurchEvent) : e))
      );
      showToast(`'${data.title}' 일정이 수정되었습니다.`);
    } else {
      // Create new
      // (data에 있는 모든 항목을 그대로 살립니다 — 설교 제목/설교자/본문/요약, 위치 좌표 등이
      //  누락되지 않도록 일부 필드만 골라 담지 않고 전체를 옮깁니다)
      const newEvent: ChurchEvent = {
        ...data,
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      } as ChurchEvent;
      setEvents((prev) => [...prev, newEvent]);
      showToast(`'${data.title}' 새 일정이 등록되었습니다.`);
    }

    // Auto switch calendar view to this event's month
    const [y, m] = data.date.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
    setSelectedDate(data.date);
  };

  const handleApplyRecurringTemplate = (date: string, tmpl: RecurringTemplate) => {
    const newEvent: ChurchEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date,
      category: tmpl.category,
      title: tmpl.title,
      time: tmpl.time || undefined,
      memo: tmpl.memo || undefined,
      location: tmpl.location || undefined,
    };
    setEvents((prev) => [...prev, newEvent]);
    setSelectedDate(date);
    showToast(`'${tmpl.title}' 일정이 등록되었습니다.`);
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (editingEvent?.id === id) {
      setEditingEvent(null);
      setIsEventFormOpen(false);
    }
    showToast(`'${target?.title || '일정'}'이 삭제되었습니다.`);
  };

  const handleBulkAddEvents = (newItems: Omit<ChurchEvent, 'id'>[]) => {
    const created = newItems.map((item, idx) => ({
      ...item,
      id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    setEvents((prev) => [...prev, ...created]);
    showToast(`${created.length}개의 일정이 AI를 통해 캘린더에 추가되었습니다.`);

    if (created.length > 0) {
      const firstDate = created[0].date;
      const [y, m] = firstDate.split('-').map(Number);
      setYear(y);
      setMonth(m - 1);
      setSelectedDate(firstDate);
    }
  };

  const handleExportICS = () => {
    const icsData = generateICS(events, churchConfig.churchName);
    downloadFile(`${churchConfig.churchName}_일정표.ics`, icsData, 'text/calendar;charset=utf-8');
    showToast('iCalendar (.ics) 파일이 다운로드되었습니다.');
  };

  const handleResetSeed = () => {
    setEvents(INITIAL_EVENTS);
    setYear(2026);
    setMonth(9);
    setSelectedDate('2026-10-18');
    showToast('동해교회 10월 초기 일정으로 복원되었습니다.');
  };

  // Open forms
  const handleOpenNewEvent = () => {
    setEditingEvent(null);
    setFormInitialDate(selectedDate || `${year}-${String(month + 1).padStart(2, '0')}-01`);
    setIsEventFormOpen(true);
  };

  const handleOpenNewEventForDate = (date: string) => {
    setEditingEvent(null);
    setFormInitialDate(date);
    setSelectedDate(date);
    setIsEventFormOpen(true);
  };

  const handleStartEdit = (event: ChurchEvent) => {
    setEditingEvent(event);
    setFormInitialDate(event.date);
    setIsEventFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] transition-colors py-5 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Application Header */}
        <Header
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onTodayClick={handleTodayClick}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          churchConfig={churchConfig}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenNewEvent={handleOpenNewEvent}
          onOpenAIPhoto={() => setIsAIPhotoOpen(true)}
          onOpenAIText={() => setIsAITextOpen(true)}
          onOpenAISermon={() => setIsAISermonOpen(true)}
          onOpenPraiseTable={() => setIsPraiseTableOpen(true)}
          onOpenBibleSearch={() => setIsBibleSearchOpen(true)}
          onOpenBibleReader={() => setIsBibleReaderOpen(true)}
          onOpenAccount={() => setIsAccountOpen(true)}
          accountEmail={accountEmail}
          onOpenPrint={() => setIsPrintOpen(true)}
          onExportICS={handleExportICS}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Category Ministry Filter Bar */}
        <CategoryFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          events={events}
        />

        <TodaysVerseBanner />

        {/* Content Views */}
        <main className="transition-all">
          {viewMode === 'month' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Calendar Grid */}
              <div className="lg:col-span-8 xl:col-span-8">
                <MonthView
                  year={year}
                  month={month}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    const [y, m] = date.split('-').map(Number);
                    if (y !== year || m - 1 !== month) {
                      setYear(y);
                      setMonth(m - 1);
                    }
                  }}
                  events={filteredEvents}
                  onOpenNewEventForDate={handleOpenNewEventForDate}
                  onApplyRecurringTemplate={handleApplyRecurringTemplate}
                  holidays={holidays}
                  weather={weather}
                />
              </div>

              {/* Day Details Side Panel */}
              <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6">
                <DayDetailPanel
                  selectedDate={selectedDate}
                  events={events}
                  onSaveEvent={handleSaveEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onOpenFullFormModal={(date, ev) => {
                    if (ev) handleStartEdit(ev);
                    else handleOpenNewEventForDate(date || selectedDate || '');
                  }}
                />
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="space-y-4">
              <WeekView
                selectedDate={selectedDate || `${year}-${String(month + 1).padStart(2, '0')}-01`}
                onSelectDate={setSelectedDate}
                events={filteredEvents}
                onOpenNewEventForDate={handleOpenNewEventForDate}
                holidays={holidays}
                weather={weather}
              />
              {selectedDate && (
                <div className="max-w-2xl mx-auto mt-4">
                  <DayDetailPanel
                    selectedDate={selectedDate}
                    events={events}
                    onSaveEvent={handleSaveEvent}
                    onDeleteEvent={handleDeleteEvent}
                  />
                </div>
              )}
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className="max-w-4xl mx-auto">
              <AgendaView
                events={filteredEvents}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  const [y, m] = date.split('-').map(Number);
                  setYear(y);
                  setMonth(m - 1);
                }}
                onEditEvent={handleStartEdit}
                onDeleteEvent={handleDeleteEvent}
                onOpenNewEventForDate={handleOpenNewEventForDate}
                holidays={holidays}
              />
            </div>
          )}
        </main>

        {/* External App Links */}
        <div className="no-print flex flex-wrap items-center justify-center gap-2 mt-8">
          <a
            href="https://fumon1218.github.io/bible-memory-app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--ink-soft)] border border-[var(--line)] transition-colors shadow-xs"
            title="암송수첩 (새 탭에서 열림)"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
            />
            <span>암송수첩</span>
          </a>
          <a
            href="https://fumon1218.github.io/global-bible-pro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--ink-soft)] border border-[var(--line)] transition-colors shadow-xs"
            title="성경 (새 탭에서 열림)"
          >
            <span className="text-sm flex-shrink-0">📖</span>
            <span>성경</span>
          </a>
        </div>

        {/* Footer */}
        <footer className="no-print mt-12 pt-6 border-t border-[var(--line)] text-center text-xs text-[var(--ink-soft)] space-y-1">
          <p className="font-serif">
            {churchConfig.churchName} · {churchConfig.subTitle}
          </p>
          <p className="text-[11px] text-[var(--ink-faint)]">
            일정 데이터는 안전하게 브라우저에 저장되며, AI 주보 인식 및 공지문 추출 기능을 지원합니다.
          </p>
        </footer>
      </div>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <AIPhotoModal
        isOpen={isAIPhotoOpen}
        onClose={() => setIsAIPhotoOpen(false)}
        baseYear={year}
        baseMonth={month}
        onAddEvents={handleBulkAddEvents}
      />

      <AITextModal
        isOpen={isAITextOpen}
        onClose={() => setIsAITextOpen(false)}
        baseYear={year}
        baseMonth={month}
        onAddEvents={handleBulkAddEvents}
      />

      <AISermonModal
        isOpen={isAISermonOpen}
        onClose={() => setIsAISermonOpen(false)}
        baseYear={year}
        baseMonth={month}
        onAddEvent={(newEvent) => {
          handleSaveEvent(newEvent);
          showToast('주일 설교 요약 및 말씀 카드가 등록되었습니다.');
        }}
      />

      <PraiseTableModal
        isOpen={isPraiseTableOpen}
        onClose={() => setIsPraiseTableOpen(false)}
        year={year}
        month={month}
        onApplyEvents={(newPraiseEvents) => {
          handleBulkAddEvents(newPraiseEvents);
          showToast(`${month + 1}월 찬양 표 일정이 달력에 등록되었습니다.`);
        }}
      />

      <EventFormModal
        isOpen={isEventFormOpen}
        onClose={() => {
          setIsEventFormOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialDate={formInitialDate}
        initialEvent={editingEvent}
      />

      <PrintViewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        events={events}
        churchConfig={churchConfig}
        year={year}
        month={month}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        churchConfig={churchConfig}
        onUpdateChurchConfig={handleUpdateChurchConfig}
        events={events}
        onImportEvents={(imported) => {
          setEvents(imported);
          showToast(`${imported.length}개의 일정이 복원되었습니다.`);
        }}
        onResetSeed={handleResetSeed}
      />

      <BibleSearchModal
        isOpen={isBibleSearchOpen}
        onClose={() => setIsBibleSearchOpen(false)}
      />

      <BibleReaderModal
        isOpen={isBibleReaderOpen}
        onClose={() => setIsBibleReaderOpen(false)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        currentEmail={accountEmail}
        onForcePush={handleForcePushToCloud}
      />
    </div>
  );
}
