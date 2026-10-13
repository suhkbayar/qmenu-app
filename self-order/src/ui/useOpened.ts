import { useEffect, useState } from 'react';

// A dialog's opening animation (HeroUI's 200 ms) and a frame
const OPEN_ANIMATION_MS = 250;
// Its closing animation (150 ms) and a frame
const CLOSE_ANIMATION_MS = 180;

/**
 * Runs `fn` once a dialog that's closing now has finished animating out: what it changes (the cart,
 * the cards' steppers, the order bar) redraws after the animation rather than during it.
 */
export const whenClosed = (fn: () => void) => {
  setTimeout(fn, CLOSE_ANIMATION_MS);
};

/**
 * false while a dialog animates open, then true. A dialog's heavier parts (a floor plan, an HTML
 * description) wait for it, so the opening isn't slowed down drawing them. Use it inside the
 * dialog's content, which mounts fresh for each open.
 */
export const useOpened = () => {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOpened(true), OPEN_ANIMATION_MS);
    return () => clearTimeout(id);
  }, []);
  return opened;
};
