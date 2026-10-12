import { Image as ExpoImage, ImageProps } from 'expo-image';
import { withUniwind } from 'uniwind';

// Kept in memory as well as on disk (expo-image's default is disk only), so a dish scrolled back
// into view shows at once instead of being decoded from disk again
const CachedImage = (props: ImageProps) => <ExpoImage cachePolicy="memory-disk" {...props} />;

/** expo-image (memory + disk cache) that also takes Tailwind classes. */
export const Image = withUniwind(CachedImage);
