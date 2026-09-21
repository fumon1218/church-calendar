import React, { useEffect, useState } from 'react';
import { RefreshCw, BookMarked } from 'lucide-react';
import { verses, Verse } from '../data/memorizedVerses';

const CACHE_KEY = 'church-calendar-todays-verse-v2';

// 캘린더 상단에 매일 다른 성경 구절을 보여줍니다.
// "암송수첩"(bible-memory-app)에 있는 것과 똑같은 264개 암송 구절 목록에서 하나를 뽑아 보여줍니다.
// 같은 날 다시 열어도 같은 구절이 뜨도록 날짜 기준으로 캐시하고, 새로고침 버튼으로 다른 구절도 볼 수 있습니다.
export const TodaysVerseBanner: React.FC = () => {
  const [verse, setVerse] = useState<Verse | null>(null);

  const loadVerse = (force = false) => {
    const today = new Date().toISOString().slice(0, 10);
    if (!force) {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.date === today && cached.verseId) {
            const found = verses.find((v) => v.id === cached.verseId);
            if (found) {
              setVerse(found);
              return;
            }
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    if (verses.length === 0) return;
    const picked = verses[Math.floor(Math.random() * verses.length)];
    setVerse(picked);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, verseId: picked.id }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadVerse();
  }, []);

  if (!verse) return null;

  return (
    <div className="no-print mb-4 p-3.5 rounded-2xl bg-[var(--primary)]/8 border border-[var(--primary)]/25 flex items-start gap-2.5">
      <BookMarked className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-serif text-[var(--ink)] leading-relaxed">
          "{verse.text}" <span className="text-[var(--ink-faint)] font-sans">— {verse.reference}</span>
        </p>
      </div>
      <button
        onClick={() => loadVerse(true)}
        className="p-1 rounded-full text-[var(--ink-faint)] hover:text-[var(--primary)] hover:bg-[var(--surface-soft)] flex-shrink-0"
        title="다른 말씀 보기"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
