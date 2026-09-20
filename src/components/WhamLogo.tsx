import React from 'react';

interface WhamLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

/**
 * Big bold geometric "W" brand glyph for Wham.
 * Symmetrical, chiseled vector path with flat terminals and athletic climbing-inspired cuts.
 * Tight viewBox (9 15 46 36) guarantees zero excess dead margin.
 */
export const WhamLogo: React.FC<WhamLogoProps> = ({
  className = 'w-5 h-5',
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg
      viewBox="9 15 46 36"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Wham W Logo"
      {...props}
    >
      <path
        d="M9 15H19L28 37L32 27L36 37L45 15H55L43 51H35L32 43L29 51H21Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
};

interface WhamBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  badgeColor?: string;
  logoColor?: string;
  shadow?: boolean;
}

/**
 * Squircle app badge container matching the exact proportions of the browser favicon.
 */
export const WhamBadge: React.FC<WhamBadgeProps> = ({
  className = '',
  size = 'md',
  badgeColor = '#2BB3C7',
  logoColor = '#000000',
  shadow = true
}) => {
  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-14 h-14'
  }[size];

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${sizeClass} active:scale-95 transition-transform shrink-0 ${className}`}
      style={{
        filter: shadow ? `drop-shadow(0 4px 12px ${badgeColor}40)` : undefined
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Wham App Icon"
    >
      <rect width="64" height="64" rx="18" fill={badgeColor} />
      <path
        d="M9 15H19L28 37L32 27L36 37L45 15H55L43 51H35L32 43L29 51H21Z"
        fill={logoColor}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
};

/**
 * Returns a data URI for an SVG favicon rendered in the specified accent color.
 */
export function getWhamFaviconSvg(accentColor: string): string {
  const safeColor = encodeURIComponent(accentColor || '#2BB3C7');
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='${safeColor}'/><path d='M9 15H19L28 37L32 27L36 37L45 15H55L43 51H35L32 43L29 51H21Z' fill='%23000000'/></svg>`;
}

/**
 * Dynamically updates the browser tab's <link rel="icon"> to match the active user's accent color.
 */
export function updateWhamFavicon(accentColor: string) {
  if (typeof document === 'undefined') return;
  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (link) {
    link.href = getWhamFaviconSvg(accentColor);
  }
}
