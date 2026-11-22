export function formatUsd(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '$0.00';
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '$0.00';
  if (price < 0.001) return `$${price.toFixed(7)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 20) return `$${price.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatQty(qty: number): string {
  if (!Number.isFinite(qty)) return '0';
  if (qty >= 1000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(qty);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
  }).format(qty);
}

export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '0.00%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatRelativeTime(isoString: string): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function shortenHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}
