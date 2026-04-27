import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { colorFromName, faviconUrl, initials, resolveProvider } from '../lib/providers';

interface Props {
  name?: string | null;
  size?: number; // px
  className?: string;
}

/**
 * Provider logo with online favicon + offline letter-avatar fallback.
 * - Looks up the provider in the bundled UK directory + user overrides for a domain.
 * - Falls back to a heuristic domain guess.
 * - On <img> error (offline / blocked) it renders a deterministic-coloured letter avatar.
 */
export function ProviderLogo({ name, size = 28, className = '' }: Props) {
  const overrides = useFinanceStore(s => s.state.providerOverrides ?? {});
  const [errored, setErrored] = useState(false);
  const display = name?.trim() || '';
  useEffect(() => { setErrored(false); }, [name]);

  const resolved = resolveProvider(display, overrides);
  const url = !errored ? faviconUrl(resolved.domain, size >= 64 ? 64 : 32) : null;
  const sizePx = `${size}px`;
  const bg = colorFromName(display || '?');

  if (!url) {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-md text-white font-semibold shrink-0 ${className}`}
        style={{ width: sizePx, height: sizePx, fontSize: Math.max(10, Math.floor(size / 2.4)), background: bg }}
        title={display || undefined}
      >
        {initials(display || '?')}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={display ? `${display} logo` : ''}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`rounded-md shrink-0 ${className}`}
      style={{ width: sizePx, height: sizePx, background: '#ffffff' }}
    />
  );
}
