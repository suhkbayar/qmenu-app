// The only sizes the image service makes (400 and 800 px wide); others don't exist on the CDN
export type CDN_SIZE = 'sm' | 'md';

export const getCdnImageUrl = (path: string, size: CDN_SIZE): string => {
  if (!path || !size) return '';
  const basePath = 'https://cdn.qmenu.mn/resized/sm';
  const resizedBasePath = `https://cdn.qmenu.mn/resized/${size}`;
  if (!path.includes(basePath)) return path;
  return path.replace(basePath, resizedBasePath);
};
