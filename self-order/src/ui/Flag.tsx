import { memo } from 'react';
import { View } from 'react-native';
import { cn } from 'heroui-native';
import { SvgAst, parse } from 'react-native-svg';
import CN from 'country-flag-icons/string/3x2/CN';
import DE from 'country-flag-icons/string/3x2/DE';
import FR from 'country-flag-icons/string/3x2/FR';
import JP from 'country-flag-icons/string/3x2/JP';
import KR from 'country-flag-icons/string/3x2/KR';
import MN from 'country-flag-icons/string/3x2/MN';
import RU from 'country-flag-icons/string/3x2/RU';
import SE from 'country-flag-icons/string/3x2/SE';
import US from 'country-flag-icons/string/3x2/US';
import UZ from 'country-flag-icons/string/3x2/UZ';

// Each language's flag (country-flag-icons, MIT): vector, so sharp at any size. Only these ten are bundled.
const FLAGS: Record<string, string> = {
  mn: MN,
  en: US,
  ru: RU,
  ko: KR,
  zh: CN,
  ja: JP,
  de: DE,
  fr: FR,
  sv: SE,
  uz: UZ,
};

type Props = {
  /** A language code, e.g. 'mn' */
  language: string;
  /** Width in dp; the flag is 3:2 */
  width?: number;
  className?: string;
};

// Each flag's SVG, parsed from text the first time it's shown and then kept. SvgXml parses it again
// on every mount, which was ten flags each time the settings opened.
const parsed = new Map<string, ReturnType<typeof parse>>();
const flagAst = (language: string) => {
  const code = FLAGS[language] ? language : 'en';
  if (!parsed.has(code)) parsed.set(code, parse(FLAGS[code]));
  return parsed.get(code) ?? null;
};

const FILL = { width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid slice' };

/** A language's flag with rounded corners and a hairline edge, so white flags (Japan, Korea) don't vanish. */
export const Flag = memo(({ language, width = 36, className }: Props) => (
  <View
    className={cn('overflow-hidden rounded-[5px] border border-border', className)}
    style={{ width, height: Math.round((width * 2) / 3) }}
  >
    <SvgAst ast={flagAst(language)} override={FILL} />
  </View>
));
