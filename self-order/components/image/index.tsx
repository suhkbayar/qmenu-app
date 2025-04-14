import { Image as ExpoImage, ImageBackground as ExpoBackgroundImage, ImageProps as ExpoImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleProp, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

export interface ImageProps extends ExpoImageProps {
  scalable?: 'width' | 'height';
}

export function Image({ style, children, scalable, onLoad, ...rest }: ImageProps) {
  const [ratio, setRatio] = useState(1);

  const flattenedStyle = StyleSheet.flatten(style as StyleProp<any>);
  const width = flattenedStyle?.width;
  const height = flattenedStyle?.height;

  const getResponsiveStyle = (): StyleProp<ImageStyle> => {
    if (scalable === 'width' && width && !isNaN(+width)) {
      return [{ width, height: +width * ratio }];
    } else if (scalable === 'height' && height && !isNaN(+height)) {
      return [{ height, width: +height * ratio }];
    }
    return [];
  };

  const combinedStyle = [style, getResponsiveStyle()] as StyleProp<ImageStyle>;

  const handleLoad = (event: any) => {
    if (scalable) {
      const { width, height } = event.source;
      if (scalable === 'width') {
        setRatio(height / width);
      } else {
        setRatio(width / height);
      }
    }
    onLoad && onLoad(event);
  };

  if (children) {
    return (
      <ExpoBackgroundImage
        onLoad={handleLoad}
        style={combinedStyle as StyleProp<ViewStyle>} // cast to ViewStyle for background
        {...rest}
      >
        {children}
      </ExpoBackgroundImage>
    );
  }

  return (
    <ExpoImage
      onLoad={handleLoad}
      style={combinedStyle} // fine for images
      {...rest}
    />
  );
}
