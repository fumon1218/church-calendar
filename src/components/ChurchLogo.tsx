import React from 'react';

interface ChurchLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const ChurchLogo: React.FC<ChurchLogoProps> = ({
  className = '',
  size = 36,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 flex-shrink-0 ${className}`}>
      <img
        src="/logo.svg"
        alt="동해교회 로고"
        width={typeof size === 'number' ? size : undefined}
        height={typeof size === 'number' ? size : undefined}
        className="object-contain select-none"
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
        }}
        referrerPolicy="no-referrer"
      />
      {showText && (
        <span className="font-serif font-bold text-[var(--ink)] tracking-tight">
          동해교회
        </span>
      )}
    </div>
  );
};
