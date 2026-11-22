import { useMemo } from 'react';
import { OrderbookSnapshot } from '../types/finance';
import { formatPrice } from '../utils/formatters';

interface DepthChartProps {
  book: OrderbookSnapshot;
}

export function DepthChart({ book }: DepthChartProps) {
  const width = 560;
  const height = 160;
  const padX = 10;
  const padY = 14;
  const midX = width / 2;
  const plotH = height - padY * 2;

  const paths = useMemo(() => {
    const bids = [...book.bids].reverse();
    const asks = book.asks;
    const maxTotal = Math.max(
      1,
      bids[0]?.totalSize ?? 1,
      asks[asks.length - 1]?.totalSize ?? 1
    );

    const bidPoints = bids.map((lvl, idx) => {
      const x = padX + (idx / Math.max(1, bids.length - 1)) * (midX - padX - 8);
      const y = padY + plotH - (lvl.totalSize / maxTotal) * plotH;
      return { x, y };
    });

    const askPoints = asks.map((lvl, idx) => {
      const x = midX + 8 + (idx / Math.max(1, asks.length - 1)) * (midX - padX - 8);
      const y = padY + plotH - (lvl.totalSize / maxTotal) * plotH;
      return { x, y };
    });

    const bidLine = bidPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const bidArea =
      bidPoints.length > 0
        ? `${bidLine} L ${bidPoints[bidPoints.length - 1].x} ${padY + plotH} L ${bidPoints[0].x} ${padY + plotH} Z`
        : '';

    const askLine = askPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const askArea =
      askPoints.length > 0
        ? `${askLine} L ${askPoints[askPoints.length - 1].x} ${padY + plotH} L ${askPoints[0].x} ${padY + plotH} Z`
        : '';

    return { bidLine, bidArea, askLine, askArea };
  }, [book, midX, plotH]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>SoDEX Orderbook Liquidity Depth</span>
        <span className="font-mono">
          Mid {formatPrice(book.midPrice)} · Spread {book.spreadBps} bps
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-36 w-full"
        role="img"
        aria-label="Orderbook bid and ask liquidity depth chart"
      >
        <path d={paths.bidArea} fill="#16A34A" fillOpacity="0.14" />
        <path d={paths.bidLine} fill="none" stroke="#16A34A" strokeWidth="2" />
        <path d={paths.askArea} fill="#DC2626" fillOpacity="0.14" />
        <path d={paths.askLine} fill="none" stroke="#DC2626" strokeWidth="2" />
        <line
          x1={midX}
          x2={midX}
          y1={padY}
          y2={padY + plotH}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-700"
          strokeDasharray="3 3"
        />
      </svg>
    </div>
  );
}
