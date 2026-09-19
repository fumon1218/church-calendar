// 카카오맵 JavaScript SDK - 필요한 시점에만 동적으로 불러옵니다.
// VITE_KAKAO_APP_KEY 환경변수가 없으면 아예 로드를 시도하지 않고
// 관련 UI(주소 검색, 지도 미리보기)를 조용히 숨깁니다.

declare global {
  interface Window {
    kakao: any;
  }
}

let loadPromise: Promise<any> | null = null;

export function isKakaoConfigured(): boolean {
  const key = (import.meta as any).env?.VITE_KAKAO_APP_KEY;
  return !!key && key !== 'YOUR_KAKAO_JAVASCRIPT_KEY';
}

export function loadKakao(): Promise<any> {
  if (!isKakaoConfigured()) {
    return Promise.reject(new Error('VITE_KAKAO_APP_KEY가 설정되지 않았습니다.'));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve(window.kakao);
      return;
    }
    const appKey = (import.meta as any).env.VITE_KAKAO_APP_KEY;
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
