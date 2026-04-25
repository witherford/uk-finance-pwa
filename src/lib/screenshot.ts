import { toPng } from 'html-to-image';
import { downloadBlob } from './import-export';

export async function captureElementToPng(el: HTMLElement, filename = 'finance-snapshot.png'): Promise<void> {
  const dataUrl = await toPng(el, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff'
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (navigator.share && (navigator as any).canShare?.({ files: [new File([blob], filename, { type: 'image/png' })] })) {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: 'image/png' })], title: 'Finance snapshot' });
      return;
    } catch { /* fall through to download */ }
  }
  downloadBlob(blob, filename);
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);
}
