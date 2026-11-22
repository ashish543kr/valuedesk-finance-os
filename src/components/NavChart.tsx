import { useMemo, useState } from 'react';
import { ChartTimeframe, NavHistoryPoint } from '../types/finance';
import { formatUsd } from '../utils/formatters';

interface NavChartProps {
  points: NavHistoryPoint[];
  timeframe: ChartTimeframe;
  onChangeTimeframe: (tf: ChartTimeframe) => void;
}

const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', 'YTD'];

export function NavChart({ points, timeframe, onChangeTimeframe }: NavChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 720;
  const height = 240;
  const padLeft = 14;
  const padRight = 14;
  const padTop = 20;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const chartData = useMemo(() => {
    if (points.length === 0) return null;
    const allValues = points.flatMap((p) => [p.portfolioNav, p.benchmarkNav]);
    const minVal = Math.min(...allValues) * 0.994;
    const maxVal = Math.max(...allValues) * 1.006;
    const range = Math.max(1, maxVal - minVal);

    const coords = points.map((p, idx) => {
      const x = padLeft + (idx / Math.max(1, points.length - 1)) * plotW;
      const yPort = padTop + plotH - ((p.portfolioNav - minVal) / range) * plotH;
      const yBench = padTop + plotH - ((p.benchmarkNav - minVal) / range) * plotH;
      return { ...p, x, yPort, yBench };
    });

    const portLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yPort}`).join(' ');
    const benchLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yBench}`).join(' ');
    const areaPath = `${portLine} L ${coords[coords.length - 1].x} ${padTop + plotH} L ${coords[0].x} ${padTop + plotH} Z`;

    return { coords, portLine, benchLine, areaPath, minVal, maxVal };
  }, [points, plotW, plotH]);

  if (!chartData) return null;

  const activePoint =
    hoverIdx !== null && chartData.coords[hoverIdx]
      ? chartData.coords[hoverIdx]
      : chartData.coords[chartData.coords.length - 1];

  const firstPoint = chartData.coords[0];
  const periodReturnPct =
    firstPoint.portfolioNav > 0
      ? ((activePoint.portfolioNav - firstPoint.portfolioNav) / firstPoint.portfolioNav) * 100
      : 0;
  const alphaVsBench = activePoint.portfolioNav - activePoint.benchmarkNav;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Managed Vault NAV vs MAG7 Benchmark
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {formatUsd(activePoint.portfolioNav)}
            </span>
            <span
              className={`font-mono text-sm font-medium ${
                periodReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {periodReturnPct >= 0 ? '+' : ''}
              {periodReturnPct.toFixed(2)}% ({activePoint.label})
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Benchmark {formatUsd(activePoint.benchmarkNav)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Desk Alpha {alphaVsBench >= 0 ? '+' : ''}
              {formatUsd(alphaVsBench)}
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Chart timeframe"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onChangeTimeframe(tf)}
              className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                timeframe === tf
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full overflow-visible select-none"
          role="img"
          aria-label="Portfolio NAV performance line chart"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="navAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = padTop + plotH * ratio;
            const labelVal = chartData.maxVal - (chartData.maxVal - chartData.minVal) * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                />
                <text
                  x={width - padRight}
                  y={y - 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px] dark:fill-slate-500"
                >
                  {formatUsd(labelVal, true)}
                </text>
              </g>
            );
          })}

          <path d={chartData.areaPath} fill="url(#navAreaGrad)" />

          <path
            d={chartData.benchLine}
            fill="none"
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-500"
            strokeWidth="1.75"
            strokeDasharray="4 4"
          />

          <path
            d={chartData.portLine}
            fill="none"
            stroke="#EA580C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={padTop}
                y2={padTop + plotH}
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.yBench}
                r="3.5"
                className="fill-slate-400 dark:fill-slate-500"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.yPort}
                r="5"
                fill="#EA580C"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {chartData.coords.map((pt, idx) => {
            const sliceW = plotW / Math.max(1, chartData.coords.length);
            return (
              <g key={pt.label}>
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[10px] dark:fill-slate-500"
                >
                  {pt.label}
                </text>
                <rect
                  x={pt.x - sliceW / 2}
                  y={0}
                  width={sliceW}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
