import { ComponentProps } from 'react';
import { Spinner as HeroSpinner } from 'heroui-native';

/**
 * heroui's Spinner without its fade in and out, which is a layout animation. When a spinner went
 * just as something took its place (the payment methods replacing theirs), Android's views fell out
 * of step with React's and the app crashed: "addViewAt: failed to insert view". It still turns.
 */
export const Spinner = (props: ComponentProps<typeof HeroSpinner>) => <HeroSpinner animation={false} {...props} />;
