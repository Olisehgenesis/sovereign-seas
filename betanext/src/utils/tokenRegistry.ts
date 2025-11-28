export type TokenMeta = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
};

const STORAGE_KEY = 'sovseas.customTokens';

export function loadCustomTokens(): TokenMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t && t.address);
  } catch {
    return [];
  }
}

export function saveCustomTokens(tokens: TokenMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function addCustomToken(token: TokenMeta) {
  const existing = loadCustomTokens();
  const addr = token.address.toLowerCase();
  const dedup = existing.filter((t) => t.address.toLowerCase() !== addr);
  dedup.push(token);
  saveCustomTokens(dedup);
}

export function listTokens(base: TokenMeta[]): TokenMeta[] {
  const custom = loadCustomTokens();
  const map = new Map<string, TokenMeta>();
  [...base, ...custom].forEach((t) => {
    map.set(t.address.toLowerCase(), t);
  });
  return Array.from(map.values());
}


