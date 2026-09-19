// 대한민국 공휴일 정보 - Nager.Date API (무료, API 키 불필요, 브라우저에서 직접 호출 가능)
// 문서: https://date.nager.at/Api

export interface HolidayMap {
  [date: string]: string; // '2026-10-03' -> '개천절'
}

async function fetchYear(year: number): Promise<HolidayMap> {
  const cacheKey = `holidays-KR-${year}-v1`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore cache read errors
  }

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
    if (!res.ok) throw new Error('holiday fetch failed');
    const json: Array<{ date: string; localName: string; name: string }> = await res.json();
    const map: HolidayMap = {};
    json.forEach((h) => {
      map[h.date] = h.localName || h.name;
    });
    try {
      localStorage.setItem(cacheKey, JSON.stringify(map));
    } catch {
      // ignore cache write errors (e.g. storage full)
    }
    return map;
  } catch {
    return {};
  }
}

// 달력에 이전/다음 달의 며칠이 걸쳐 보이므로, 연도 경계(12월/1월)를 위해 전후 연도도 함께 가져옵니다.
export async function fetchHolidaysAround(year: number): Promise<HolidayMap> {
  const [prev, curr, next] = await Promise.all([
    fetchYear(year - 1),
    fetchYear(year),
    fetchYear(year + 1),
  ]);
  return { ...prev, ...curr, ...next };
}
