import React from 'react';

interface WhamLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

/**
 * Big bold geometric "W" brand glyph for Wham.
 * Symmetrical, chiseled vector path with flat terminals and athletic climbing-inspired cuts.
 */
export const WhamLogo: React.FC<WhamLogoProps> = ({
  className = 'w-4 h-4',
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Wham W Logo"
      {...props}
    >
      <path
        d="M4.5 7.5H9.5L14 18.5L16 13.5L18 18.5L22.5 7.5H27.5L21.5 25.5H17.5L16 21.5L14.5 25.5H10.5Z"
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
 * Squircle app badge container with dynamic accent background and the bold "W" glyph inside.
 */
export const WhamBadge: React.FC<WhamBadgeProps> = ({
  className = '',
  size = 'md',
  badgeColor = '#06B6D4',
  logoColor = '#000000',
  shadow = true
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-7 h-7'
  }[size];

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center transition-transform active:scale-95 ${className}`}
      style={{
        backgroundColor: badgeColor,
        boxShadow: shadow ? `0 4px 14px ${badgeColor}35` : undefined
      }}
    >
      <WhamLogo className={`${iconSizes}`} color={logoColor} />
    </div>
  );
};

/**
 * Returns a data URI for an SVG favicon rendered in the specified accent color.
 */
export function getWhamFaviconSvg(accentColor: string): string {
  const safeColor = encodeURIComponent(accentColor || '#06B6D4');
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
