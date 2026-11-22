import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import {
  AllocationPresetId,
  DeskState,
  MarketNewsItem,
  PortfolioSummary,
  SodexPair,
  SoSoValueTelemetry,
  SpotAssetPrice,
  SsiIndexQuote,
  SsiSymbol,
  WorkspaceTab,
} from './types/finance';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/OverviewView';
import { SodexDeskView } from './components/SodexDeskView';
import { AgentsView } from './components/AgentsView';
import { TreasuryView } from './components/TreasuryView';
import { MintRedeemModal } from './components/MintRedeemModal';
import { NewMandateModal } from './components/NewMandateModal';
import { AzexAssistant } from './components/AzexAssistant';

interface OverviewPayload {
  spotPrices: Record<string, SpotAssetPrice>;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  state: DeskState;
  summary: PortfolioSummary;
  news: MarketNewsItem[];
  sosoValueFeed: SoSoValueTelemetry;
  valueChain: {
    chainName: string;
    blockNumber: number;
    finalityMs: number;
    tps: number;
    feedSource: 'live' | 'snapshot';
  };
}

interface StreamTickPayload {
  spotPrices: Record<string, SpotAssetPrice>;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  summary: PortfolioSummary;
  blockNumber: number;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [selectedPair, setSelectedPair] = useState<SodexPair>('MAG7.ssi/USDC');
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [mintInitialSymbol, setMintInitialSymbol] = useState<SsiSymbol>('MAG7.ssi');
  const [mandateModalOpen, setMandateModalOpen] = useState(false);
  const [azexOpen, setAzexOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchOverview = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const resp = await fetch('/api/overview');
      if (!resp.ok) {
        throw new Error('Failed to load ValueDesk telemetry.');
      }
      const payload = (await resp.json()) as OverviewPayload;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading workspace.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const es = new EventSource('/api/stream');
    es.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data) as StreamTickPayload;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            spotPrices: tick.spotPrices,
            indexQuotes: tick.indexQuotes,
            summary: tick.summary,
            valueChain: {
              ...prev.valueChain,
              blockNumber: tick.blockNumber,
              feedSource: Object.values(tick.spotPrices).some((s) => s.source !== 'snapshot')
                ? 'live'
                : prev.valueChain.feedSource,
            },
          };
        });
      } catch {
      }
    };
    return () => {
      es.close();
    };
  }, [fetchOverview]);

  async function handleSsiTrade(payload: {
    symbol: SsiSymbol;
    side: 'MINT' | 'REDEEM';
    amountInput: number;
  }) {
    const resp = await fetch('/api/trade/ssi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resJson = (await resp.json()) as { error?: string };
    if (!resp.ok) {
      throw new Error(resJson.error || 'SSI trade failed.');
    }
    await fetchOverview(false);
  }

  async function handleSodexOrder(payload: {
    pair: SodexPair;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    limitPrice?: number;
  }) {
    const resp = await fetch('/api/trade/sodex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resJson = (await resp.json()) as { error?: string };
    if (!resp.ok) {
      throw new Error(resJson.error || 'SoDEX execution failed.');
    }
    await fetchOverview(false);
  }

  async function handleToggleAgent(agentId: string) {
    const resp = await fetch('/api/agents/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    if (!resp.ok) throw new Error('Unable to toggle agent.');
    await fetchOverview(false);
  }

  async function handleRunAgentCycle() {
    const resp = await fetch('/api/agents/run', { method: 'POST' });
    const resJson = (await resp.json()) as { executedAgents?: string[]; error?: string };
    if (!resp.ok) throw new Error(resJson.error || 'Agent cycle failed.');
    await fetchOverview(false);
    return { executedAgents: resJson.executedAgents ?? [] };
  }

  async function handleCreateMandate(payload: {
    clientName: string;
    strategyLabel: string;
    allocatedIndex: SsiSymbol;
    principalUsd: number;
    managementFeeBps: number;
    carryPct: number;
  }) {
    const resp = await fetch('/api/mandates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resJson = (await resp.json()) as { error?: string };
    if (!resp.ok) throw new Error(resJson.error || 'Mandate creation failed.');
    await fetchOverview(false);
  }

  async function handleResetWorkspace() {
    const resp = await fetch('/api/reset', { method: 'POST' });
    if (!resp.ok) throw new Error('Unable to reset workspace.');
    await fetchOverview(false);
  }

  async function handleBatchRebalance(presetId: AllocationPresetId) {
    const resp = await fetch('/api/portfolio/rebalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId }),
    });
    const resJson = (await resp.json()) as { legsExecuted?: number; error?: string };
    if (!resp.ok) throw new Error(resJson.error || 'Batch rebalance failed.');
    await fetchOverview(false);
    return { legsExecuted: resJson.legsExecuted ?? 0 };
  }

  function openMintModalFor(symbol: SsiSymbol = 'MAG7.ssi') {
    setMintInitialSymbol(symbol);
    setMintModalOpen(true);
  }

  function openPairOnSodex(pair: SodexPair) {
    setSelectedPair(pair);
    setActiveTab('sodex');
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenMintModal={() => openMintModalFor('MAG7.ssi')}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                SoSoValue Ecosystem
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {data ? `${data.valueChain.chainName} #${data.valueChain.blockNumber}` : 'ValueChain L1'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {data?.valueChain.feedSource === 'live' ? 'Real-Time Live Stream' : 'Snapshot Feed'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => fetchOverview(true)}
                className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {loading || !data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                ))}
              </div>
              <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'overview' && (
                  <OverviewView
                    summary={data.summary}
                    state={data.state}
                    indexQuotes={data.indexQuotes}
                    spotPrices={data.spotPrices}
                    news={data.news}
                    sosoValueFeed={data.sosoValueFeed}
                    onOpenMintModal={(sym) => openMintModalFor(sym ?? 'MAG7.ssi')}
                    onTradeOnSodex={openPairOnSodex}
                    onBatchRebalance={handleBatchRebalance}
                    onOpenAzex={() => setAzexOpen(true)}
                    onRefreshMarket={() => fetchOverview(true)}
                    isRefreshing={refreshing}
                  />
                )}

                {activeTab === 'sodex' && (
                  <SodexDeskView
                    selectedPair={selectedPair}
                    onSelectPair={setSelectedPair}
                    state={data.state}
                    spotPrices={data.spotPrices}
                    indexQuotes={data.indexQuotes}
                    onExecuteOrder={handleSodexOrder}
                  />
                )}

                {activeTab === 'agents' && (
                  <AgentsView
                    state={data.state}
                    indexQuotes={data.indexQuotes}
                    onToggleAgent={handleToggleAgent}
                    onRunAgentCycle={handleRunAgentCycle}
                    onExecuteProposalAction={handleSsiTrade}
                  />
                )}

                {activeTab === 'treasury' && (
                  <TreasuryView
                    state={data.state}
                    summary={data.summary}
                    spotPrices={data.spotPrices}
                    indexQuotes={data.indexQuotes}
                    onOpenMandateModal={() => setMandateModalOpen(true)}
                    onResetWorkspace={handleResetWorkspace}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white pt-5 pb-20 sm:pb-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6 sm:pr-48 lg:px-8 lg:pr-52 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">ValueDesk</span>
              <span aria-hidden="true">·</span>
              <span>Built by Team AZEX</span>
              <span aria-hidden="true">·</span>
              <span>Lead Builder: Ashish Kumar</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/SoSoValueLabs/ssi-protocol"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-slate-200"
              >
                SSI Protocol GitHub
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="https://discord.gg/HQuGhhkhUW"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-slate-200"
              >
                SoSoValue Community
              </a>
            </div>
          </div>
        </footer>

        {data && (
          <>
            <MintRedeemModal
              isOpen={mintModalOpen}
              initialSymbol={mintInitialSymbol}
              state={data.state}
              indexQuotes={data.indexQuotes}
              onClose={() => setMintModalOpen(false)}
              onSubmitTrade={handleSsiTrade}
            />
            <NewMandateModal
              isOpen={mandateModalOpen}
              onClose={() => setMandateModalOpen(false)}
              onCreateMandate={handleCreateMandate}
            />
          </>
        )}

        <AzexAssistant
          isOpen={azexOpen}
          onOpenChange={setAzexOpen}
          summary={data?.summary ?? null}
          latestBlockNumber={data?.valueChain.blockNumber ?? 18492104}
          onExecuteSsiTrade={handleSsiTrade}
          onRunAgentCycle={handleRunAgentCycle}
        />
      </div>
    </MotionConfig>
  );
}
