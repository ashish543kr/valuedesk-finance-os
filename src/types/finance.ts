export type SsiSymbol = 'MAG7.ssi' | 'DEFI.ssi' | 'MEME.ssi' | 'USSI';

export type SodexPair =
  | 'MAG7.ssi/USDC'
  | 'DEFI.ssi/USDC'
  | 'MEME.ssi/USDC'
  | 'USSI/USDC'
  | 'BTC/USDC'
  | 'ETH/USDC'
  | 'SOL/USDC'
  | 'SOSO/USDC';

export type WorkspaceTab = 'overview' | 'sodex' | 'agents' | 'treasury';

export type ChartTimeframe = '1D' | '1W' | '1M' | 'YTD';

export interface SpotAssetPrice {
  symbol: string;
  name: string;
  price: number;
  change24hPct: number;
  volume24hUsd: number;
  source: 'binance' | 'coingecko' | 'snapshot';
}

export interface IndexConstituent {
  symbol: string;
  name: string;
  weight: number;
  color: string;
}

export interface SsiIndexDefinition {
  symbol: SsiSymbol;
  name: string;
  category: string;
  description: string;
  custodyPartner: string;
  rebalanceCadence: string;
  managementFeeBps: number;
  baseNavRef: number;
  yieldAprPct: number;
  constituents: IndexConstituent[];
}

export interface SsiIndexQuote {
  symbol: SsiSymbol;
  name: string;
  category: string;
  description: string;
  custodyPartner: string;
  rebalanceCadence: string;
  managementFeeBps: number;
  nav: number;
  change24hPct: number;
  yieldAprPct: number;
  tvlUsd: number;
  constituents: Array<
    IndexConstituent & {
      spotPrice: number;
      change24hPct: number;
    }
  >;
}

export interface HoldingPosition {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  category: 'ssi' | 'spot';
}

export interface SettlementReceipt {
  id: string;
  timestamp: string;
  type: 'SSI_MINT' | 'SSI_REDEEM' | 'SODEX_BUY' | 'SODEX_SELL' | 'AGENT_REBALANCE' | 'CLIENT_DEPOSIT';
  asset: string;
  side: 'MINT' | 'REDEEM' | 'BUY' | 'SELL' | 'REBALANCE' | 'DEPOSIT';
  quantity: number;
  executionPrice: number;
  notionalUsd: number;
  operatorFeeUsd: number;
  protocolFeeUsd: number;
  txHash: string;
  blockNumber: number;
  finalityMs: number;
  venue: 'SSI Protocol' | 'SoDEX L1' | 'Agent Engine' | 'ValueChain Vault';
  note: string;
}

export interface AutonomousAgent {
  id: string;
  name: string;
  strategyType: 'carry' | 'momentum' | 'rotation' | 'protection';
  targetAsset: SsiSymbol;
  triggerDescription: string;
  thresholdPct: number;
  allocationUsdc: number;
  enabled: boolean;
  executionsCount: number;
  revenueGeneratedUsd: number;
  lastRunAt: string | null;
  lastActionSummary: string;
}

export interface ClientMandate {
  id: string;
  clientName: string;
  strategyLabel: string;
  allocatedIndex: SsiSymbol;
  principalUsd: number;
  managementFeeBps: number;
  carryPct: number;
  createdAt: string;
  status: 'Active' | 'Paused';
}

export interface DeskState {
  cashUsdc: number;
  initialCapitalUsd: number;
  positions: Record<string, HoldingPosition>;
  operatorRevenueUsd: {
    managementFees: number;
    wrapSpreadFees: number;
    sodexRebates: number;
    performanceCarry: number;
  };
  agents: AutonomousAgent[];
  mandates: ClientMandate[];
  receipts: SettlementReceipt[];
  latestBlockNumber: number;
}

export interface PortfolioSummary {
  totalAumUsd: number;
  investedValueUsd: number;
  cashUsdc: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  totalOperatorRevenueUsd: number;
  annualizedRunRateUsd: number;
  clientMandateCount: number;
  activeAgentCount: number;
  settlementVolumeUsd: number;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  impactedIndex: SsiSymbol;
  sentiment: 'Bullish' | 'Neutral' | 'Cautious';
  summary: string;
}

export interface OrderbookLevel {
  price: number;
  size: number;
  totalSize: number;
  notionalUsd: number;
}

export interface OrderbookSnapshot {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  midPrice: number;
  spreadUsd: number;
  spreadBps: number;
  fundingRatePct: number;
}

export interface NavHistoryPoint {
  label: string;
  portfolioNav: number;
  benchmarkNav: number;
}

export interface AiStrategyProposal {
  marketRegime: string;
  confidencePct: number;
  thesis: string;
  recommendedActions: Array<{
    targetAsset: SsiSymbol;
    actionType: 'MINT' | 'REDEEM' | 'BUY' | 'SELL';
    allocationUsdc: number;
    expectedYieldImpact: string;
    rationale: string;
  }>;
  riskWarnings: string[];
  generatedAt: string;
}

export interface AzexExecutableAction {
  type: 'SSI_TRADE' | 'RUN_AGENTS';
  label: string;
  symbol?: SsiSymbol;
  side?: 'MINT' | 'REDEEM';
  amountInput?: number;
}

export interface AzexChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAction?: AzexExecutableAction | null;
  actionExecuted?: boolean;
}

export type StressScenarioId = 'bull_breakout' | 'macro_shock' | 'defi_rotation' | 'carry_spike';

export interface StressScenarioResult {
  id: StressScenarioId;
  name: string;
  description: string;
  projectedAumUsd: number;
  pnlImpactUsd: number;
  pnlImpactPct: number;
  ussiHedgeContributionUsd: number;
  projectedAnnualFeeUsd: number;
}

export type AllocationPresetId = 'balanced_alpha' | 'carry_fortress' | 'growth_convex';

export interface RebalanceLeg {
  symbol: SsiSymbol;
  currentUsd: number;
  targetUsd: number;
  deltaUsd: number;
  side: 'MINT' | 'REDEEM';
  amountInput: number;
}

export interface SoSoValueTelemetry {
  connected: boolean;
  source: 'sosovalue-openapi' | 'spot-fallback';
  btcEtfDailyNetInflowUsd: number | null;
  ethEtfDailyNetInflowUsd: number | null;
  btcEtfTotalNetAssetsUsd: number | null;
  ethEtfTotalNetAssetsUsd: number | null;
  mag7ConstituentsCount: number | null;
  lastSyncedAt: string;
  message: string;
}
