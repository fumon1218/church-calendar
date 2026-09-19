import React, { useEffect, useRef } from 'react';
import { loadKakao, isKakaoConfigured } from '../utils/kakao';

interface KakaoMapPreviewProps {
  lat: number;
  lng: number;
  height?: number;
}

// 위도/경도가 있는 일정에 작은 지도를 보여줍니다. 카카오 키가 없으면 아무것도 렌더링하지 않습니다.
export const KakaoMapPreview: React.FC<KakaoMapPreviewProps> = ({ lat, lng, height = 140 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isKakaoConfigured() || !ref.current) return;
    let cancelled = false;

    loadKakao()
      .then((kakao) => {
        if (cancelled || !ref.current) return;
        const map = new kakao.maps.Map(ref.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level: 4,
        });
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          map,
        });
      })
      .catch(() => {
        // 조용히 무시 (지도는 부가 기능이므로 실패해도 나머지 화면에 영향 없음)
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!isKakaoConfigured()) return null;

  return (
    <div
      ref={ref}
      style={{ width: '100%', height }}
      className="rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)]"
    />
  );
};
