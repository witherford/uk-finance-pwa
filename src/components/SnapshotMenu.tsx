import { RefObject, useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { captureElementToPng } from '../lib/screenshot';
import { format } from 'date-fns';
import { snapshotPdf, snapshotXlsx } from '../lib/snapshot';
import { downloadBlob } from '../lib/import-export';

export function SnapshotMenu({ targetEl }: { targetEl: RefObject<HTMLDivElement | null> }) {
  const state = useFinanceStore(s => s.state);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const stamp = format(new Date(), 'yyyy-MM-dd');

  const doPdf = async () => {
    setBusy('pdf');
    try {
      const blob = await snapshotPdf(state, targetEl?.current ?? undefined);
      downloadBlob(blob, `finance-snapshot-${stamp}.pdf`);
    } catch (e) {
      alert('Failed to generate PDF: ' + (e as Error).message);
    }
    setBusy(null); setOpen(false);
  };

  const doXlsx = () => {
    setBusy('xlsx');
    try {
      const blob = snapshotXlsx(state);
      downloadBlob(blob, `finance-snapshot-${stamp}.xlsx`);
    } catch (e) {
      alert('Failed to generate XLSX: ' + (e as Error).message);
    }
    setBusy(null); setOpen(false);
  };

  const doPng = async () => {
    if (!targetEl?.current) return;
    setBusy('png');
    try {
      await captureElementToPng(targetEl.current, `finance-${stamp}.png`);
    } catch (e) {
      alert('Failed to capture screenshot: ' + (e as Error).message);
    }
    setBusy(null); setOpen(false);
  };

  return (
    <div ref={ref} className="relative no-print">
      <button className="btn-secondary" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
        📸 Snapshot ⌄
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-30 w-56 card overflow-hidden shadow-lg">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50" onClick={doPdf} disabled={!!busy}>
            📄 <span>{busy === 'pdf' ? 'Building PDF…' : 'PDF report (multi-page)'}</span>
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50" onClick={doXlsx} disabled={!!busy}>
            📊 <span>{busy === 'xlsx' ? 'Building XLSX…' : 'XLSX (sheet per section)'}</span>
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50" onClick={doPng} disabled={!!busy}>
            🖼️ <span>{busy === 'png' ? 'Capturing…' : 'PNG (visual)'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
