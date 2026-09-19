// 날씨 예보 - Open-Meteo API (무료, API 키 불필요, 브라우저에서 직접 호출 가능)
// 문서: https://open-meteo.com/en/docs

export interface DailyWeather {
  date: string;
  tMax: number;
  tMin: number;
  code: number;
}

export type WeatherMap = Record<string, DailyWeather>;

const CACHE_KEY = 'church-calendar-weather-cache-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간 (예보는 자주 바뀌지 않으므로 과호출 방지)

export async function fetchWeather(lat: number, lng: number): Promise<WeatherMap> {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (
        Math.abs(cached.lat - lat) < 0.001 &&
        Math.abs(cached.lng - lng) < 0.001 &&
        Date.now() - cached.fetchedAt < CACHE_TTL_MS
      ) {
        return cached.data;
      }
    }
  } catch {
    // ignore cache read errors
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FSeoul&forecast_days=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather fetch failed');
  const json = await res.json();

  const data: WeatherMap = {};
  const dates: string[] = json.daily?.time || [];
  dates.forEach((d, i) => {
    data[d] = {
      date: d,
      tMax: json.daily.temperature_2m_max[i],
      tMin: json.daily.temperature_2m_min[i],
      code: json.daily.weathercode[i],
    };
  });

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, fetchedAt: Date.now(), data }));
  } catch {
    // ignore cache write errors
  }

  return data;
}

// WMO 날씨 코드를 간단한 이모지로 변환
export function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}
