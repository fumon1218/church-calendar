// 오프라인 성경 데이터 로더
// 1) 기본 내장 파일: public/bible/<version>/<bookid>.json (krv, niv, chokmah)
// 2) 사용자가 앱에서 직접 업로드한 파일: 브라우저 IndexedDB에 책별로 저장해두고 그대로 불러옵니다.
//    (외부 API나 GitHub 재배포 없이, 그 자리에서 바로 추가/사용 가능합니다)

export type BibleVersion = string;
export type CommentaryVersion = string;

export interface BookData {
  chapter: Record<string, { verse: Record<string, { text: string }> }>;
}

const cache: Record<string, BookData> = {};

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
}

/* ================= IndexedDB (사용자가 업로드한 파일 저장소) ================= */
const DB_NAME = 'church-calendar-bible-db';
const DB_VERSION = 1;
const STORE = 'books';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('이 브라우저는 IndexedDB를 지원하지 않습니다.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key: string): Promise<BookData | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbSet(key: string, value: BookData): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

/* ================= 등록된 사용자 업로드 버전 목록 (가벼운 메타데이터만 localStorage에) ================= */
export interface CustomVersionMeta {
  code: string;
  label: string;
  type: 'translation' | 'commentary';
  addedAt: number;
}

const META_KEY = 'church-calendar-custom-bible-versions-v1';

export function listCustomVersions(): CustomVersionMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomVersionMeta(meta: CustomVersionMeta) {
  const list = listCustomVersions().filter((m) => m.code !== meta.code);
  list.push(meta);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    // ignore (저장 공간 부족 등)
  }
}

export function removeCustomVersion(code: string) {
  const list = listCustomVersions().filter((m) => m.code !== code);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  Object.keys(cache).forEach((k) => {
    if (k.startsWith(`${code}-`)) delete cache[k];
  });
}

/**
 * {"book": {"1": {...}, "2": {...}, ...}} 형태의 파일을 통째로 받아서
 * 책별로 쪼개 IndexedDB에 저장하고, 버전 목록에 등록합니다.
 */
export async function importBibleFile(
  file: File,
  code: string,
  label: string,
  type: 'translation' | 'commentary',
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const books: Record<string, BookData> = parsed.book;
  if (!books) throw new Error('올바른 성경 JSON 형식이 아닙니다. ("book" 키를 찾을 수 없습니다)');

  const ids = Object.keys(books);
  let done = 0;
  for (const id of ids) {
    await idbSet(`${code}_${id}`, books[id]);
    done++;
    onProgress?.(done, ids.length);
  }
  saveCustomVersionMeta({ code, label, type, addedAt: Date.now() });
  return ids.length;
}

/* ================= 책 데이터 불러오기 (사용자 업로드 우선, 없으면 기본 내장 파일) ================= */
export async function loadBook(version: BibleVersion, bookId: number): Promise<BookData> {
  const key = `${version}-${bookId}`;
  if (cache[key]) return cache[key];

  try {
    const stored = await idbGet(`${version}_${bookId}`);
    if (stored) {
      cache[key] = stored;
      return stored;
    }
  } catch {
    // IndexedDB를 못 쓰는 환경이면 조용히 넘어가고 기본 파일을 시도합니다.
  }

  const base = (import.meta as any).env?.BASE_URL || '/';
  const url = `${base}bible/${version}/${bookId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${version} ${bookId}권을 불러오지 못했습니다.`);
  const data: BookData = await res.json();
  cache[key] = data;
  return data;
}

export function getChapterNumbers(book: BookData): number[] {
  return Object.keys(book.chapter)
    .map(Number)
    .sort((a, b) => a - b);
}

export interface VerseItem {
  verse: number;
  text: string;
}

export function getChapterVerses(book: BookData, chapter: number): VerseItem[] {
  const ch = book.chapter[String(chapter)];
  if (!ch) return [];
  return Object.keys(ch.verse)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => ({ verse: v, text: stripHtml(ch.verse[String(v)].text) }));
}
