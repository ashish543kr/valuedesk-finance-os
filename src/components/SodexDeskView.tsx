import { useEffect, useState } from 'react';
import {
  DeskState,
  OrderbookSnapshot,
  SodexPair,
  SpotAssetPrice,
  SsiIndexQuote,
  SsiSymbol,
} from '../types/finance';
import { getLiveAssetPrice } from '../domain/financeEngine';
import { formatPrice, formatQty, formatRelativeTime, formatUsd, shortenHash } from '../utils/formatters';
import { DepthChart } from './DepthChart';

interface SodexDeskViewProps {
  selectedPair: SodexPair;
  onSelectPair: (pair: SodexPair) => void;
  state: DeskState;
  spotPrices: Record<string, SpotAssetPrice>;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  onExecuteOrder: (payload: {
    pair: SodexPair;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    limitPrice?: number;
  }) => Promise<void>;
}

const PAIRS: SodexPair[] = [
  'MAG7.ssi/USDC',
  'DEFI.ssi/USDC',
  'MEME.ssi/USDC',
  'USSI/USDC',
  'BTC/USDC',
  'ETH/USDC',
  'SOL/USDC',
  'SOSO/USDC',
];

export function SodexDeskView({
  selectedPair,
  onSelectPair,
  state,
  spotPrices,
  indexQuotes,
  onExecuteOrder,
}: SodexDeskViewProps) {
  const [book, setBook] = useState<OrderbookSnapshot | null>(null);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('LIMIT');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1000');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [baseAsset] = selectedPair.split('/');
  const liveMark = getLiveAssetPrice(baseAsset, spotPrices, indexQuotes);
  const heldQty = state.positions[baseAsset]?.quantity ?? 0;

  useEffect(() => {
    let active = true;
    async function loadBook() {
      try {
        const resp = await fetch(`/api/orderbook?pair=${encodeURIComponent(selectedPair)}`);
        if (!resp.ok) return;
        const data = (await resp.json()) as OrderbookSnapshot;
        if (active) {
          setBook(data);
          setLimitPrice(String(data.midPrice));
        }
      } catch {
      }
    }
    loadBook();
    const interval = setInterval(loadBook, 12000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedPair]);

  const parsedPrice =
    orderType === 'LIMIT' && Number(limitPrice) > 0 ? Number(limitPrice) : liveMark;
  const parsedQty = Math.max(0, Number(quantity) || 0);
  const estimatedNotional = parsedQty * parsedPrice;
  const estRebate = estimatedNotional * 0.0004;

  function applyPercentage(pct: number) {
    if (side === 'BUY') {
      const budget = state.cashUsdc * pct;
      const qty = parsedPrice > 0 ? budget / parsedPrice : 0;
      setQuantity(qty >= 10 ? qty.toFixed(2) : qty.toFixed(4));
    } else {
      const qty = heldQty * pct;
      setQuantity(qty >= 10 ? qty.toFixed(2) : qty.toFixed(4));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    if (parsedQty <= 0) {
      setErrorMsg('Enter a positive order quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await onExecuteOrder({
        pair: selectedPair,
        side,
        orderType,
        quantity: parsedQty,
        limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : undefined,
      });
      setFeedbackMsg(
        `Executed ${orderType} ${side} for ${formatQty(parsedQty)} ${baseAsset} on SoDEX L1.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Order submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const maxDepthSize = book
    ? Math.max(
        book.bids[book.bids.length - 1]?.totalSize ?? 1,
        book.asks[book.asks.length - 1]?.totalSize ?? 1
      )
    : 1;

  const sodexReceipts = state.receipts.filter((r) => r.venue === 'SoDEX L1');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            SoDEX Central Limit Orderbook
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Execute spot &amp; SSI index liquidity orders on ValueChain L1 with instant maker/operator fee rebates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {PAIRS.map((pair) => (
            <button
              key={pair}
              type="button"
              onClick={() => onSelectPair(pair)}
              className={`rounded-md px-2.5 py-1.5 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                selectedPair === pair
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          {book && <DepthChart book={book} />}

          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>Price (USDC)</span>
              <span>Size ({baseAsset})</span>
              <span>Total</span>
            </div>

            {!book ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading SoDEX book...</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                <div className="py-1">
                  {[...book.asks].reverse().slice(0, 6).map((lvl) => {
                    const widthPct = Math.min(100, (lvl.totalSize / maxDepthSize) * 100);
                    return (
                      <button
                        key={`ask-${lvl.price}`}
                        type="button"
                        onClick={() => {
                          setOrderType('LIMIT');
                          setLimitPrice(String(lvl.price));
                        }}
                        className="relative flex w-full items-center justify-between px-4 py-1.5 font-mono text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span
                          aria-hidden="true"
                          style={{ width: `${widthPct}%` }}
                          className="pointer-events-none absolute inset-y-0 right-0 bg-red-500/10"
                        />
                        <span className="relative text-red-600 dark:text-red-400">
                          {formatPrice(lvl.price)}
                        </span>
                        <span className="relative text-slate-700 dark:text-slate-300">
                          {formatQty(lvl.size)}
                        </span>
                        <span className="relative text-slate-500 dark:text-slate-400">
                          {formatQty(lvl.totalSize)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between bg-slate-50 px-4 py-2 font-mono text-xs dark:bg-slate-800/50">
                  <span className="font-semibold text-slate-950 dark:text-white">
                    Mark {formatPrice(liveMark)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Spread {formatPrice(book.spreadUsd)} · Funding +{book.fundingRatePct}%
                  </span>
                </div>

                <div className="py-1">
                  {book.bids.slice(0, 6).map((lvl) => {
                    const widthPct = Math.min(100, (lvl.totalSize / maxDepthSize) * 100);
                    return (
                      <button
                        key={`bid-${lvl.price}`}
                        type="button"
                        onClick={() => {
                          setOrderType('LIMIT');
                          setLimitPrice(String(lvl.price));
                        }}
                        className="relative flex w-full items-center justify-between px-4 py-1.5 font-mono text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span
                          aria-hidden="true"
                          style={{ width: `${widthPct}%` }}
                          className="pointer-events-none absolute inset-y-0 right-0 bg-emerald-500/10"
                        />
                        <span className="relative text-emerald-600 dark:text-emerald-400">
                          {formatPrice(lvl.price)}
                        </span>
                        <span className="relative text-slate-700 dark:text-slate-300">
                          {formatQty(lvl.size)}
                        </span>
                        <span className="relative text-slate-500 dark:text-slate-400">
                          {formatQty(lvl.totalSize)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Order Ticket · {selectedPair}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Available: <span className="font-mono">{formatUsd(state.cashUsdc)}</span> USDC ·{' '}
                  <span className="font-mono">{formatQty(heldQty)}</span> {baseAsset}
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(['LIMIT', 'MARKET'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      orderType === type
                        ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {type === 'LIMIT' ? 'Limit' : 'Market'}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    side === 'BUY'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  Buy {baseAsset}
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    side === 'SELL'
                      ? 'bg-red-600 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  Sell {baseAsset}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sodex-limit-price"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    {orderType === 'LIMIT' ? 'Limit Price (USDC)' : 'Estimated Market Fill'}
                  </label>
                  <input
                    id="sodex-limit-price"
                    type="number"
                    step="any"
                    disabled={orderType === 'MARKET'}
                    value={orderType === 'MARKET' ? liveMark : limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sodex-qty"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Quantity ({baseAsset})
                  </label>
                  <input
                    id="sodex-qty"
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyPercentage(pct)}
                      className="rounded-md border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>

                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Notional {formatUsd(estimatedNotional)} · Operator Rebate +{formatUsd(estRebate)}
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  {errorMsg}
                </div>
              )}

              {feedbackMsg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {feedbackMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
              >
                {submitting
                  ? 'Settling on ValueChain L1...'
                  : `${side === 'BUY' ? 'Buy' : 'Sell'} ${baseAsset} on SoDEX`}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Recent SoDEX Executions
              </h2>
            </div>

            {sodexReceipts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No SoDEX fills yet. Submit an order above to settle on ValueChain L1.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-5 py-2.5">Pair / Side</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3 py-2.5 text-right">Fill Price</th>
                      <th className="px-3 py-2.5 text-right">Notional</th>
                      <th className="px-3 py-2.5 text-right">Rebate</th>
                      <th className="px-5 py-2.5 text-right">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sodexReceipts.slice(0, 6).map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-2.5 font-mono">
                          <span className="font-semibold text-slate-900 dark:text-white">{r.asset}</span>{' '}
                          <span
                            className={
                              r.side === 'BUY'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {r.side}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {formatRelativeTime(r.timestamp)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatQty(r.quantity)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatPrice(r.executionPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-950 dark:text-white">
                          {formatUsd(r.notionalUsd)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          +{formatUsd(r.operatorFeeUsd)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                          {shortenHash(r.txHash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
