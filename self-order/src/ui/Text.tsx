import { Text as RNText, TextProps } from 'react-native';
import { cn } from 'heroui-native';

/** App text: Inter and the theme's text colour by default; add classes for size, weight and colour. */
export const Text = ({ className, ...props }: TextProps & { className?: string }) => (
  <RNText className={cn('font-normal text-base text-foreground', className)} {...props} />
);
