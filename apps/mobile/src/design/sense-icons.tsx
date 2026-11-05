import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

/**
 * Algı ve kurulum simgeleri (tasarım taslağındaki çizimler): görme, işitme, hareket, anlatım biçimi ve logo.
 * Hepsi dekoratif (`accessible={false}`); anlamı yanındaki yazı söyler.
 */
type IconProps = { color: string; size?: number };

const stroke = { fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function SeeIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke={color} {...stroke} />
      <Circle cx="12" cy="12" r="3" stroke={color} {...stroke} />
    </Svg>
  );
}

export function SeeLowIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke={color} {...stroke} />
      <Circle cx="12" cy="12" r="3" fill={color} />
      <Path d="M3 18h18" stroke={color} strokeWidth={1.8} strokeDasharray="2 3" strokeLinecap="round" />
    </Svg>
  );
}

export function SeeNoneIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.3 6.4C3.6 8.2 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.3-1"
        stroke={color}
        {...stroke}
      />
    </Svg>
  );
}

export function EarIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M6 9a6 6 0 0 1 12 0c0 4-4 4.5-4 8a3 3 0 0 1-6 0M9 9a3 3 0 0 1 6 0" stroke={color} {...stroke} />
    </Svg>
  );
}

export function EarLowIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M4 9a6 6 0 0 1 12 0c0 4-4 4.5-4 8a3 3 0 0 1-6 0" stroke={color} {...stroke} />
      <Path d="M14 20h6M14 16h4" stroke={color} {...stroke} />
    </Svg>
  );
}

export function VibrateIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Rect x="7" y="3" width="10" height="18" rx="2.5" stroke={color} {...stroke} />
      <Path d="M3 8v8M21 8v8M11 17.5h2" stroke={color} {...stroke} />
    </Svg>
  );
}

export function WalkIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx="13" cy="4" r="2" fill={color} />
      <Path d="m9 22 2.5-7 2.5 2.5V22M8 11l3-3.5 3 1.5 2 3 3 1M11.5 7.5 10 14" stroke={color} {...stroke} />
    </Svg>
  );
}

export function CaneIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx="10" cy="4" r="2" fill={color} />
      <Path d="m7 22 2.5-7L12 17v5M6 12l3-4.5 3 2 2 3M14 12.5 18 22" stroke={color} {...stroke} />
    </Svg>
  );
}

export function WheelchairIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx="11" cy="4" r="2" fill={color} />
      <Path d="M11 7v6h5l2.5 6.5M11 10h4" stroke={color} {...stroke} />
      <Path d="M8 11.5a5.5 5.5 0 1 0 7 7" stroke={color} {...stroke} />
    </Svg>
  );
}

export function HeadsetIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H5a1 1 0 0 1-1-1ZM20 15h-3v5h2a1 1 0 0 0 1-1Z" stroke={color} {...stroke} strokeWidth={1.9} />
    </Svg>
  );
}

export function BookIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2ZM4 21V5M8 7h7" stroke={color} {...stroke} />
    </Svg>
  );
}

export function SparkIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z" fill={color} />
    </Svg>
  );
}

export function DomeIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M4 20h16M6 20v-6a6 6 0 0 1 12 0v6M12 4v4M10 20v-3a2 2 0 0 1 4 0v3" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Sezi logosu (basamaklı işaret). En-boy oranı 2:1. */
export function SeziMark({ color, width = 40 }: { color: string; width?: number }) {
  return (
    <Svg width={width} height={width / 2} viewBox="0 0 1169 583" accessible={false}>
      <Polygon fill={color} points="1169 0 872 297 872 96 632 96 632 583 0 583 296 287 296 467 519 467 519 0" />
    </Svg>
  );
}
