import React from 'react';

interface WhamLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

/**
 * Canonical vector path for the dynamic Wham brand mark.
 * Derived from /public/wham.svg.
 */
export const WHAM_LOGO_PATH =
  'M424.999,0.0 C471.532,0.71 461.963,51.566 452.0,84.0 C432.298,148.135 400.994,273.552 356.999,308.999 C337.673,325.151 337.497,324.46 326.0,328.999 C252.135,359.390 257.716,249.164 214.999,248.0 C198.169,248.130 180.2,307.441 136.999,316.0 C72.604,328.816 41.681,209.351 22.0,169.0 C14.960,154.568 -7.377,125.41 3.999,101.999 C14.234,81.273 47.124,75.310 71.999,85.999 C120.149,106.690 112.100,165.387 144.999,195.999 C147.997,198.43 152.185,197.412 156.0,194.999 C171.565,182.886 178.371,161.98 189.999,144.999 C237.948,78.617 270.335,173.299 292.999,195.999 C295.333,195.666 297.666,195.333 299.999,194.999 C314.814,186.919 330.590,115.651 338.0,95.0 C355.441,46.383 395.636,0.0 424.999,0.0 ZM409.0,51.0 C400.580,51.0 388.416,61.586 384.0,71.999 C382.751,76.632 381.697,81.697 385.0,85.0 C388.774,88.774 402.862,101.306 414.0,95.999 C424.162,88.723 432.242,54.326 423.0,51.999 C416.104,50.663 416.7,51.0 409.0,51.0 ZM377.999,144.999 C364.849,144.615 347.349,153.922 346.999,174.999 C347.242,186.952 374.634,198.97 379.999,192.0 C389.11,180.612 399.973,162.273 390.0,148.0 C386.990,146.10 384.131,145.466 377.999,144.999 ZM322.999,240.999 C311.805,246.574 302.618,262.87 306.999,278.999 C308.498,284.760 311.265,286.66 314.0,286.0 C327.438,287.32 357.320,272.96 352.0,257.0 C348.156,244.106 336.6,235.404 322.999,240.999 Z';

/**
 * Big bold dynamic "W" brand glyph for Wham.
 * Natural aspect ratio 461x335 matches /public/wham.svg.
 */
export const WhamLogo: React.FC<WhamLogoProps> = ({
  className = 'w-6 h-5',
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 461 335"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Wham W Logo"
      {...props}
    >
      <path
        d={WHAM_LOGO_PATH}
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
 * Squircle app badge container matching the proportions of the app icon and favicon.
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
      <g transform="translate(10.5, 16.35) scale(0.0936)">
        <path
          d={WHAM_LOGO_PATH}
          fill={logoColor}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </g>
    </svg>
  );
};

/**
 * Returns a data URI for an SVG favicon rendered in the specified accent color.
 */
export function getWhamFaviconSvg(accentColor: string): string {
  const safeColor = encodeURIComponent(accentColor || '#2BB3C7');
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='${safeColor}'/><g transform='translate(10.5, 16.35) scale(0.0936)'><path d='${WHAM_LOGO_PATH}' fill='%23000000' fill-rule='evenodd'/></g></svg>`;
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

