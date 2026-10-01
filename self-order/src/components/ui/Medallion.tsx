import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';

let gradientSeq = 0;

type Props = {
  glyph: string;
  size?: number;

  solid?: boolean;

  tint?: string;
};

const Medallion = ({ glyph, size = 56, solid = false, tint }: Props) => {
  const g = useGiftTheme();
  const gradientId = useRef(`brass${(gradientSeq += 1)}`).current;

  const accent = tint ?? g.gold;
  const r = size / 2;
  const stroke = Math.max(1.25, size * 0.028);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint ?? g.goldBright} />
            <Stop offset="0.5" stopColor={accent} />
            <Stop offset="1" stopColor={tint ?? g.goldDim} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={r}
          cy={r}
          r={r - stroke}
          fill={solid ? `url(#${gradientId})` : g.raised}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
        />
        <Circle
          cx={r}
          cy={r}
          r={r - size * 0.13}
          fill="none"
          stroke={solid ? 'rgba(0,0,0,0.22)' : g.hairline}
          strokeWidth={0.75}
        />
      </Svg>

      <View style={styles.glyph}>
        <Icon source={glyph} size={size * 0.42} color={solid ? g.onGold : (tint ?? g.goldText)} />
      </View>
    </View>
  );
};

export default Medallion;

const styles = StyleSheet.create({
  glyph: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
