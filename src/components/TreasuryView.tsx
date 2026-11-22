import { useMemo, useState } from 'react';
import { Activity, Cpu, Download, Plus, RotateCcw, User } from 'lucide-react';
import {
  DeskState,
  PortfolioSummary,
  SpotAssetPrice,
  SsiIndexQuote,
  SsiSymbol,
  StressScenarioId,
} from '../types/finance';
import { runPortfolioStressTest } from '../domain/financeEngine';
import { formatPct, formatPrice, formatQty, formatRelativeTime, formatUsd, shortenHash } from '../utils/formatters';

interface TreasuryViewProps {
  state: DeskState;
  summary: PortfolioSummary;
  spotPrices: Record<string, SpotAssetPrice>;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  onOpenMandateModal: () => void;
  onResetWorkspace: () => Promise<void>;
}

const SCENARIO_OPTIONS: Array<{ id: StressScenarioId; label: string }> = [
  { id: 'bull_breakout', label: 'ETF Breakout (+18%)' },
  { id: 'macro_shock', label: 'Macro Shock (-22%)' },
  { id: 'defi_rotation', label: 'DeFi Rally (+26%)' },
  { id: 'carry_spike', label: 'Funding Spike' },
];

export function TreasuryView({
  state,
  summary,
  spotPrices,
  indexQuotes,
  onOpenMandateModal,
  onResetWorkspace,
}: TreasuryViewProps) {
  const [venueFilter, setVenueFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [scenarioId, setScenarioId] = useState<StressScenarioId>('macro_shock');
  const [resetting, setResetting] = useState(false);
  const [nodeImgFailed, setNodeImgFailed] = useState(false);
  const [portraitImgFailed, setPortraitImgFailed] = useState(false);

  const stressResult = useMemo(
    () => runPortfolioStressTest(state, spotPrices, indexQuotes, scenarioId),
    [state, spotPrices, indexQuotes, scenarioId]
  );

  const revenueStreams = [
    {
      label: 'Management Fees',
      value: state.operatorRevenueUsd.managementFees,
      note: 'Annualized AUM advisory accrual',
    },
    {
      label: 'SSI Wrap Spread',
      value: state.operatorRevenueUsd.wrapSpreadFees,
      note: '55% operator share on basket mint/redeem',
    },
    {
      label: 'Performance Carry',
      value: state.operatorRevenueUsd.performanceCarry,
      note: 'High-watermark realized profit share',
    },
    {
      label: 'SoDEX Maker Rebates',
      value: state.operatorRevenueUsd.sodexRebates,
      note: '4 bps liquidity routing rebate',
    },
  ];

  const totalRev = Math.max(1, summary.totalOperatorRevenueUsd);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.receipts.filter((r) => {
      const venueOk = venueFilter === 'ALL' || r.venue === venueFilter;
      const textOk =
        !q ||
        r.asset.toLowerCase().includes(q) ||
        r.txHash.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q);
      return venueOk && textOk;
    });
  }, [state.receipts, venueFilter, searchQuery]);

  function handleExportCsv() {
    const headers = [
      'Timestamp',
      'Venue',
      'Type',
      'Asset',
      'Quantity',
      'ExecutionPrice',
      'NotionalUSD',
      'OperatorFeeUSD',
      'BlockNumber',
      'TxHash',
    ];
    const rows = filteredReceipts.map((r) => [
      r.timestamp,
      r.venue,
      r.type,
      r.asset,
      r.quantity,
      r.executionPrice,
      r.notionalUsd,
      r.operatorFeeUsd,
      r.blockNumber,
      r.txHash,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valuedesk-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleReset() {
    setResetting(true);
    try {
      await onResetWorkspace();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Business Revenue &amp; ValueChain Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track solo-operator fee streams, onboard client mandates, and audit ValueChain L1 settlement receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resetting ? 'Resetting...' : 'Reset Demo'}
          </button>
          <button
            type="button"
            onClick={onOpenMandateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Client Mandate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Operator Fee Attribution
            </h2>
            <span className="font-mono text-lg font-semibold text-slate-950 dark:text-white">
              {formatUsd(summary.totalOperatorRevenueUsd)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            100% solo-operator net cashflow before zero-headcount infrastructure overhead.
          </p>

          <div className="mt-5 space-y-4">
            {revenueStreams.map((stream) => {
              const sharePct = Math.round((stream.value / totalRev) * 100);
              return (
                <div key={stream.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {stream.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-950 dark:text-white">
                      {formatUsd(stream.value)} ({sharePct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-orange-600"
                      style={{ width: `${Math.max(4, sharePct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {stream.note}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                Active Client Vault Mandates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                External treasury capital managed under automated SSI index sleeves.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {state.mandates.length} vaults
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3">Client / Strategy</th>
                  <th className="px-3 py-3">Index Sleeve</th>
                  <th className="px-3 py-3 text-right">Principal</th>
                  <th className="px-3 py-3 text-right">Fee / Carry</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {state.mandates.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-950 dark:text-white">{m.clientName}</div>
                      <div className="text-slate-500 dark:text-slate-400">{m.strategyLabel}</div>
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {m.allocatedIndex}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-950 dark:text-white">
                      {formatUsd(m.principalUsd)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {m.managementFeeBps} bps / {m.carryPct}%
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="relative min-h-[200px] bg-slate-100 sm:col-span-2 dark:bg-slate-800">
            {!nodeImgFailed ? (
              <img
                src="/src/assets/images/valuechain_l1_node_1795281324725.jpg"
                alt="ValueChain L1 settlement engine hardware node"
                referrerPolicy="no-referrer"
                onError={() => setNodeImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Cpu className="h-12 w-12 text-slate-400" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between p-5 sm:col-span-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Infrastructure · ValueChain L1 &amp; SSI Protocol
              </div>
              <h2 className="mt-1 font-display text-base font-semibold text-slate-950 dark:text-white">
                Deterministic Basket Settlement &amp; Custody
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Every wrap, SoDEX orderbook fill, and autonomous rebalance settles atomically on ValueChain L1 with institutional MPC verification from Cobo and Ceffu.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 font-mono text-xs dark:border-slate-800">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Finality</div>
                <div className="font-semibold text-slate-950 dark:text-white">~390ms</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Throughput</div>
                <div className="font-semibold text-slate-950 dark:text-white">14,820 TPS</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Latest Block</div>
                <div className="font-semibold text-slate-950 dark:text-white">#{state.latestBlockNumber}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {!portraitImgFailed ? (
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-21_at_10.57.28_PM_07c51748.jpeg"
                alt="Ashish Kumar, B.Tech CSE 3rd Year and Principal Architect of Team AZEX"
                referrerPolicy="no-referrer"
                onError={() => setPortraitImgFailed(true)}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-10 w-10 text-slate-400" />
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Team AZEX · B.Tech CSE (3rd Year) · AI/ML &amp; Web3
            </div>
            <h2 className="mt-0.5 font-display text-lg font-bold text-slate-950 dark:text-white">
              Ashish Kumar
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Third-year B.Tech Computer Science &amp; Engineering student passionate about AI/ML, full-stack web architecture, and quantitative research — creator of ValueDesk and AZEX Copilot.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                Market Scenario Stress-Test &amp; Fee Forecaster
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Simulate live SSI vault sensitivity, USSI delta-neutral hedge cushioning, and solo-operator fee ARR across market regimes.
            </p>
          </div>

          <div
            role="group"
            aria-label="Select stress test scenario"
            className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {SCENARIO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScenarioId(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  scenarioId === opt.id
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Projected Vault AUM</div>
            <div className="mt-1 font-mono text-xl font-semibold text-slate-950 dark:text-white">
              {formatUsd(stressResult.projectedAumUsd)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {stressResult.name}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Simulated PnL Impact</div>
            <div
              className={`mt-1 font-mono text-xl font-semibold ${
                stressResult.pnlImpactUsd >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {stressResult.pnlImpactUsd >= 0 ? '+' : ''}
              {formatUsd(stressResult.pnlImpactUsd)}
            </div>
            <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
              {formatPct(stressResult.pnlImpactPct)} regime move
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">USSI Carry Hedge Buffer</div>
            <div className="mt-1 font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatUsd(stressResult.ussiHedgeContributionUsd)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Delta-neutral stabilizer
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Projected Operator ARR</div>
            <div className="mt-1 font-mono text-xl font-semibold text-slate-950 dark:text-white">
              {formatUsd(stressResult.projectedAnnualFeeUsd)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {stressResult.description}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              ValueChain L1 Settlement Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable execution receipts across SSI Protocol, SoDEX CLOB, and Autonomous Agents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              aria-label="Filter settlement receipts"
              placeholder="Search asset or tx hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <select
              aria-label="Filter by settlement venue"
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="ALL">All Venues</option>
              <option value="SSI Protocol">SSI Protocol</option>
              <option value="SoDEX L1">SoDEX L1</option>
              <option value="Agent Engine">Agent Engine</option>
              <option value="ValueChain Vault">ValueChain Vault</option>
            </select>
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No settlement receipts match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3">Time / Venue</th>
                  <th className="px-3 py-3">Operation</th>
                  <th className="px-3 py-3 text-right">Quantity</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Notional</th>
                  <th className="px-3 py-3 text-right">Operator Fee</th>
                  <th className="px-5 py-3 text-right">Block / Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{r.venue}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(r.timestamp)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono font-semibold text-slate-950 dark:text-white">
                        {r.side} {r.asset}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">{r.note}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatQty(r.quantity)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatPrice(r.executionPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-950 dark:text-white">
                      {formatUsd(r.notionalUsd)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatUsd(r.operatorFeeUsd)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      <div>#{r.blockNumber} · {r.finalityMs}ms</div>
                      <div>{shortenHash(r.txHash)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
