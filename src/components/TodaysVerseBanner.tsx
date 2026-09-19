import React, { useEffect, useState } from 'react';
import { RefreshCw, BookMarked } from 'lucide-react';

const CACHE_KEY = 'church-calendar-todays-verse-v1';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '');
}

interface VerseData {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

// 캘린더 상단에 매일 다른 성경 구절을 보여줍니다. (bolls.life 무료 API, 개역한글)
// 같은 날 다시 열어도 같은 구절이 뜨도록 날짜 기준으로 캐시하고, 새로고침 버튼으로 다른 구절도 볼 수 있습니다.
export const TodaysVerseBanner: React.FC = () => {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [bookName, setBookName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadVerse = async (force = false) => {
    const today = new Date().toISOString().slice(0, 10);
    if (!force) {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.date === today) {
            setVerse(cached.verse);
            setBookName(cached.bookName);
            return;
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    setLoading(true);
    try {
      const [verseRes, booksRes] = await Promise.all([
        fetch('https://bolls.life/get-random-verse/KRV/'),
        fetch('https://bolls.life/get-books/KRV/'),
      ]);
      const verseData: VerseData = await verseRes.json();
      const books: Array<{ bookid: number; name: string }> = await booksRes.json();
      const found = books.find((b) => b.bookid === verseData.book);
      const name = found ? found.name : `책 ${verseData.book}`;

      setVerse(verseData);
      setBookName(name);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, verse: verseData, bookName: name }));
      } catch {
        // ignore
      }
    } catch {
      // 실패해도 조용히 배너를 안 보여주는 것으로 처리
    } finally {
      setLoading(false);
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
          "{stripHtml(verse.text)}"{' '}
          <span className="text-[var(--ink-faint)] font-sans">
            — {bookName} {verse.chapter}:{verse.verse}
          </span>
        </p>
      </div>
      <button
        onClick={() => loadVerse(true)}
        disabled={loading}
        className="p-1 rounded-full text-[var(--ink-faint)] hover:text-[var(--primary)] hover:bg-[var(--surface-soft)] flex-shrink-0 disabled:opacity-50"
        title="다른 말씀 보기"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
