// 한글 성경 본문 참조 자동 인식
// "요한복음 3:16", "롬8:1~11", "창세기 1장 1절" 같은 표현을 찾아서
// bolls.life 책 ID(1=창세기 ... 66=요한계시록, 표준 개신교 66권 순서)로 매핑합니다.
// 주의: bolls.life의 자체 Reference Tagging Tool은 영문 책이름 전용이라
// 한글 설교문에는 맞지 않아서, 이 프로젝트에 맞게 직접 만들었습니다.

export interface BibleRefMatch {
  raw: string;
  start: number;
  end: number;
  bookId: number;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export const BOOKS: { id: number; full: string; abbr: string[] }[] = [
  { id: 1, full: '창세기', abbr: ['창'] },
  { id: 2, full: '출애굽기', abbr: ['출'] },
  { id: 3, full: '레위기', abbr: ['레'] },
  { id: 4, full: '민수기', abbr: ['민'] },
  { id: 5, full: '신명기', abbr: ['신'] },
  { id: 6, full: '여호수아', abbr: ['수'] },
  { id: 7, full: '사사기', abbr: ['삿'] },
  { id: 8, full: '룻기', abbr: ['룻'] },
  { id: 9, full: '사무엘상', abbr: ['삼상'] },
  { id: 10, full: '사무엘하', abbr: ['삼하'] },
  { id: 11, full: '열왕기상', abbr: ['왕상'] },
  { id: 12, full: '열왕기하', abbr: ['왕하'] },
  { id: 13, full: '역대상', abbr: ['대상'] },
  { id: 14, full: '역대하', abbr: ['대하'] },
  { id: 15, full: '에스라', abbr: ['스'] },
  { id: 16, full: '느헤미야', abbr: ['느'] },
  { id: 17, full: '에스더', abbr: ['에'] },
  { id: 18, full: '욥기', abbr: ['욥'] },
  { id: 19, full: '시편', abbr: ['시'] },
  { id: 20, full: '잠언', abbr: ['잠'] },
  { id: 21, full: '전도서', abbr: ['전'] },
  { id: 22, full: '아가', abbr: [] },
  { id: 23, full: '이사야', abbr: ['사'] },
  { id: 24, full: '예레미야', abbr: ['렘'] },
  { id: 25, full: '예레미야애가', abbr: ['애'] },
  { id: 26, full: '에스겔', abbr: ['겔'] },
  { id: 27, full: '다니엘', abbr: ['단'] },
  { id: 28, full: '호세아', abbr: ['호'] },
  { id: 29, full: '요엘', abbr: ['욜'] },
  { id: 30, full: '아모스', abbr: ['암'] },
  { id: 31, full: '오바댜', abbr: ['옵'] },
  { id: 32, full: '요나', abbr: ['욘'] },
  { id: 33, full: '미가', abbr: ['미'] },
  { id: 34, full: '나훔', abbr: ['나'] },
  { id: 35, full: '하박국', abbr: ['합'] },
  { id: 36, full: '스바냐', abbr: ['습'] },
  { id: 37, full: '학개', abbr: ['학'] },
  { id: 38, full: '스가랴', abbr: ['슥'] },
  { id: 39, full: '말라기', abbr: ['말'] },
  { id: 40, full: '마태복음', abbr: ['마태', '마'] },
  { id: 41, full: '마가복음', abbr: ['마가', '막'] },
  { id: 42, full: '누가복음', abbr: ['누가', '눅'] },
  { id: 43, full: '요한복음', abbr: ['요한', '요'] },
  { id: 44, full: '사도행전', abbr: ['행'] },
  { id: 45, full: '로마서', abbr: ['롬'] },
  { id: 46, full: '고린도전서', abbr: ['고전'] },
  { id: 47, full: '고린도후서', abbr: ['고후'] },
  { id: 48, full: '갈라디아서', abbr: ['갈'] },
  { id: 49, full: '에베소서', abbr: ['엡'] },
  { id: 50, full: '빌립보서', abbr: ['빌'] },
  { id: 51, full: '골로새서', abbr: ['골'] },
  { id: 52, full: '데살로니가전서', abbr: ['살전'] },
  { id: 53, full: '데살로니가후서', abbr: ['살후'] },
  { id: 54, full: '디모데전서', abbr: ['딤전'] },
  { id: 55, full: '디모데후서', abbr: ['딤후'] },
  { id: 56, full: '디도서', abbr: ['딛'] },
  { id: 57, full: '빌레몬서', abbr: ['몬'] },
  { id: 58, full: '히브리서', abbr: ['히'] },
  { id: 59, full: '야고보서', abbr: ['약'] },
  { id: 60, full: '베드로전서', abbr: ['벧전'] },
  { id: 61, full: '베드로후서', abbr: ['벧후'] },
  { id: 62, full: '요한일서', abbr: ['요일'] },
  { id: 63, full: '요한이서', abbr: ['요이'] },
  { id: 64, full: '요한삼서', abbr: ['요삼'] },
  { id: 65, full: '유다서', abbr: ['유'] },
  { id: 66, full: '요한계시록', abbr: ['계시록', '계'] },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let cachedRegex: RegExp | null = null;
let cachedNameToId: Record<string, number> | null = null;

function getRegexAndMap(): { regex: RegExp; nameToId: Record<string, number> } {
  if (cachedRegex && cachedNameToId) return { regex: cachedRegex, nameToId: cachedNameToId };

  const nameToId: Record<string, number> = {};
  const names: string[] = [];
  BOOKS.forEach((b) => {
    nameToId[b.full] = b.id;
    names.push(b.full);
    b.abbr.forEach((a) => {
      nameToId[a] = b.id;
      names.push(a);
    });
  });
  // 긴 이름부터 매칭해야 "고린도전서"가 "고"로 잘못 잘리지 않습니다.
  names.sort((a, b) => b.length - a.length);
  const namePattern = names.map(escapeRegExp).join('|');

  // 예: "요한복음 3:16", "롬8:1-11", "창세기 1장 1절", "고전 13장"
  const regex = new RegExp(
    `(${namePattern})\\s*(\\d{1,3})\\s*(?:[:장]\\s*(\\d{1,3})?\\s*(?:[-~]\\s*(\\d{1,3}))?\\s*절?)?`,
    'g'
  );
  cachedRegex = regex;
  cachedNameToId = nameToId;
  return { regex, nameToId };
}

export function findBibleRefs(text: string): BibleRefMatch[] {
  if (!text) return [];
  const { regex, nameToId } = getRegexAndMap();
  regex.lastIndex = 0;

  const results: BibleRefMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const bookName = m[1];
    const bookId = nameToId[bookName];
    const chapter = parseInt(m[2], 10);
    if (!bookId || !chapter) continue;

    results.push({
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
      bookId,
      bookName,
      chapter,
      verseStart: m[3] ? parseInt(m[3], 10) : undefined,
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
    });
  }
  return results;
}
