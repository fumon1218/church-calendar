import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = process.cwd();

const app = express();
const PORT = 3000;

// Body parsing with generous limit for high-res photo uploads of church bulletins
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve public static assets (logos, icons, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// Categories recognized by the church calendar
const CATEGORY_DESCRIPTION = `
- 'worship': 예배·말씀 (주일예배, 주일말씀, 수요말씀, 새벽기도회, 특별집회 등)
- 'district': 구역모임 (구역예배, 조모임, 어머니회, 직장조 등)
- 'youth': 청년·학생부 (청년회, 중고등부, 이삭부, 유초등부, 교회학교 등)
- 'praise': 찬양 (찬양대, 성가대, 찬양의 밤, 찬양팀 연습 등)
- 'event': 행사·수련회 (교사모임, 봉사회, 수련회, 야외교제, 교육, 부서 회의 등)
- 'family': 경조사·공휴일 (결혼식, 장례, 심방, 공휴일, 대체공휴일 등)
`;

// AI Photo Parser Endpoint (주보/사진/일정표 이미지 분석)
app.post('/api/ai/parse-photo', async (req, res) => {
  try {
    const { imageBase64, mimeType, baseYear, baseMonth } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터가 누락되었습니다.' });
    }

    const ai = getAI();
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

정확하고 누락 없이 모든 일정을 JSON 배열 형태로 반환해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  category: {
                    type: Type.STRING,
                    enum: ['worship', 'district', 'youth', 'praise', 'event', 'family'],
                  },
                  title: { type: Type.STRING },
                  time: { type: Type.STRING },
                  memo: { type: Type.STRING },
                },
                required: ['date', 'category', 'title'],
              },
            },
            summary: { type: Type.STRING, description: '추출된 일정 요약 설명' },
          },
          required: ['events'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"events":[]}');
    res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Error parsing photo schedule:', err);
    res.status(500).json({ error: err.message || '이미지 분석에 실패했습니다.' });
  }
});

// AI Text Parser Endpoint (카카오톡 공지문/텍스트 메시지 분석)
app.post('/api/ai/parse-text', async (req, res) => {
  try {
    const { text, baseYear, baseMonth } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '분석할 텍스트를 입력해주세요.' });
    }

    const ai = getAI();
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
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  category: {
                    type: Type.STRING,
                    enum: ['worship', 'district', 'youth', 'praise', 'event', 'family'],
                  },
                  title: { type: Type.STRING },
                  time: { type: Type.STRING },
                  memo: { type: Type.STRING },
                },
                required: ['date', 'category', 'title'],
              },
            },
            summary: { type: Type.STRING, description: '추출된 일정 요약 설명' },
          },
          required: ['events'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"events":[]}');
    res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Error parsing text schedule:', err);
    res.status(500).json({ error: err.message || '텍스트 분석에 실패했습니다.' });
  }
});

// Vite middleware for dev / static for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
