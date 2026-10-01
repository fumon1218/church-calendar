/**
 * Client-side Gemini AI integration for static hosting (GitHub Pages).
 * Enables direct in-browser Gemini API calls using user-provided API key.
 */

const GEMINI_API_KEY_STORAGE = 'church_calendar_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(GEMINI_API_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.error('Failed to read API key from localStorage', e);
  }
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
}

export function saveStoredGeminiApiKey(apiKey: string): void {
  try {
    if (apiKey && apiKey.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, apiKey.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

export interface ParsedEventDTO {
  date: string;
  category: 'worship' | 'district' | 'youth' | 'praise' | 'event' | 'family';
  title: string;
  time?: string;
  memo?: string;
}

export interface ParseResult {
  events: ParsedEventDTO[];
  summary: string;
}

const CATEGORY_DESCRIPTION = `
- 'worship': 예배·말씀 (주일예배, 주일말씀, 수요말씀, 새벽기도회, 특별집회 등)
- 'district': 구역모임 (구역예배, 조모임, 어머니회, 직장조 등)
- 'youth': 청년·학생부 (청년회, 중고등부, 이삭부, 유초등부, 교회학교 등)
- 'praise': 찬양 (찬양대, 성가대, 찬양의 밤, 찬양팀 연습 등)
- 'event': 행사·수련회 (교사모임, 봉사회, 수련회, 야외교제, 교육, 부서 회의 등)
- 'family': 경조사·공휴일 (결혼식, 장례, 심방, 공휴일, 대체공휴일 등)
`;

/**
 * Call Gemini API directly from browser or fallback to backend if available
 */
async function callGeminiDirect(
  apiKey: string,
  parts: any[],
  systemInstruction?: string
): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: parts,
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini 응답에 텍스트 데이터가 없습니다.');
      }
      return text;
    } catch (err: any) {
      lastError = err;
      // If error is about model not found, try next model
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        continue;
      }
      // For auth errors or invalid key, throw immediately
      if (err.message && (err.message.includes('API key') || err.message.includes('403') || err.message.includes('400'))) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Gemini API 호출에 실패했습니다.');
}

/**
 * Parse Photo using Gemini
 */
export async function parsePhotoSchedule(params: {
  imageBase64: string;
  mimeType: string;
  baseYear: number;
  baseMonth: number;
  apiKey?: string;
}): Promise<ParseResult> {
  const { imageBase64, mimeType, baseYear, baseMonth } = params;
  const apiKey = params.apiKey || getStoredGeminiApiKey();

  // Try server endpoint first (works in local dev with server.ts)
  if (!window.location.hostname.includes('github.io')) {
    try {
      const res = await fetch('/api/ai/parse-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          baseYear,
          baseMonth,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          return {
            events: data.events,
            summary: data.summary || `${data.events.length}개의 일정이 감지되었습니다.`,
          };
        }
      }
    } catch (e) {
      // Backend not reachable, fallback to direct client call
    }
  }

  // Client-side direct call
  if (!apiKey) {
    throw new Error('KEY_REQUIRED: Gemini API 키가 설정되지 않았습니다. API 키를 입력해주세요.');
  }

  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const currentYear = baseYear || new Date().getFullYear();
  const currentMonth = baseMonth ? String(baseMonth).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');

  const prompt = `당신은 한국 교회의 부서 일정표 및 주보(교회 소식, 행사 안내, 예배 순서) 분석 전문가입니다.
첨부된 이미지(교회 주보, 게시판 일정표, 사진, 출력물 등)에서 모든 교회 일정 항목들을 추출해주세요.

기준 연도: ${currentYear}년 (월/일만 표기된 경우 이 연도를 기준으로 YYYY-MM-DD 형식으로 변환해주세요. 현재 참고 월: ${currentMonth}월)

각 일정의 카테고리는 다음 기준에 따라 가장 적절한 것으로 분류하세요:
${CATEGORY_DESCRIPTION}

규칙:
1. date: 반드시 "YYYY-MM-DD" 형태여야 합니다 (예: "${currentYear}-10-18").
2. category: 반드시 'worship', 'district', 'youth', 'praise', 'event', 'family' 중 하나여야 합니다.
3. title: 일정 이름 (예: "주일말씀 (정현 목사)", "찬양대 연습", "21구역모임", "교사모임").
4. time: 시작 시간 (예: "09:50", "14:00", "19:30"). 시간이 표기되어 있지 않으면 빈 문자열 ""로 지정하세요.
5. memo: 장소, 설교자/담당자, 대상, 기간 등 추가 정보 (예: "소강당", "김진평 성도 자녀", "10/4~10/5"). 없으면 빈 문자열 "".

반드시 다음과 같은 JSON 형식으로만 응답해주세요:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "category": "worship",
      "title": "일정 제목",
      "time": "11:00",
      "memo": "추가 메모"
    }
  ],
  "summary": "추출된 일정 요약 설명"
}`;

  const parts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    },
  ];

  const responseText = await callGeminiDirect(apiKey, parts);
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
  const parsed = JSON.parse(cleanJson);

  return {
    events: Array.isArray(parsed.events) ? parsed.events : [],
    summary: parsed.summary || `${parsed.events?.length || 0}개의 일정이 감지되었습니다.`,
  };
}

/**
 * Parse Text using Gemini
 */
export async function parseTextSchedule(params: {
  text: string;
  baseYear: number;
  baseMonth: number;
  apiKey?: string;
}): Promise<ParseResult> {
  const { text, baseYear, baseMonth } = params;
  const apiKey = params.apiKey || getStoredGeminiApiKey();

  // Try server endpoint first (works in local dev)
  if (!window.location.hostname.includes('github.io')) {
    try {
      const res = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          baseYear,
          baseMonth,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          return {
            events: data.events,
            summary: data.summary || `${data.events.length}개의 일정이 분석되었습니다.`,
          };
        }
      }
    } catch (e) {
      // Backend not reachable, fallback to direct client call
    }
  }

  if (!apiKey) {
    throw new Error('KEY_REQUIRED: Gemini API 키가 설정되지 않았습니다. API 키를 입력해주세요.');
  }

  const currentYear = baseYear || new Date().getFullYear();
  const currentMonth = baseMonth ? String(baseMonth).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');

  const prompt = `당신은 한국 교회의 부서 일정표 및 공지사항 분석 전문가입니다.
사용자가 입력한 교회 공지 문자, 카카오톡 메시지, 메모 등에서 일정 항목들을 추출해주세요.

입력 텍스트:
"""
${text}
"""

기준 연도: ${currentYear}년 (월/일만 표기된 경우 이 연도를 기준으로 YYYY-MM-DD 형식으로 변환해주세요. 현재 참고 월: ${currentMonth}월)

카테고리 분류 기준:
${CATEGORY_DESCRIPTION}

규칙:
1. date: 반드시 "YYYY-MM-DD" 형식 (예: "${currentYear}-10-18")
2. category: 반드시 'worship', 'district', 'youth', 'praise', 'event', 'family' 중 하나
3. title: 명확한 일정 제목
4. time: 24시간 표기법 "HH:mm" (예: "11:00", "19:30"), 없으면 ""
5. memo: 장소, 담당자, 세부 내용 등, 없으면 ""

반드시 다음과 같은 JSON 형식으로만 응답해주세요:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "category": "worship",
      "title": "일정 제목",
      "time": "11:00",
      "memo": "추가 메모"
    }
  ],
  "summary": "추출된 일정 요약 설명"
}`;

  const responseText = await callGeminiDirect(apiKey, [{ text: prompt }]);
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
  const parsed = JSON.parse(cleanJson);

  return {
    events: Array.isArray(parsed.events) ? parsed.events : [],
    summary: parsed.summary || `${parsed.events?.length || 0}개의 일정이 분석되었습니다.`,
  };
}
