import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Loader2,
  Upload,
  Trash2,
  Settings2,
} from 'lucide-react';
import { BOOKS } from '../utils/bibleRefs';
import {
  BookData,
  CustomVersionMeta,
  loadBook,
  getChapterNumbers,
  getChapterVerses,
  listCustomVersions,
  importBibleFile,
  removeCustomVersion,
} from '../utils/offlineBible';

interface BibleReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUILT_IN_TRANSLATIONS = [
  { code: 'krv', label: '개역한글' },
  { code: 'niv', label: 'NIV (영어)' },
];
const BUILT_IN_COMMENTARIES = [{ code: 'chokmah', label: 'Chokmah 주석' }];

export const BibleReaderModal: React.FC<BibleReaderModalProps> = ({ isOpen, onClose }) => {
  const [customVersions, setCustomVersions] = useState<CustomVersionMeta[]>([]);
  const refreshCustomVersions = useCallback(() => setCustomVersions(listCustomVersions()), []);
  useEffect(() => {
    if (isOpen) refreshCustomVersions();
  }, [isOpen, refreshCustomVersions]);

  const translationOptions = [
    ...BUILT_IN_TRANSLATIONS,
    ...customVersions.filter((v) => v.type === 'translation').map((v) => ({ code: v.code, label: v.label })),
  ];
  const commentaryOptions = [
    ...BUILT_IN_COMMENTARIES,
    ...customVersions.filter((v) => v.type === 'commentary').map((v) => ({ code: v.code, label: v.label })),
  ];

  const [version, setVersion] = useState('krv');
  const [bookId, setBookId] = useState(1);
  const [chapter, setChapter] = useState(1);
  const [book, setBook] = useState<BookData | null>(null);
  const [chapterCount, setChapterCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCommentary, setShowCommentary] = useState(false);
  const [commentaryCode, setCommentaryCode] = useState('chokmah');
  const [commentaryBook, setCommentaryBook] = useState<BookData | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadBook(version, bookId)
      .then((data) => {
        if (cancelled) return;
        setBook(data);
        const chapters = getChapterNumbers(data);
        setChapterCount(chapters.length);
        if (chapter === -1) {
          setChapter(chapters[chapters.length - 1] || 1);
        } else if (!chapters.includes(chapter)) {
          setChapter(1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || '불러오기 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, version, bookId]);

  useEffect(() => {
    if (!isOpen || !showCommentary) return;
    let cancelled = false;
    setCommentaryLoading(true);
    loadBook(commentaryCode, bookId)
      .then((data) => {
        if (!cancelled) setCommentaryBook(data);
      })
      .catch(() => {
        if (!cancelled) setCommentaryBook(null);
      })
      .finally(() => {
        if (!cancelled) setCommentaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, showCommentary, commentaryCode, bookId]);

  const goChapter = useCallback(
    (dir: 1 | -1) => {
      const next = chapter + dir;
      if (next >= 1 && next <= chapterCount) {
        setChapter(next);
        return;
      }
      const nextBookId = bookId + dir;
      if (nextBookId >= 1 && nextBookId <= 66) {
        setBookId(nextBookId);
        setChapter(dir === 1 ? 1 : -1);
      }
    },
    [chapter, chapterCount, bookId]
  );

  if (!isOpen) return null;

  const verses = book ? getChapterVerses(book, chapter) : [];
  const commentaryVerses = commentaryBook ? getChapterVerses(commentaryBook, chapter) : [];
  const commentaryMap: Record<number, string> = {};
  commentaryVerses.forEach((c) => {
    if (c.text.trim()) commentaryMap[c.verse] = c.text;
  });

  const currentBookName = BOOKS.find((b) => b.id === bookId)?.full || `책 ${bookId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-serif font-bold text-[var(--ink)]">성경 읽기 (오프라인)</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowManage((v) => !v)}
              className={`p-1.5 rounded-full transition-colors ${
                showManage
                  ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                  : 'text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)]'
              }`}
              title="성경/주석 파일 추가·관리"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showManage && (
          <ImportPanel
            customVersions={customVersions}
            onChanged={() => {
              refreshCustomVersions();
            }}
          />
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 sm:px-5 pt-3 pb-2 border-b border-[var(--line-soft)]">
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--surface-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
          >
            {translationOptions.map((v) => (
              <option key={v.code} value={v.code}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={bookId}
            onChange={(e) => {
              setBookId(Number(e.target.value));
              setChapter(1);
            }}
            className="px-2 py-1.5 text-xs bg-[var(--surface-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none max-w-[110px]"
          >
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full}
              </option>
            ))}
          </select>

          <select
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
            className="px-2 py-1.5 text-xs bg-[var(--surface-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
          >
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                {c}장
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => goChapter(-1)}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]"
              title="이전 장"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goChapter(1)}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]"
              title="다음 장"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCommentary((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                showCommentary
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400'
                  : 'border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
              title="절별 주석 함께 보기"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">주석</span>
            </button>
            {showCommentary && commentaryOptions.length > 1 && (
              <select
                value={commentaryCode}
                onChange={(e) => setCommentaryCode(e.target.value)}
                className="px-1.5 py-1.5 text-[11px] bg-[var(--surface-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
              >
                {commentaryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <h4 className="text-sm font-serif font-bold text-[var(--ink)] mb-3">
            {currentBookName} {chapter}장
          </h4>

          {loading && (
            <div className="flex items-center justify-center py-12 text-[var(--ink-faint)]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {error && <p className="text-sm text-[var(--red)]">{error}</p>}

          {!loading && !error && (
            <div className="space-y-2.5">
              {verses.map((v) => (
                <div key={v.verse}>
                  <p className="text-sm text-[var(--ink)] leading-relaxed">
                    <span className="text-[10px] font-bold text-[var(--primary)] align-super mr-1">{v.verse}</span>
                    {v.text}
                  </p>
                  {showCommentary && (
                    <div className="mt-1 mb-2 ml-1 p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-[var(--ink-soft)] leading-relaxed whitespace-pre-line">
                      {commentaryLoading ? (
                        <span className="text-[var(--ink-faint)]">주석 불러오는 중...</span>
                      ) : (
                        commentaryMap[v.verse] || (
                          <span className="text-[var(--ink-faint)] italic">이 절에는 등록된 주석이 없습니다.</span>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
              {verses.length === 0 && (
                <p className="text-sm text-[var(--ink-faint)] text-center py-8">본문을 찾을 수 없습니다.</p>
              )}
            </div>
          )}
        </div>

        <p className="text-[10px] text-[var(--ink-faint)] px-4 sm:px-6 pb-3">
          기본 제공(개역한글/NIV/주석) 및 직접 추가한 파일 모두 외부 인터넷 연결 없이 동작합니다.
        </p>
      </div>
    </div>
  );
};

/* ================= 파일 추가/관리 패널 ================= */
interface ImportPanelProps {
  customVersions: CustomVersionMeta[];
  onChanged: () => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ customVersions, onChanged }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'translation' | 'commentary'>('translation');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<'error' | 'info' | 'success'>('info');
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsgKind('error');
      setMsg('⚠️ 먼저 위 "파일 선택" 버튼을 눌러서 JSON 파일을 골라주세요.');
      return;
    }
    const codeTrim = code.trim().toLowerCase();
    if (!codeTrim) {
      setMsgKind('error');
      setMsg('⚠️ 짧은 코드(영문/숫자, 예: esv)를 입력해주세요.');
      return;
    }
    setBusy(true);
    setMsgKind('info');
    setMsg(
      file.size > 5 * 1024 * 1024
        ? '처리를 시작합니다. 파일이 커서 몇 초간 화면이 멈춘 것처럼 보일 수 있어요 — 잠시만 기다려주세요...'
        : '처리 중입니다...'
    );
    setProgress({ done: 0, total: 66 });
    // 브라우저가 위 "처리 중" 화면을 먼저 그릴 수 있게 한 박자 쉬어줍니다.
    await new Promise((r) => setTimeout(r, 50));
    try {
      const count = await importBibleFile(file, codeTrim, label.trim() || codeTrim.toUpperCase(), type, (done, total) =>
        setProgress({ done, total })
      );
      setMsgKind('success');
      setMsg(`✅ "${label || codeTrim}" ${count}권을 추가했습니다. 이제 위 목록에서 바로 선택할 수 있어요.`);
      setCode('');
      setLabel('');
      setFileInfo(null);
      if (fileRef.current) fileRef.current.value = '';
      onChanged();
    } catch (e: any) {
      console.error('성경 파일 가져오기 실패:', e);
      setMsgKind('error');
      setMsg(`❌ 추가에 실패했습니다: ${e?.message || '알 수 없는 오류'}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="px-4 sm:px-5 py-3 bg-amber-500/5 border-b border-[var(--line-soft)] space-y-3">
      <div>
        <p className="text-xs font-bold text-[var(--ink)] mb-1">＋ 성경/주석 파일 추가</p>
        <p className="text-[10px] text-[var(--ink-faint)] mb-2">
          {'{"book": {...}}'} 형태의 JSON 파일이면 됩니다. 브라우저에 저장되며, 이 브라우저에서 계속 사용할 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="코드 (예: esv)"
            className="w-24 px-2 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="표시 이름 (예: ESV 영어성경)"
            className="flex-1 min-w-[140px] px-2 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'translation' | 'commentary')}
            className="px-2 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-none"
          >
            <option value="translation">번역본</option>
            <option value="commentary">주석</option>
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileInfo(f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)` : null);
              setMsg(null);
            }}
            className="text-[11px] max-w-[180px]"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 disabled:opacity-50 flex-shrink-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{busy ? '처리 중...' : '가져오기'}</span>
          </button>
        </div>

        {fileInfo && !msg && (
          <p className="text-[10px] text-[var(--ink-soft)] mt-1">📄 선택된 파일: {fileInfo}</p>
        )}
        {progress && (
          <p className="text-[10px] text-[var(--ink-faint)] mt-1">
            책 나누는 중... {progress.done}/{progress.total}권
          </p>
        )}
        {msg && (
          <p
            className={`text-[11px] font-semibold mt-1.5 p-2 rounded-lg border ${
              msgKind === 'error'
                ? 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30'
                : msgKind === 'success'
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-[var(--ink)] bg-[var(--surface)] border-[var(--line)]'
            }`}
          >
            {msg}
          </p>
        )}
      </div>

      {customVersions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[var(--ink-soft)] mb-1">추가된 파일</p>
          <div className="flex flex-wrap gap-1.5">
            {customVersions.map((v) => (
              <span
                key={v.code}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-soft)]"
              >
                {v.label} <span className="text-[var(--ink-faint)]">({v.type === 'translation' ? '번역본' : '주석'})</span>
                <button
                  onClick={() => {
                    removeCustomVersion(v.code);
                    onChanged();
                  }}
                  className="text-[var(--ink-faint)] hover:text-red-600"
                  title="목록에서 제거"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
