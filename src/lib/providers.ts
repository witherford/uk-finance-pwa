import directory from '../data/uk-providers.json';
import { ProviderOverride } from '../types';

export type UKProviderCategory =
  | 'bank' | 'energy' | 'broadband' | 'mobile' | 'insurance' | 'credit-card'
  | 'council' | 'comparison' | 'utility-water' | 'subscription' | 'other';

export interface UKProvider {
  name: string;
  category: UKProviderCategory;
  domain: string;
  phone?: string;
  email?: string;
  aliases?: string[];
}

const DIR = directory as UKProvider[];

export function normaliseProviderName(name: string | undefined | null): string {
  return (name ?? '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 .&+]/g, '');
}

const INDEX: Map<string, UKProvider> = (() => {
  const m = new Map<string, UKProvider>();
  for (const p of DIR) {
    m.set(normaliseProviderName(p.name), p);
    for (const a of p.aliases ?? []) m.set(normaliseProviderName(a), p);
  }
  return m;
})();

export function lookupProvider(name: string): UKProvider | null {
  const n = normaliseProviderName(name);
  if (!n) return null;
  if (INDEX.has(n)) return INDEX.get(n)!;
  // best-effort prefix / contains match (e.g. "Octopus Energy Ltd" -> "Octopus Energy")
  for (const [key, val] of INDEX) {
    if (n.startsWith(key) || n.includes(key)) return val;
  }
  return null;
}

export function listDirectory(): UKProvider[] {
  return DIR;
}

export interface ResolvedProvider {
  name: string;                    // canonical-ish display name
  domain?: string;
  phone?: string;
  email?: string;
  category?: UKProviderCategory;
  source: 'directory' | 'override' | 'heuristic';
}

export function resolveProvider(
  name: string,
  overrides: Record<string, ProviderOverride> = {}
): ResolvedProvider {
  const key = normaliseProviderName(name);
  const ov = overrides[key];
  const dir = lookupProvider(name);
  // Override wins per-field where present.
  if (ov || dir) {
    return {
      name: dir?.name ?? name,
      domain: ov?.domain ?? dir?.domain,
      phone: ov?.phone ?? dir?.phone,
      email: ov?.email ?? dir?.email,
      category: dir?.category,
      source: ov ? 'override' : 'directory'
    };
  }
  // Heuristic fallback: derive a domain guess.
  return {
    name,
    domain: name ? key.replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '') + '.co.uk' : undefined,
    source: 'heuristic'
  };
}

export function colorFromName(name: string): string {
  const palette = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#e11d48', '#10b981', '#06b6d4', '#f43f5e', '#3b82f6', '#84cc16'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function initials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function faviconUrl(domain: string | undefined, size = 64): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
