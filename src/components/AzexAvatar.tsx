import { useState } from 'react';

interface AzexAvatarProps {
  size?: number;
  thinking?: boolean;
  className?: string;
}

export function AzexAvatar({ size = 40, thinking = false, className = '' }: AzexAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-xl border bg-slate-900 ${
        thinking
          ? 'border-orange-500 ring-2 ring-orange-500/35'
          : 'border-slate-700/80 dark:border-slate-700'
      } ${className}`}
    >
      {!imgFailed ? (
        <img
          src="/src/assets/images/azex_copilot_portrait_1795283306684.jpg"
          alt="AZEX AI Quant Copilot"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          className="h-full w-full"
        >
          <rect width="64" height="64" rx="14" fill="#0F172A" />
          <path d="M14 62C14 50.5 21.8 45 32 45C42.2 45 50 50.5 50 62H14Z" fill="#334155" />
          <path d="M27 45L32 53L37 45H27Z" fill="#EA431F" />
          <rect x="21" y="19" width="22" height="23" rx="10.5" fill="#F5CBA7" />
          <path
            d="M20 22.5C20 15.2 25.2 11 32.5 11C39.2 11 44.5 14.8 44.5 21.8C41.5 18.8 36.2 17.5 31.5 18.2C26.8 18.9 23.2 20.8 20 22.5Z"
            fill="#1E293B"
          />
          <circle cx="27.2" cy="29.2" r="1.8" fill="#0F172A" />
          <circle cx="36.8" cy="29.2" r="1.8" fill="#0F172A" />
          <path
            d="M28.2 36.8C29.6 38.4 34.4 38.4 35.8 36.8"
            stroke="#7C4A32"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
