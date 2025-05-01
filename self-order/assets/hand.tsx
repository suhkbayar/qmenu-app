import * as React from 'react';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

const CleanHandIcon = ({ width = 32, height = 32, color = '#000' }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 1024 1024" fill="none">
    <G fill={color}>
      <Path d="M336 576c0-48 64-48 64 0v64h32v-96c0-48 64-48 64 0v96h32v-128c0-48 64-48 64 0v128h32v-160c0-48 64-48 64 0v160h24c24 0 48-24 48-48v-48c0-24-24-48-48-48H336zM160 128h704c17.673 0 32 14.327 32 32v704c0 17.673-14.327 32-32 32H160c-17.673 0-32-14.327-32-32V160c0-17.673 14.327-32 32-32z" />
    </G>
  </Svg>
);

export default CleanHandIcon;
