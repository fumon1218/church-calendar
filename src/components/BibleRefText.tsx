import React, { useState } from 'react';
import { findBibleRefs } from '../utils/bibleRefs';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '');
}

interface BibleRefTextProps {
  text: string;
  className?: string;
}

// 텍스트 안의 "요한복음 3:16" 같은 표현을 찾아 클릭 가능한 링크로 바꿔줍니다.
// 클릭하면 bolls.life(개역한글)에서 해당 구절을 가져와 바로 아래에 보여줍니다.
export const BibleRefText: React.FC<BibleRefTextProps> = ({ text, className }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(false);

  const refs = findBibleRefs(text || '');
  if (refs.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const handleClick = async (idx: number, ref: (typeof refs)[number]) => {
    if (openIdx === idx) {
      setOpenIdx(null);
      return;
    }
    setOpenIdx(idx);
    setLoading(true);
    setVerseText('');
    try {
      const res = await fetch(`https://bolls.life/get-text/KRV/${ref.bookId}/${ref.chapter}/`);
      const data: Array<{ verse: number; text: string }> = await res.json();
      const vs = ref.verseStart || 1;
      const ve = ref.verseEnd || vs;
      const picked = ref.verseStart ? data.filter((v) => v.verse >= vs && v.verse <= ve) : data.slice(0, 3);
      setVerseText(picked.map((v) => `${v.verse}. ${stripHtml(v.text)}`).join('  '));
    } catch {
      setVerseText('구절을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  refs.forEach((ref, idx) => {
    if (ref.start > cursor) parts.push(text.slice(cursor, ref.start));
    parts.push(
      <span key={idx} className="relative inline-block">
        <button
          type="button"
          onClick={() => handleClick(idx, ref)}
          className="underline decoration-dotted decoration-[var(--primary)] text-[var(--primary)] font-semibold hover:opacity-80"
        >
          {ref.raw}
        </button>
        {openIdx === idx && (
          <span className="absolute z-30 left-0 top-full mt-1 w-64 max-w-[70vw] p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-lg text-[10px] text-[var(--ink)] leading-relaxed whitespace-normal">
            {loading ? '불러오는 중...' : verseText}
          </span>
        )}
      </span>
    );
    cursor = ref.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className={className}>{parts}</span>;
};
