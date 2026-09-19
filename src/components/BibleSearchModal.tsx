import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, BookMarked } from 'lucide-react';

// ===== bolls.life 무료 성경 API 연동 =====
// 문서: https://bolls.life/api/
// 주의: bolls.life는 무료·공개 API이지만, 대한성서공회(한국어 성경 저작권자)의
// 정식 라이선스를 받은 것은 아닙니다. 교회 내부용으로 사용하시고,
// 외부에 널리 공개/배포하실 계획이라면 대한성서공회에 문의해보시는 걸 권장합니다.

type BollsBook = { bookid: number; name: string; chapters: number };
type BollsResult = {
  pk: number;
  book: number;
  chapter: number;
  verse: number;
  text: string;
};

const TRANSLATIONS = [
  { code: 'KRV', label: '개역한글' },
  { code: 'RNKSV', label: '새번역' },
];

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '');
}

interface BibleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BibleSearchModal: React.FC<BibleSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [translation, setTranslation] = useState('KRV');
  const [results, setResults] = useState<BollsResult[]>([]);
  const [bookMap, setBookMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`https://bolls.life/get-books/${translation}/`)
      .then((res) => res.json())
      .then((books: BollsBook[]) => {
        if (cancelled) return;
        const map: Record<number, string> = {};
        books.forEach((b) => {
          map[b.bookid] = b.name;
        });
        setBookMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [translation, isOpen]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    async function tryFetch(params: string) {
      const url = `https://bolls.life/v2/find/${translation}?search=${encodeURIComponent(q)}&${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          // ignore
        }
        throw new Error(`상태 코드 ${res.status}${bodyText ? ` — 서버 응답: ${bodyText.slice(0, 200)}` : ''}`);
      }
      return res.json();
    }

    try {
      // 1차: 정확 일치 검색
      const data = await tryFetch('match_case=false&match_whole=true&limit=30&page=1');
      setResults(data.results || []);
    } catch (e1: any) {
      try {
        // 1차가 실패하면(예: 400) 기본(의미 기반) 검색으로 재시도
        const data = await tryFetch('limit=30&page=1');
        setResults(data.results || []);
      } catch (e2: any) {
        setError(`검색 중 문제가 발생했습니다: ${e2?.message || e1?.message || '알 수 없는 오류'}`);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [query, translation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 shadow-xs">
              <BookMarked className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-serif font-bold text-[var(--ink)]">성경 구절 검색</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 px-4 sm:px-5 pt-4 pb-2">
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="px-2.5 py-2 text-xs sm:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="예: 사랑, 은혜, 예레미야..."
            autoFocus
            className="flex-1 min-w-0 px-3.5 py-2 text-xs sm:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          <button
            onClick={runSearch}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            검색
          </button>
        </div>

        {error && <p className="text-sm text-[var(--red)] px-4 sm:px-5">{error}</p>}

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4 space-y-2 mt-1">
          {results.map((r) => (
            <div
              key={r.pk}
              className="p-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]"
            >
              <div className="text-xs font-semibold text-[var(--primary)] mb-1">
                {bookMap[r.book] || `책 ${r.book}`} {r.chapter}:{r.verse}
              </div>
              <div className="text-sm text-[var(--ink)] leading-relaxed">{stripHtml(r.text)}</div>
            </div>
          ))}
          {!loading && searched && results.length === 0 && !error && (
            <p className="text-sm text-[var(--ink-faint)] text-center py-6">검색 결과가 없습니다.</p>
          )}
        </div>

        <p className="text-[11px] text-[var(--ink-faint)] px-4 sm:px-5 pb-3">
          성경 본문: bolls.life 무료 API (개역한글/새번역) · 대한성서공회 정식 라이선스는 아닙니다.
        </p>
      </div>
    </div>
  );
};
