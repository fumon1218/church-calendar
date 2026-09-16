import React, { useState } from 'react';
import { ChurchEvent, ChurchConfig } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { formatKoreanDate, getDayOfWeek } from '../utils/calendar';
import { Printer, X, FileText, Check } from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';

interface PrintViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ChurchEvent[];
  churchConfig: ChurchConfig;
  year: number;
  month: number;
}

export const PrintViewModal: React.FC<PrintViewModalProps> = ({
  isOpen,
  onClose,
  events,
  churchConfig,
  year,
  month,
}) => {
  const [printScope, setPrintScope] = useState<'month' | 'all'>('month');

  if (!isOpen) return null;

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const filteredEvents = events
    .filter((ev) => {
      if (printScope === 'month') return ev.date.startsWith(currentMonthStr);
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white text-gray-900 border border-gray-300 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 font-serif">
                주보 및 게시용 일정표 인쇄 미리보기
              </h3>
              <p className="text-xs text-gray-500">
                A4 규격에 맞게 주보 간지나 게시판 부착용으로 인쇄할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-gray-900 text-white hover:bg-black transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>지금 인쇄하기</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope selector (Hidden in Print) */}
        <div className="no-print px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">출력 범위:</span>
            <button
              onClick={() => setPrintScope('month')}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                printScope === 'month'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              현재 {year}년 {month + 1}월 일정 ({filteredEvents.length}건)
            </button>
            <button
              onClick={() => setPrintScope('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                printScope === 'all'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              전체 일정 ({events.length}건)
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-8 sm:p-10 flex-1 overflow-y-auto bg-white font-sans print-container">
          {/* Header for print */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ChurchLogo size={44} />
              <div className="text-left">
                <p className="text-xs tracking-widest text-gray-500 font-semibold">
                  {churchConfig.churchName} · {churchConfig.subTitle}
                </p>
                <p className="text-[11px] text-gray-600 italic">
                  "{churchConfig.motto}"
                </p>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight mt-2">
              {year}년 {month + 1}월 부서 일정표
            </h1>
          </div>

          {/* Schedule Table */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              선택된 기간에 일정이 없습니다.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-800 bg-gray-100/70 text-gray-800">
                  <th className="py-2.5 px-3 font-semibold w-32">일자 (요일)</th>
                  <th className="py-2.5 px-2 font-semibold w-20">시간</th>
                  <th className="py-2.5 px-2 font-semibold w-24">부서</th>
                  <th className="py-2.5 px-3 font-semibold">행사 / 일정 내용</th>
                  <th className="py-2.5 px-3 font-semibold">비고 / 장소 / 담당</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvents.map((ev) => {
                  const dow = getDayOfWeek(ev.date);
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  const cat = CATEGORY_MAP[ev.category] || { label: '기타' };

                  return (
                    <tr
                      key={ev.id}
                      className={isSun ? 'bg-red-50/40' : undefined}
                    >
                      <td
                        className={`py-2.5 px-3 font-medium ${
                          isSun ? 'text-red-700 font-bold' : isSat ? 'text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {formatKoreanDate(ev.date).replace(`${year}년 `, '')}
                      </td>
                      <td className="py-2.5 px-2 text-gray-600 font-mono">
                        {ev.time || '-'}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border border-gray-300 bg-gray-50 text-gray-800">
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {ev.title}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {[ev.location, ev.memo].filter(Boolean).join(' · ') || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Print Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-[11px] text-gray-500">
            <span>{churchConfig.churchName} 교회사무실</span>
            <span>인쇄일시: {new Date().toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
