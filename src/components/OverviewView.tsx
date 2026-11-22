import { useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, RefreshCw, ShieldCheck, SlidersHorizontal, User } from 'lucide-react';
import {
  AllocationPresetId,
  ChartTimeframe,
  DeskState,
  MarketNewsItem,
  PortfolioSummary,
  SodexPair,
  SoSoValueTelemetry,
  SpotAssetPrice,
  SsiIndexQuote,
  SsiSymbol,
} from '../types/finance';
import {
  MODEL_ALLOCATION_PRESETS,
  buildNavHistorySeries,
  calculateRebalancePlan,
} from '../domain/financeEngine';
import { formatPct, formatPrice, formatQty, formatRelativeTime, formatUsd } from '../utils/formatters';
import { NavChart } from './NavChart';
import { VaultTopology3D } from './VaultTopology3D';
import { AzexAvatar } from './AzexAvatar';

interface OverviewViewProps {
  summary: PortfolioSummary;
  state: DeskState;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  spotPrices: Record<string, SpotAssetPrice>;
  news: MarketNewsItem[];
  sosoValueFeed: SoSoValueTelemetry;
  onOpenMintModal: (symbol?: SsiSymbol) => void;
  onTradeOnSodex: (pair: SodexPair) => void;
  onBatchRebalance: (presetId: AllocationPresetId) => Promise<{ legsExecuted: number }>;
  onOpenAzex: () => void;
  onRefreshMarket: () => void;
  isRefreshing: boolean;
}

const NEWS_FILTERS: Array<'ALL' | SsiSymbol> = ['ALL', 'MAG7.ssi', 'DEFI.ssi', 'MEME.ssi', 'USSI'];

export function OverviewView({
  summary,
  state,
  indexQuotes,
  spotPrices,
  news,
  sosoValueFeed,
  onOpenMintModal,
  onTradeOnSodex,
  onBatchRebalance,
  onOpenAzex,
  onRefreshMarket,
  isRefreshing,
}: OverviewViewProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const [newsFilter, setNewsFilter] = useState<'ALL' | SsiSymbol>('ALL');
  const [selectedIndexSymbol, setSelectedIndexSymbol] = useState<SsiSymbol>('MAG7.ssi');
  const [selectedPreset, setSelectedPreset] = useState<AllocationPresetId>('balanced_alpha');
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceStatus, setRebalanceStatus] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [founderImgFailed, setFounderImgFailed] = useState(false);

  const navPoints = useMemo(
    () => buildNavHistorySeries(timeframe, summary.totalAumUsd),
    [timeframe, summary.totalAumUsd]
  );

  const rebalanceLegs = useMemo(
    () => calculateRebalancePlan(state, indexQuotes, selectedPreset),
    [state, indexQuotes, selectedPreset]
  );

  const filteredNews = useMemo(() => {
    if (newsFilter === 'ALL') return news;
    return news.filter((item) => item.impactedIndex === newsFilter);
  }, [news, newsFilter]);

  const activeIndex = indexQuotes[selectedIndexSymbol] ?? Object.values(indexQuotes)[0];
  const indexList = Object.values(indexQuotes);

  const topSpotAssets = ['BTC', 'ETH', 'SOL', 'SOSO'].map((sym) => spotPrices[sym]).filter(Boolean);

  async function handleRunRebalance() {
    setRebalancing(true);
    setRebalanceStatus(null);
    try {
      const res = await onBatchRebalance(selectedPreset);
      setRebalanceStatus(
        `Settled ${res.legsExecuted} atomic rebalance legs to ${MODEL_ALLOCATION_PRESETS[selectedPreset].label} on ValueChain L1.`
      );
    } catch (err) {
      setRebalanceStatus(err instanceof Error ? err.message : 'Unable to rebalance.');
    } finally {
      setRebalancing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Solo Fund &amp; Treasury Operations
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage client and proprietary SSI index vaults, execute on SoDEX orderbooks, and settle directly on ValueChain L1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {topSpotAssets.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-1.5 font-mono">
              <span className="font-medium text-slate-700 dark:text-slate-300">{asset.symbol}</span>
              <span className="text-slate-950 dark:text-white">{formatPrice(asset.price)}</span>
              <span
                className={
                  asset.change24hPct >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {formatPct(asset.change24hPct)}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={onRefreshMarket}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Feed
          </button>
        </div>
      </div>

      <section
        aria-label="Key financial metrics"
        className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Managed AUM
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-950 dark:text-white">
            {formatUsd(summary.totalAumUsd)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{formatUsd(summary.cashUsdc)}</span> liquid USDC reserve
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Unrealized Portfolio PnL
          </div>
          <div
            className={`mt-1.5 font-mono text-2xl font-semibold ${
              summary.unrealizedPnlUsd >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {summary.unrealizedPnlUsd >= 0 ? '+' : ''}
            {formatUsd(summary.unrealizedPnlUsd)}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
            {formatPct(summary.unrealizedPnlPct)} across {Object.keys(state.positions).length} positions
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Solo Operator Fee Revenue
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-950 dark:text-white">
            {formatUsd(summary.totalOperatorRevenueUsd)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{formatUsd(summary.annualizedRunRateUsd)}</span> est. ARR · {summary.clientMandateCount} mandates
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Autonomous Strategy Desk
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-950 dark:text-white">
            {summary.activeAgentCount} / {state.agents.length} Active
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{formatUsd(summary.settlementVolumeUsd, true)}</span> ValueChain volume
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-slate-950 dark:text-white">
            SoSoValue OpenAPI v1
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={
              sosoValueFeed.connected
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {sosoValueFeed.connected ? 'Institutional Stream Connected' : 'Spot Live Fallback Active'}
          </span>
          {sosoValueFeed.btcEtfDailyNetInflowUsd !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                US BTC ETF Flow {formatUsd(sosoValueFeed.btcEtfDailyNetInflowUsd, true)}
              </span>
            </>
          )}
          {sosoValueFeed.ethEtfDailyNetInflowUsd !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                US ETH ETF Flow {formatUsd(sosoValueFeed.ethEtfDailyNetInflowUsd, true)}
              </span>
            </>
          )}
          {sosoValueFeed.mag7ConstituentsCount !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                MAG7.ssi Synced ({sosoValueFeed.mag7ConstituentsCount} constituents)
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {sosoValueFeed.message}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7">
          <VaultTopology3D
            indexQuotes={indexQuotes}
            state={state}
            onSelectMint={(sym) => onOpenMintModal(sym)}
          />
        </div>

        <div className="lg:col-span-5">
          <section className="relative flex h-full min-h-[340px] flex-col justify-end overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/azex_vault_hero_1795281324036.jpg"
                alt="Institutional digital finance vault architecture by Team AZEX"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950">
                <ShieldCheck className="h-16 w-16 text-orange-500/50" />
              </div>
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent"
            />
            <div className="relative z-10 p-6 text-white">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Team AZEX</span>
                <span aria-hidden="true">·</span>
                <span>Ashish Kumar</span>
                <span aria-hidden="true">·</span>
                <span>SSI Custody Architecture</span>
              </div>
              <h2 className="mt-2 font-display text-xl font-bold leading-snug text-white">
                One-Person Sovereign Wealth Infrastructure
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                Institutional-grade multi-party custody via Cobo &amp; Ceffu paired with ValueChain L1 sub-second settlement and SoDEX orderbook depth.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenMintModal('MAG7.ssi')}
                  className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
                >
                  Mint SSI Basket
                </button>
                <button
                  type="button"
                  onClick={() => onTradeOnSodex('MAG7.ssi/USDC')}
                  className="rounded-lg border border-white/25 bg-slate-950/60 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-900"
                >
                  Open SoDEX Book
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <NavChart
            points={navPoints}
            timeframe={timeframe}
            onChangeTimeframe={setTimeframe}
          />

          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  SoSoValue SSI Protocol Vaults
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an index to inspect live constituent weights or mint wrapped tokens directly.
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Settled on ValueChain L1
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-3">Index Token</th>
                    <th className="px-4 py-3 text-right">Live NAV</th>
                    <th className="px-4 py-3 text-right">24h</th>
                    <th className="px-4 py-3 text-right">Est. APR</th>
                    <th className="px-4 py-3 text-right">Vault Holding</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {indexList.map((idx) => {
                    const held = state.positions[idx.symbol]?.quantity ?? 0;
                    const heldUsd = held * idx.nav;
                    const isSelected = selectedIndexSymbol === idx.symbol;
                    return (
                      <tr
                        key={idx.symbol}
                        onClick={() => setSelectedIndexSymbol(idx.symbol)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-50/60 dark:bg-slate-800/70'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-semibold text-slate-950 dark:text-white">
                            {idx.symbol}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {idx.category} · {idx.custodyPartner}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-950 dark:text-white">
                          ${idx.nav.toFixed(4)}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-mono font-medium ${
                            idx.change24hPct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatPct(idx.change24hPct)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {idx.yieldAprPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-mono font-medium text-slate-950 dark:text-white">
                            {formatUsd(heldUsd)}
                          </div>
                          <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {formatQty(held)} units
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div
                            className="inline-flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onOpenMintModal(idx.symbol)}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap transition-colors hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
                            >
                              Mint
                            </button>
                            <button
                              type="button"
                              onClick={() => onTradeOnSodex(`${idx.symbol}/USDC` as SodexPair)}
                              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              SoDEX
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {activeIndex && (
              <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                      {activeIndex.symbol}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {activeIndex.description}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    TVL {formatUsd(activeIndex.tvlUsd, true)} · Fee {activeIndex.managementFeeBps} bps
                  </span>
                </div>

                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {activeIndex.constituents.map((c) => (
                    <div
                      key={c.symbol}
                      style={{ width: `${c.weight * 100}%`, backgroundColor: c.color }}
                      title={`${c.symbol}: ${(c.weight * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  {activeIndex.constituents.map((c) => (
                    <div key={c.symbol} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <span
                          className="inline-block h-2 w-2 rounded-xs"
                          style={{ backgroundColor: c.color }}
                          aria-hidden="true"
                        />
                        {c.symbol}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {(c.weight * 100).toFixed(0)}% · {formatPrice(c.spotPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4">
          <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  SoSoValue Catalyst Feed
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Index Impact
                </span>
              </div>

              <div
                role="group"
                aria-label="Filter news by index"
                className="mt-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              >
                {NEWS_FILTERS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewsFilter(tag)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      newsFilter === tag
                        ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tag === 'ALL' ? 'All' : tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 divide-y divide-slate-200 dark:divide-slate-800">
              {filteredNews.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No recent catalysts tagged for {newsFilter}.
                </div>
              ) : (
                filteredNews.slice(0, 6).map((item) => (
                  <article key={item.id} className="p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {item.impactedIndex}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          item.sentiment === 'Bullish'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.sentiment === 'Cautious'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {item.sentiment}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(item.publishedAt)}</span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {item.summary}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{item.source}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenMintModal(item.impactedIndex)}
                          className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                        >
                          Act on {item.impactedIndex}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Read full story: ${item.title}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-orange-600" />
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Atomic Model Portfolio Rebalancer
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Align all four SSI index vaults to a risk-weighted target allocation in one ValueChain settlement.
              </p>
            </div>

            <button
              type="button"
              disabled={rebalancing || rebalanceLegs.length === 0}
              onClick={handleRunRebalance}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-orange-600 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              {rebalancing
                ? 'Settling Basket...'
                : rebalanceLegs.length === 0
                  ? 'Aligned'
                  : `Execute (${rebalanceLegs.length} legs)`}
            </button>
          </div>

          <div
            role="group"
            aria-label="Target model allocation preset"
            className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {Object.values(MODEL_ALLOCATION_PRESETS).map((preset) => {
              const active = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setRebalanceStatus(null);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-orange-600 bg-orange-50/60 dark:border-orange-500 dark:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-950 dark:text-white">
                    {preset.label}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {rebalanceStatus && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              {rebalanceStatus}
            </div>
          )}

          {rebalanceLegs.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-4 dark:border-slate-800">
              {rebalanceLegs.map((leg) => (
                <div key={leg.symbol} className="text-xs">
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {leg.symbol}
                  </div>
                  <div
                    className={`font-mono text-[11px] font-medium ${
                      leg.side === 'MINT'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {leg.side} {formatUsd(Math.abs(leg.deltaUsd))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {!founderImgFailed ? (
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-11-21_at_10.57.28_PM_07c51748.jpeg"
                  alt="Ashish Kumar, B.Tech CSE 3rd Year and Lead Builder of Team AZEX"
                  referrerPolicy="no-referrer"
                  onError={() => setFounderImgFailed(true)}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Team AZEX</span>
                <span aria-hidden="true">·</span>
                <span>B.Tech CSE (3rd Year)</span>
                <span aria-hidden="true">·</span>
                <span>AI/ML, Web Dev &amp; Research</span>
              </div>
              <h2 className="mt-1 font-display text-lg font-bold text-slate-950 dark:text-white">
                Ashish Kumar
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Third-year B.Tech Computer Science &amp; Engineering student driven by curiosity across AI/ML, full-stack web engineering, and quantitative research — building ValueDesk so a single operator can run an institutional on-chain fund on SoSoValue, SoDEX, and ValueChain L1.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <AzexAvatar size={32} />
              <div className="text-xs">
                <div className="font-semibold text-slate-950 dark:text-white">
                  AZEX AI Copilot
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time portfolio &amp; SSI execution assistant
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAzex}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-orange-500 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-orange-500"
            >
              Chat with AZEX
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
