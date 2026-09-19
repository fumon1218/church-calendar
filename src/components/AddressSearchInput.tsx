import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { loadKakao, isKakaoConfigured } from '../utils/kakao';

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

interface AddressSearchInputProps {
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
}

// 카카오맵으로 장소/주소를 검색해서 좌표까지 함께 채워주는 입력창입니다.
// VITE_KAKAO_APP_KEY가 설정되어 있지 않으면 자동으로 아무것도 렌더링하지 않습니다.
export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  onSelect,
  placeholder = '장소/주소 검색 (카카오맵)',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isKakaoConfigured()) return null;

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const kakao = await loadKakao();
      const ps = new kakao.maps.services.Places();
      ps.keywordSearch(q, (data: any[], status: string) => {
        setLoading(false);
        setOpen(true);
        if (status === kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 6));
        } else {
          setResults([]);
        }
      });
    } catch {
      setLoading(false);
      setErrorMsg('카카오맵을 불러오지 못했습니다.');
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-50 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>

      {errorMsg && <p className="text-[10px] text-[var(--red)] mt-1">{errorMsg}</p>}

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-[11px] text-[var(--ink-faint)] text-center">검색 결과가 없습니다.</div>
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  onSelect({
                    address: `${r.place_name} (${r.road_address_name || r.address_name})`,
                    lat: parseFloat(r.y),
                    lng: parseFloat(r.x),
                  });
                  setOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full text-left p-2.5 text-[11px] hover:bg-[var(--surface-soft)] border-b border-[var(--line-soft)] last:border-b-0"
              >
                <div className="font-semibold text-[var(--ink)]">{r.place_name}</div>
                <div className="text-[var(--ink-faint)]">{r.road_address_name || r.address_name}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
