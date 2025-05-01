import * as React from 'react';
import Svg, { G, Path } from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

const ReceptionistBellIcon = ({ width = 28, height = 28, color = 'white' }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 32 32" fill="white">
    <G id="_x31_3_receptionist_bell">
      <Path
        d="M30.814 29.392l-1.92-3.839a1 1 0 0 0-.894-.553h-11v-1h11c.007 0 .014-.001.02 0a1 1 0 0 0 1-1c0-.071-.007-.141-.021-.208-.107-6.736-5.366-12.233-11.999-12.742v-1.05h1a1 1 0 0 0 0-2h-4a1 1 0 0 0 0 2h1v1.051c-6.702.513-12 6.118-12 12.949a1 1 0 0 0 1 1h11v1h-12a1 1 0 0 0-.97.757l-1 4a1 1 0 0 0 .182.858 1 1 0 0 0 .788.385h28c.006 0 .014-.001.02 0a1 1 0 0 0 1-1c0-.229-.077-.439-.206-.608zM16 12c5.729 0 10.448 4.401 10.955 10H5.045C5.552 16.401 10.271 12 16 12zm-12.719 17l.5-2h23.601l1 2zM16 14.571a1 1 0 0 0-1-1c4.195 0 7.864 2.692 9.13 6.699a1 1 0 0 1-1.906.556c-1.002-3.171-3.906-5.302-7.224-5.302a1 1 0 0 0-1 1zm-1-10.571v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-2 0zm-9.707 2.707a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1-1.414 1.414l-2-2a1 1 0 0 1 0-1.414zm18 2a1 1 0 0 1 0-1.414l2-2a1 1 0 0 1 1.414 1.414l-2 2a1 1 0 0 1-1.414 0z"
        fill={color}
      />
    </G>
  </Svg>
);

export default ReceptionistBellIcon;
