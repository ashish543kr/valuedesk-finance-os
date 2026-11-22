import {
  AllocationPresetId,
  AutonomousAgent,
  ChartTimeframe,
  ClientMandate,
  DeskState,
  HoldingPosition,
  NavHistoryPoint,
  OrderbookLevel,
  OrderbookSnapshot,
  PortfolioSummary,
  RebalanceLeg,
  SettlementReceipt,
  SodexPair,
  SpotAssetPrice,
  SsiIndexDefinition,
  SsiIndexQuote,
  SsiSymbol,
  StressScenarioId,
  StressScenarioResult,
} from '../types/finance';

export const BASE_SPOT_SNAPSHOT: Record<string, SpotAssetPrice> = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', price: 59500, change24hPct: 2.34, volume24hUsd: 38400000000, source: 'snapshot' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 1650, change24hPct: 3.12, volume24hUsd: 19200000000, source: 'snapshot' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 69.5, change24hPct: 4.85, volume24hUsd: 7850000000, source: 'snapshot' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 545.0, change24hPct: 1.42, volume24hUsd: 2150000000, source: 'snapshot' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.92, change24hPct: 5.2, volume24hUsd: 6420000000, source: 'snapshot' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', price: 6.5, change24hPct: 2.95, volume24hUsd: 840000000, source: 'snapshot' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.142, change24hPct: 1.88, volume24hUsd: 1410000000, source: 'snapshot' },
  UNI: { symbol: 'UNI', name: 'Uniswap', price: 5.4, change24hPct: 3.64, volume24hUsd: 520000000, source: 'snapshot' },
  AAVE: { symbol: 'AAVE', name: 'Aave', price: 142.0, change24hPct: 4.18, volume24hUsd: 485000000, source: 'snapshot' },
  LINK: { symbol: 'LINK', name: 'Chainlink', price: 11.2, change24hPct: 2.75, volume24hUsd: 690000000, source: 'snapshot' },
  MKR: { symbol: 'MKR', name: 'Maker', price: 1480, change24hPct: 1.95, volume24hUsd: 210000000, source: 'snapshot' },
  LDO: { symbol: 'LDO', name: 'Lido DAO', price: 1.05, change24hPct: 2.41, volume24hUsd: 190000000, source: 'snapshot' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.145, change24hPct: 6.4, volume24hUsd: 5300000000, source: 'snapshot' },
  PEPE: { symbol: 'PEPE', name: 'Pepe', price: 0.0000082, change24hPct: 8.15, volume24hUsd: 3120000000, source: 'snapshot' },
  WIF: { symbol: 'WIF', name: 'dogwifhat', price: 0.64, change24hPct: -1.45, volume24hUsd: 920000000, source: 'snapshot' },
  BONK: { symbol: 'BONK', name: 'Bonk', price: 0.0000148, change24hPct: 4.92, volume24hUsd: 860000000, source: 'snapshot' },
  SOSO: { symbol: 'SOSO', name: 'SoSoValue', price: 0.86, change24hPct: 6.75, volume24hUsd: 145000000, source: 'snapshot' },
  USDC: { symbol: 'USDC', name: 'USD Coin', price: 1.0, change24hPct: 0.0, volume24hUsd: 9500000000, source: 'snapshot' },
};

export const SSI_INDEX_CATALOG: SsiIndexDefinition[] = [
  {
    symbol: 'MAG7.ssi',
    name: 'SoSoValue MAG7 Index',
    category: 'Large-Cap Core',
    description: 'Top 7 highest-conviction Layer-1 and market-cap consensus assets with monthly algorithmic rebalancing.',
    custodyPartner: 'Cobo & Ceffu MPC',
    rebalanceCadence: 'Monthly',
    managementFeeBps: 35,
    baseNavRef: 1.24,
    yieldAprPct: 4.2,
    constituents: [
      { symbol: 'BTC', name: 'Bitcoin', weight: 0.38, color: '#EA580C' },
      { symbol: 'ETH', name: 'Ethereum', weight: 0.24, color: '#2563EB' },
      { symbol: 'SOL', name: 'Solana', weight: 0.14, color: '#0D9488' },
      { symbol: 'BNB', name: 'BNB', weight: 0.09, color: '#D97706' },
      { symbol: 'XRP', name: 'XRP', weight: 0.07, color: '#475569' },
      { symbol: 'AVAX', name: 'Avalanche', weight: 0.04, color: '#DC2626' },
      { symbol: 'ADA', name: 'Cardano', weight: 0.04, color: '#4F46E5' },
    ],
  },
  {
    symbol: 'DEFI.ssi',
    name: 'SoSoValue DeFi Bluechip',
    category: 'Sector Growth',
    description: 'Revenue-generating decentralized liquidity, lending, oracle, and liquid staking protocols.',
    custodyPartner: 'Ceffu Institutional',
    rebalanceCadence: 'Bi-Weekly',
    managementFeeBps: 45,
    baseNavRef: 1.08,
    yieldAprPct: 9.6,
    constituents: [
      { symbol: 'UNI', name: 'Uniswap', weight: 0.28, color: '#EA580C' },
      { symbol: 'AAVE', name: 'Aave', weight: 0.26, color: '#0284C7' },
      { symbol: 'LINK', name: 'Chainlink', weight: 0.22, color: '#2563EB' },
      { symbol: 'MKR', name: 'Maker', weight: 0.14, color: '#0D9488' },
      { symbol: 'LDO', name: 'Lido DAO', weight: 0.1, color: '#64748B' },
    ],
  },
  {
    symbol: 'MEME.ssi',
    name: 'SoSoValue Meme Liquidity',
    category: 'High-Beta Alpha',
    description: 'High-velocity cultural liquidity basket weighted by 30-day SoDEX & spot orderbook turnover.',
    custodyPartner: 'Cobo Custody',
    rebalanceCadence: 'Weekly',
    managementFeeBps: 60,
    baseNavRef: 0.94,
    yieldAprPct: 6.4,
    constituents: [
      { symbol: 'DOGE', name: 'Dogecoin', weight: 0.42, color: '#D97706' },
      { symbol: 'PEPE', name: 'Pepe', weight: 0.28, color: '#16A34A' },
      { symbol: 'WIF', name: 'dogwifhat', weight: 0.18, color: '#EA580C' },
      { symbol: 'BONK', name: 'Bonk', weight: 0.12, color: '#DC2626' },
    ],
  },
  {
    symbol: 'USSI',
    name: 'SoSoValue Delta-Neutral Yield',
    category: 'Market Neutral',
    description: 'Spot-plus-perp funding arbitrage vault capturing positive basis yield with capped drawdown.',
    custodyPartner: 'Cobo & ValueChain Vault',
    rebalanceCadence: 'Continuous',
    managementFeeBps: 25,
    baseNavRef: 1.05,
    yieldAprPct: 14.8,
    constituents: [
      { symbol: 'USDC', name: 'USD Coin', weight: 0.55, color: '#0284C7' },
      { symbol: 'BTC', name: 'Bitcoin Hedge', weight: 0.25, color: '#EA580C' },
      { symbol: 'ETH', name: 'Ethereum Hedge', weight: 0.2, color: '#475569' },
    ],
  },
];

export function calculateIndexNav(
  indexDef: SsiIndexDefinition,
  spotPrices: Record<string, SpotAssetPrice>,
  baselinePrices: Record<string, SpotAssetPrice> = BASE_SPOT_SNAPSHOT
): SsiIndexQuote {
  let weightedRatio = 0;
  let weightedChange24h = 0;

  const constituents = indexDef.constituents.map((item) => {
    const liveSpot = spotPrices[item.symbol] ?? BASE_SPOT_SNAPSHOT[item.symbol];
    const baseRef = baselinePrices[item.symbol]?.price ?? BASE_SPOT_SNAPSHOT[item.symbol]?.price ?? liveSpot.price;
    const priceRatio = baseRef > 0 ? liveSpot.price / baseRef : 1;
    weightedRatio += item.weight * priceRatio;
    weightedChange24h += item.weight * (indexDef.symbol === 'USSI' && item.symbol !== 'USDC' ? liveSpot.change24hPct * 0.08 : liveSpot.change24hPct);
    return {
      ...item,
      spotPrice: liveSpot.price,
      change24hPct: liveSpot.change24hPct,
    };
  });

  const nav = Number((indexDef.baseNavRef * weightedRatio).toFixed(4));
  const change24hPct = Number(
    (indexDef.symbol === 'USSI' ? Math.max(0.02, weightedChange24h + 0.04) : weightedChange24h).toFixed(2)
  );

  const tvlMap: Record<SsiSymbol, number> = {
    'MAG7.ssi': 148600000,
    'DEFI.ssi': 42300000,
    'MEME.ssi': 31850000,
    USSI: 89400000,
  };

  return {
    symbol: indexDef.symbol,
    name: indexDef.name,
    category: indexDef.category,
    description: indexDef.description,
    custodyPartner: indexDef.custodyPartner,
    rebalanceCadence: indexDef.rebalanceCadence,
    managementFeeBps: indexDef.managementFeeBps,
    nav,
    change24hPct,
    yieldAprPct: indexDef.yieldAprPct,
    tvlUsd: tvlMap[indexDef.symbol],
    constituents,
  };
}

export function buildAllIndexQuotes(
  spotPrices: Record<string, SpotAssetPrice>,
  baselinePrices: Record<string, SpotAssetPrice> = BASE_SPOT_SNAPSHOT
): Record<SsiSymbol, SsiIndexQuote> {
  const quotes = {} as Record<SsiSymbol, SsiIndexQuote>;
  for (const def of SSI_INDEX_CATALOG) {
    quotes[def.symbol] = calculateIndexNav(def, spotPrices, baselinePrices);
  }
  return quotes;
}

export function calculateMintRedeemQuote(params: {
  side: 'MINT' | 'REDEEM';
  amountInput: number;
  nav: number;
  feeBps: number;
  slippageBps?: number;
}) {
  const slippageBps = params.slippageBps ?? 12;
  const effectiveFeeRate = params.feeBps / 10000;
  const operatorShareRate = 0.55;
  const slippageRate = slippageBps / 10000;

  if (params.amountInput <= 0 || params.nav <= 0) {
    return {
      grossUsd: 0,
      netUsd: 0,
      tokenQuantity: 0,
      totalFeeUsd: 0,
      operatorFeeUsd: 0,
      protocolFeeUsd: 0,
      effectiveNav: params.nav,
    };
  }

  if (params.side === 'MINT') {
    const grossUsd = params.amountInput;
    const totalFeeUsd = Number((grossUsd * effectiveFeeRate).toFixed(2));
    const operatorFeeUsd = Number((totalFeeUsd * operatorShareRate).toFixed(2));
    const protocolFeeUsd = Number((totalFeeUsd - operatorFeeUsd).toFixed(2));
    const netUsd = grossUsd - totalFeeUsd;
    const effectiveNav = params.nav * (1 + slippageRate * 0.25);
    const tokenQuantity = Number((netUsd / effectiveNav).toFixed(4));

    return {
      grossUsd,
      netUsd: Number(netUsd.toFixed(2)),
      tokenQuantity,
      totalFeeUsd,
      operatorFeeUsd,
      protocolFeeUsd,
      effectiveNav: Number(effectiveNav.toFixed(4)),
    };
  }

  const tokenQuantity = params.amountInput;
  const effectiveNav = params.nav * (1 - slippageRate * 0.25);
  const grossUsd = Number((tokenQuantity * effectiveNav).toFixed(2));
  const totalFeeUsd = Number((grossUsd * effectiveFeeRate).toFixed(2));
  const operatorFeeUsd = Number((totalFeeUsd * operatorShareRate).toFixed(2));
  const protocolFeeUsd = Number((totalFeeUsd - operatorFeeUsd).toFixed(2));
  const netUsd = Number((grossUsd - totalFeeUsd).toFixed(2));

  return {
    grossUsd,
    netUsd,
    tokenQuantity,
    totalFeeUsd,
    operatorFeeUsd,
    protocolFeeUsd,
    effectiveNav: Number(effectiveNav.toFixed(4)),
  };
}

export function createInitialDeskState(): DeskState {
  const now = new Date();
  const t1 = new Date(now.getTime() - 1000 * 60 * 140).toISOString();
  const t2 = new Date(now.getTime() - 1000 * 60 * 68).toISOString();
  const t3 = new Date(now.getTime() - 1000 * 60 * 24).toISOString();

  const positions: Record<string, HoldingPosition> = {
    'MAG7.ssi': { symbol: 'MAG7.ssi', quantity: 78500, avgEntryPrice: 1.18, category: 'ssi' },
    'DEFI.ssi': { symbol: 'DEFI.ssi', quantity: 36200, avgEntryPrice: 1.02, category: 'ssi' },
    'MEME.ssi': { symbol: 'MEME.ssi', quantity: 21000, avgEntryPrice: 0.91, category: 'ssi' },
    USSI: { symbol: 'USSI', quantity: 58400, avgEntryPrice: 1.03, category: 'ssi' },
    ETH: { symbol: 'ETH', quantity: 4.5, avgEntryPrice: 1620, category: 'spot' },
    SOSO: { symbol: 'SOSO', quantity: 14500, avgEntryPrice: 0.78, category: 'spot' },
  };

  const agents: AutonomousAgent[] = [
    {
      id: 'agent-carry-guard',
      name: 'Delta-Neutral Carry Guard',
      strategyType: 'carry',
      targetAsset: 'USSI',
      triggerDescription: 'Routes idle USDC above $35,000 into USSI when funding APR exceeds 11.5%.',
      thresholdPct: 11.5,
      allocationUsdc: 6000,
      enabled: true,
      executionsCount: 14,
      revenueGeneratedUsd: 1284.5,
      lastRunAt: t2,
      lastActionSummary: 'Allocated $5,200 USDC into USSI at 14.8% basis APR.',
    },
    {
      id: 'agent-mag7-momentum',
      name: 'MAG7 Momentum Rebalancer',
      strategyType: 'momentum',
      targetAsset: 'MAG7.ssi',
      triggerDescription: 'Mints MAG7.ssi when 24h constituent basket momentum exceeds +1.5%.',
      thresholdPct: 1.5,
      allocationUsdc: 5000,
      enabled: true,
      executionsCount: 9,
      revenueGeneratedUsd: 942.2,
      lastRunAt: t1,
      lastActionSummary: 'Minted 4,032 MAG7.ssi after BTC/SOL breakout confirmation.',
    },
    {
      id: 'agent-defi-rotator',
      name: 'DeFi Fee-Capture Rotator',
      strategyType: 'rotation',
      targetAsset: 'DEFI.ssi',
      triggerDescription: 'Rotates into DEFI.ssi when bluechip protocol yield exceeds 8.0% APR.',
      thresholdPct: 8.0,
      allocationUsdc: 3500,
      enabled: true,
      executionsCount: 6,
      revenueGeneratedUsd: 518.4,
      lastRunAt: t3,
      lastActionSummary: 'Captured 3.8% sector rotation spread across UNI/AAVE basket.',
    },
    {
      id: 'agent-drawdown-shield',
      name: 'Volatility Drawdown Shield',
      strategyType: 'protection',
      targetAsset: 'MEME.ssi',
      triggerDescription: 'Redeems 25% of MEME.ssi into USDC if 24h volatility drops below -3.5%.',
      thresholdPct: -3.5,
      allocationUsdc: 4000,
      enabled: false,
      executionsCount: 3,
      revenueGeneratedUsd: 310.0,
      lastRunAt: null,
      lastActionSummary: 'Standby monitoring MEME.ssi intraday orderbook imbalance.',
    },
  ];

  const mandates: ClientMandate[] = [
    {
      id: 'mnd-01',
      clientName: 'Solstice Treasury Partners',
      strategyLabel: 'Institutional Core Index',
      allocatedIndex: 'MAG7.ssi',
      principalUsd: 95000,
      managementFeeBps: 75,
      carryPct: 10,
      createdAt: '2026-09-14T10:00:00.000Z',
      status: 'Active',
    },
    {
      id: 'mnd-02',
      clientName: 'Kestrel Family Office',
      strategyLabel: 'Delta-Neutral Dollar Yield',
      allocatedIndex: 'USSI',
      principalUsd: 62000,
      managementFeeBps: 50,
      carryPct: 12,
      createdAt: '2026-10-03T14:30:00.000Z',
      status: 'Active',
    },
    {
      id: 'mnd-03',
      clientName: 'Aether Protocol DAO',
      strategyLabel: 'DeFi Sector Treasury',
      allocatedIndex: 'DEFI.ssi',
      principalUsd: 38500,
      managementFeeBps: 85,
      carryPct: 15,
      createdAt: '2026-10-28T09:15:00.000Z',
      status: 'Active',
    },
  ];

  const receipts: SettlementReceipt[] = [
    {
      id: 'rcpt-1003',
      timestamp: t3,
      type: 'AGENT_REBALANCE',
      asset: 'DEFI.ssi',
      side: 'REBALANCE',
      quantity: 3240.74,
      executionPrice: 1.08,
      notionalUsd: 3500,
      operatorFeeUsd: 8.66,
      protocolFeeUsd: 7.09,
      txHash: '0x94c1f8a2b0d7e31904b77a32f9e0d28c14b9e6a1',
      blockNumber: 18492088,
      finalityMs: 410,
      venue: 'Agent Engine',
      note: 'DeFi Fee-Capture Rotator automated basket allocation',
    },
    {
      id: 'rcpt-1002',
      timestamp: t2,
      type: 'SSI_MINT',
      asset: 'USSI',
      side: 'MINT',
      quantity: 4952.38,
      executionPrice: 1.05,
      notionalUsd: 5200,
      operatorFeeUsd: 7.15,
      protocolFeeUsd: 5.85,
      txHash: '0x71e4b30c82a9114f6c2e78b09d441f82c3a7d502',
      blockNumber: 18491942,
      finalityMs: 390,
      venue: 'SSI Protocol',
      note: 'Delta-Neutral Carry Guard mint on ValueChain L1',
    },
    {
      id: 'rcpt-1001',
      timestamp: t1,
      type: 'SODEX_BUY',
      asset: 'ETH/USDC',
      side: 'BUY',
      quantity: 2.5,
      executionPrice: 3395.0,
      notionalUsd: 8487.5,
      operatorFeeUsd: 4.24,
      protocolFeeUsd: 2.12,
      txHash: '0x38d2a91f7c4e6b2083d19a55f2e8c710b6a4d913',
      blockNumber: 18491710,
      finalityMs: 365,
      venue: 'SoDEX L1',
      note: 'SoDEX Limit Fill · Maker Rebate Credited',
    },
  ];

  return {
    cashUsdc: 46850,
    initialCapitalUsd: 250000,
    positions,
    operatorRevenueUsd: {
      managementFees: 2140.8,
      wrapSpreadFees: 985.4,
      sodexRebates: 412.6,
      performanceCarry: 1645.2,
    },
    agents,
    mandates,
    receipts,
    latestBlockNumber: 18492104,
  };
}

export function getLiveAssetPrice(
  symbol: string,
  spotPrices: Record<string, SpotAssetPrice>,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): number {
  if (symbol in indexQuotes) {
    return indexQuotes[symbol as SsiSymbol].nav;
  }
  if (symbol in spotPrices) {
    return spotPrices[symbol].price;
  }
  return BASE_SPOT_SNAPSHOT[symbol]?.price ?? 1;
}

export function calculatePortfolioSummary(
  state: DeskState,
  spotPrices: Record<string, SpotAssetPrice>,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): PortfolioSummary {
  let investedValueUsd = 0;
  let costBasisUsd = 0;

  for (const pos of Object.values(state.positions)) {
    if (pos.quantity <= 0) continue;
    const livePrice = getLiveAssetPrice(pos.symbol, spotPrices, indexQuotes);
    investedValueUsd += pos.quantity * livePrice;
    costBasisUsd += pos.quantity * pos.avgEntryPrice;
  }

  const totalAumUsd = Number((state.cashUsdc + investedValueUsd).toFixed(2));
  const unrealizedPnlUsd = Number((investedValueUsd - costBasisUsd).toFixed(2));
  const unrealizedPnlPct = costBasisUsd > 0 ? Number(((unrealizedPnlUsd / costBasisUsd) * 100).toFixed(2)) : 0;

  const totalOperatorRevenueUsd = Number(
    (
      state.operatorRevenueUsd.managementFees +
      state.operatorRevenueUsd.wrapSpreadFees +
      state.operatorRevenueUsd.sodexRebates +
      state.operatorRevenueUsd.performanceCarry
    ).toFixed(2)
  );

  const annualizedRunRateUsd = Number(
    (
      state.mandates
        .filter((m) => m.status === 'Active')
        .reduce((acc, m) => acc + (m.principalUsd * m.managementFeeBps) / 10000, 0) +
      totalOperatorRevenueUsd * 4.5
    ).toFixed(2)
  );

  const settlementVolumeUsd = Number(
    state.receipts.reduce((acc, r) => acc + r.notionalUsd, 0).toFixed(2)
  );

  return {
    totalAumUsd,
    investedValueUsd: Number(investedValueUsd.toFixed(2)),
    cashUsdc: Number(state.cashUsdc.toFixed(2)),
    unrealizedPnlUsd,
    unrealizedPnlPct,
    totalOperatorRevenueUsd,
    annualizedRunRateUsd,
    clientMandateCount: state.mandates.filter((m) => m.status === 'Active').length,
    activeAgentCount: state.agents.filter((a) => a.enabled).length,
    settlementVolumeUsd,
  };
}

function generateDeterministicHash(seedNumber: number): string {
  const hex = Math.abs(seedNumber * 2654435761).toString(16).padStart(8, '0');
  const tail = Math.abs(seedNumber * 1597334677).toString(16).padStart(8, '0');
  return `0x${hex}${tail}${hex.slice(0, 8)}${tail.slice(0, 8)}${hex.slice(0, 8)}`;
}

export function executeSsiTrade(
  state: DeskState,
  params: {
    symbol: SsiSymbol;
    side: 'MINT' | 'REDEEM';
    amountInput: number;
    slippageBps?: number;
    note?: string;
    venue?: SettlementReceipt['venue'];
  },
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): { nextState: DeskState; receipt: SettlementReceipt } {
  const quoteInfo = indexQuotes[params.symbol];
  if (!quoteInfo) {
    throw new Error(`Unknown SSI index symbol: ${params.symbol}`);
  }
  if (!Number.isFinite(params.amountInput) || params.amountInput <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const calc = calculateMintRedeemQuote({
    side: params.side,
    amountInput: params.amountInput,
    nav: quoteInfo.nav,
    feeBps: quoteInfo.managementFeeBps,
    slippageBps: params.slippageBps ?? 12,
  });

  const existingPos = state.positions[params.symbol] ?? {
    symbol: params.symbol,
    quantity: 0,
    avgEntryPrice: quoteInfo.nav,
    category: 'ssi' as const,
  };

  let nextCash = state.cashUsdc;
  let nextQuantity = existingPos.quantity;
  let nextAvgEntry = existingPos.avgEntryPrice;

  if (params.side === 'MINT') {
    if (calc.grossUsd > state.cashUsdc) {
      throw new Error(`Insufficient USDC balance. Available: $${state.cashUsdc.toFixed(2)}`);
    }
    nextCash = Number((state.cashUsdc - calc.grossUsd).toFixed(2));
    const totalCost = existingPos.quantity * existingPos.avgEntryPrice + calc.netUsd;
    nextQuantity = Number((existingPos.quantity + calc.tokenQuantity).toFixed(4));
    nextAvgEntry = nextQuantity > 0 ? Number((totalCost / nextQuantity).toFixed(4)) : quoteInfo.nav;
  } else {
    if (calc.tokenQuantity > existingPos.quantity + 0.0001) {
      throw new Error(
        `Insufficient ${params.symbol} balance. Available: ${existingPos.quantity.toFixed(4)}`
      );
    }
    nextCash = Number((state.cashUsdc + calc.netUsd).toFixed(2));
    nextQuantity = Number(Math.max(0, existingPos.quantity - calc.tokenQuantity).toFixed(4));
  }

  const nextBlock = state.latestBlockNumber + 1;
  const receipt: SettlementReceipt = {
    id: `rcpt-${Date.now().toString().slice(-6)}-${nextBlock % 100}`,
    timestamp: new Date().toISOString(),
    type: params.side === 'MINT' ? 'SSI_MINT' : 'SSI_REDEEM',
    asset: params.symbol,
    side: params.side,
    quantity: calc.tokenQuantity,
    executionPrice: calc.effectiveNav,
    notionalUsd: calc.grossUsd,
    operatorFeeUsd: calc.operatorFeeUsd,
    protocolFeeUsd: calc.protocolFeeUsd,
    txHash: generateDeterministicHash(nextBlock + Math.round(calc.grossUsd)),
    blockNumber: nextBlock,
    finalityMs: 380 + (nextBlock % 65),
    venue: params.venue ?? 'SSI Protocol',
    note:
      params.note ??
      `${params.side === 'MINT' ? 'Minted' : 'Redeemed'} ${calc.tokenQuantity.toFixed(2)} ${params.symbol} via ValueChain`,
  };

  const nextState: DeskState = {
    ...state,
    cashUsdc: nextCash,
    latestBlockNumber: nextBlock,
    positions: {
      ...state.positions,
      [params.symbol]: {
        symbol: params.symbol,
        quantity: nextQuantity,
        avgEntryPrice: nextAvgEntry,
        category: 'ssi',
      },
    },
    operatorRevenueUsd: {
      ...state.operatorRevenueUsd,
      wrapSpreadFees: Number((state.operatorRevenueUsd.wrapSpreadFees + calc.operatorFeeUsd).toFixed(2)),
    },
    receipts: [receipt, ...state.receipts].slice(0, 60),
  };

  return { nextState, receipt };
}

export function executeSodexOrder(
  state: DeskState,
  params: {
    pair: SodexPair;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    limitPrice?: number;
  },
  spotPrices: Record<string, SpotAssetPrice>,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): { nextState: DeskState; receipt: SettlementReceipt } {
  const [baseAsset] = params.pair.split('/');
  const liveMark = getLiveAssetPrice(baseAsset, spotPrices, indexQuotes);
  const execPrice =
    params.orderType === 'LIMIT' && params.limitPrice && params.limitPrice > 0
      ? params.limitPrice
      : liveMark;

  if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
    throw new Error('Order quantity must be greater than zero.');
  }

  const notionalUsd = Number((params.quantity * execPrice).toFixed(2));
  const takerFeeBps = params.orderType === 'MARKET' ? 5 : 2;
  const protocolFeeUsd = Number(((notionalUsd * takerFeeBps) / 10000).toFixed(2));
  const operatorRebateUsd = Number((notionalUsd * 0.0004).toFixed(2));
  const isSsi = baseAsset in indexQuotes;
  const existing = state.positions[baseAsset] ?? {
    symbol: baseAsset,
    quantity: 0,
    avgEntryPrice: execPrice,
    category: isSsi ? ('ssi' as const) : ('spot' as const),
  };

  let nextCash = state.cashUsdc;
  let nextQuantity = existing.quantity;
  let nextAvgEntry = existing.avgEntryPrice;
  let realizedCarry = 0;

  if (params.side === 'BUY') {
    const totalDebit = notionalUsd + protocolFeeUsd;
    if (totalDebit > state.cashUsdc) {
      throw new Error(`Insufficient USDC for SoDEX order. Needed: $${totalDebit.toFixed(2)}`);
    }
    nextCash = Number((state.cashUsdc - totalDebit + operatorRebateUsd).toFixed(2));
    const totalCost = existing.quantity * existing.avgEntryPrice + notionalUsd;
    nextQuantity = Number((existing.quantity + params.quantity).toFixed(4));
    nextAvgEntry = nextQuantity > 0 ? Number((totalCost / nextQuantity).toFixed(4)) : execPrice;
  } else {
    if (params.quantity > existing.quantity + 0.0001) {
      throw new Error(`Insufficient ${baseAsset} position. Available: ${existing.quantity.toFixed(4)}`);
    }
    const pnl = (execPrice - existing.avgEntryPrice) * params.quantity;
    if (pnl > 0) {
      realizedCarry = Number((pnl * 0.1).toFixed(2));
    }
    nextCash = Number((state.cashUsdc + notionalUsd - protocolFeeUsd + operatorRebateUsd).toFixed(2));
    nextQuantity = Number(Math.max(0, existing.quantity - params.quantity).toFixed(4));
  }

  const nextBlock = state.latestBlockNumber + 1;
  const receipt: SettlementReceipt = {
    id: `rcpt-${Date.now().toString().slice(-6)}-${nextBlock % 100}`,
    timestamp: new Date().toISOString(),
    type: params.side === 'BUY' ? 'SODEX_BUY' : 'SODEX_SELL',
    asset: params.pair,
    side: params.side,
    quantity: Number(params.quantity.toFixed(4)),
    executionPrice: Number(execPrice.toFixed(execPrice < 1 ? 6 : 2)),
    notionalUsd,
    operatorFeeUsd: Number((operatorRebateUsd + realizedCarry).toFixed(2)),
    protocolFeeUsd,
    txHash: generateDeterministicHash(nextBlock + Math.round(notionalUsd)),
    blockNumber: nextBlock,
    finalityMs: 340 + (nextBlock % 50),
    venue: 'SoDEX L1',
    note: `${params.orderType} ${params.side} on SoDEX CLOB · Maker/Operator rebate settled`,
  };

  const nextState: DeskState = {
    ...state,
    cashUsdc: nextCash,
    latestBlockNumber: nextBlock,
    positions: {
      ...state.positions,
      [baseAsset]: {
        symbol: baseAsset,
        quantity: nextQuantity,
        avgEntryPrice: nextAvgEntry,
        category: existing.category,
      },
    },
    operatorRevenueUsd: {
      ...state.operatorRevenueUsd,
      sodexRebates: Number((state.operatorRevenueUsd.sodexRebates + operatorRebateUsd).toFixed(2)),
      performanceCarry: Number((state.operatorRevenueUsd.performanceCarry + realizedCarry).toFixed(2)),
    },
    receipts: [receipt, ...state.receipts].slice(0, 60),
  };

  return { nextState, receipt };
}

export function evaluateAgentCycle(
  state: DeskState,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): { nextState: DeskState; executedAgents: string[]; receipts: SettlementReceipt[] } {
  let workingState = state;
  const executedAgents: string[] = [];
  const createdReceipts: SettlementReceipt[] = [];
  const nowIso = new Date().toISOString();

  const updatedAgents = state.agents.map((agent) => {
    if (!agent.enabled) return agent;
    const indexQuote = indexQuotes[agent.targetAsset];
    if (!indexQuote) return agent;

    let shouldTrigger = false;
    let side: 'MINT' | 'REDEEM' = 'MINT';
    let tradeAmount = Math.min(agent.allocationUsdc, Math.max(0, workingState.cashUsdc - 10000));

    if (agent.strategyType === 'carry' && indexQuote.yieldAprPct >= agent.thresholdPct && tradeAmount >= 500) {
      shouldTrigger = true;
      side = 'MINT';
    } else if (agent.strategyType === 'momentum' && indexQuote.change24hPct >= agent.thresholdPct && tradeAmount >= 500) {
      shouldTrigger = true;
      side = 'MINT';
    } else if (agent.strategyType === 'rotation' && indexQuote.yieldAprPct >= agent.thresholdPct && tradeAmount >= 500) {
      shouldTrigger = true;
      side = 'MINT';
    } else if (agent.strategyType === 'protection' && indexQuote.change24hPct <= agent.thresholdPct) {
      const heldQty = workingState.positions[agent.targetAsset]?.quantity ?? 0;
      if (heldQty > 50) {
        shouldTrigger = true;
        side = 'REDEEM';
        tradeAmount = Number((heldQty * 0.25).toFixed(2));
      }
    }

    if (!shouldTrigger) {
      return {
        ...agent,
        lastRunAt: nowIso,
        lastActionSummary: `Evaluated ${agent.targetAsset} (${indexQuote.change24hPct >= 0 ? '+' : ''}${indexQuote.change24hPct}% 24h) · Threshold standby.`,
      };
    }

    try {
      const res = executeSsiTrade(
        workingState,
        {
          symbol: agent.targetAsset,
          side,
          amountInput: tradeAmount,
          venue: 'Agent Engine',
          note: `${agent.name} autonomous execution`,
        },
        indexQuotes
      );

      workingState = {
        ...res.nextState,
        operatorRevenueUsd: {
          ...res.nextState.operatorRevenueUsd,
          managementFees: Number((res.nextState.operatorRevenueUsd.managementFees + 4.5).toFixed(2)),
        },
      };

      const receiptWithAgentType: SettlementReceipt = {
        ...res.receipt,
        type: 'AGENT_REBALANCE',
        side: 'REBALANCE',
        operatorFeeUsd: Number((res.receipt.operatorFeeUsd + 4.5).toFixed(2)),
      };
      workingState.receipts[0] = receiptWithAgentType;
      createdReceipts.push(receiptWithAgentType);
      executedAgents.push(agent.name);

      return {
        ...agent,
        executionsCount: agent.executionsCount + 1,
        revenueGeneratedUsd: Number((agent.revenueGeneratedUsd + receiptWithAgentType.operatorFeeUsd).toFixed(2)),
        lastRunAt: nowIso,
        lastActionSummary: `${side === 'MINT' ? 'Allocated' : 'Protected'} $${receiptWithAgentType.notionalUsd.toLocaleString()} in ${agent.targetAsset} · +$${receiptWithAgentType.operatorFeeUsd.toFixed(2)} fee`,
      };
    } catch {
      return {
        ...agent,
        lastRunAt: nowIso,
        lastActionSummary: 'Skipped execution: reserve cash floor active.',
      };
    }
  });

  return {
    nextState: {
      ...workingState,
      agents: updatedAgents,
    },
    executedAgents,
    receipts: createdReceipts,
  };
}

export function addClientMandate(
  state: DeskState,
  params: {
    clientName: string;
    strategyLabel: string;
    allocatedIndex: SsiSymbol;
    principalUsd: number;
    managementFeeBps: number;
    carryPct: number;
  },
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): { nextState: DeskState; mandate: ClientMandate; receipt: SettlementReceipt } {
  const clientName = params.clientName.trim();
  if (!clientName) {
    throw new Error('Client name is required.');
  }
  if (!Number.isFinite(params.principalUsd) || params.principalUsd < 1000) {
    throw new Error('Minimum mandate principal is $1,000 USDC.');
  }

  const mandate: ClientMandate = {
    id: `mnd-${Date.now().toString().slice(-5)}`,
    clientName,
    strategyLabel: params.strategyLabel.trim() || 'Custom SSI Mandate',
    allocatedIndex: params.allocatedIndex,
    principalUsd: Number(params.principalUsd.toFixed(2)),
    managementFeeBps: Math.max(10, Math.min(250, params.managementFeeBps)),
    carryPct: Math.max(0, Math.min(35, params.carryPct)),
    createdAt: new Date().toISOString(),
    status: 'Active',
  };

  const fundedState: DeskState = {
    ...state,
    cashUsdc: Number((state.cashUsdc + mandate.principalUsd).toFixed(2)),
    mandates: [mandate, ...state.mandates],
  };

  const onboardingFee = Number(((mandate.principalUsd * mandate.managementFeeBps) / 10000 / 4).toFixed(2));
  const { nextState, receipt } = executeSsiTrade(
    fundedState,
    {
      symbol: mandate.allocatedIndex,
      side: 'MINT',
      amountInput: mandate.principalUsd,
      venue: 'ValueChain Vault',
      note: `Client mandate onboarded: ${mandate.clientName}`,
    },
    indexQuotes
  );

  const finalState: DeskState = {
    ...nextState,
    operatorRevenueUsd: {
      ...nextState.operatorRevenueUsd,
      managementFees: Number((nextState.operatorRevenueUsd.managementFees + onboardingFee).toFixed(2)),
    },
  };

  return { nextState: finalState, mandate, receipt };
}

export function buildOrderbookSnapshot(midPrice: number, spreadBps = 8): OrderbookSnapshot {
  const safeMid = midPrice > 0 ? midPrice : 1;
  const halfSpread = (safeMid * spreadBps) / 20000;
  const step = Math.max(safeMid * 0.0008, 0.000001);
  const precision = safeMid < 0.01 ? 7 : safeMid < 10 ? 4 : 2;

  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];

  let cumBid = 0;
  let cumAsk = 0;
  const baseSize = Math.max(5, Math.round(18000 / safeMid));

  for (let i = 0; i < 8; i++) {
    const bidPrice = Number((safeMid - halfSpread - i * step).toFixed(precision));
    const askPrice = Number((safeMid + halfSpread + i * step).toFixed(precision));
    const sizeMultiplier = 1 + i * 0.35 + ((i % 3) * 0.18);
    const bidSize = Number((baseSize * sizeMultiplier).toFixed(safeMid > 500 ? 3 : 1));
    const askSize = Number((baseSize * (sizeMultiplier * 0.94)).toFixed(safeMid > 500 ? 3 : 1));

    cumBid = Number((cumBid + bidSize).toFixed(2));
    cumAsk = Number((cumAsk + askSize).toFixed(2));

    bids.push({
      price: bidPrice,
      size: bidSize,
      totalSize: cumBid,
      notionalUsd: Number((bidPrice * bidSize).toFixed(2)),
    });
    asks.push({
      price: askPrice,
      size: askSize,
      totalSize: cumAsk,
      notionalUsd: Number((askPrice * askSize).toFixed(2)),
    });
  }

  const bestBid = bids[0]?.price ?? safeMid;
  const bestAsk = asks[0]?.price ?? safeMid;
  const spreadUsd = Number((bestAsk - bestBid).toFixed(precision));

  return {
    bids,
    asks,
    midPrice: Number(safeMid.toFixed(precision)),
    spreadUsd,
    spreadBps,
    fundingRatePct: 0.0142,
  };
}

export function buildNavHistorySeries(
  timeframe: ChartTimeframe,
  currentAum: number
): NavHistoryPoint[] {
  const pointConfigs: Record<ChartTimeframe, { labels: string[]; portfolioDelta: number; benchDelta: number }> = {
    '1D': {
      labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Now'],
      portfolioDelta: 0.024,
      benchDelta: 0.015,
    },
    '1W': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today'],
      portfolioDelta: 0.068,
      benchDelta: 0.041,
    },
    '1M': {
      labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Now'],
      portfolioDelta: 0.145,
      benchDelta: 0.092,
    },
    YTD: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
      portfolioDelta: 0.34,
      benchDelta: 0.21,
    },
  };

  const cfg = pointConfigs[timeframe];
  const count = cfg.labels.length;
  const startPort = currentAum / (1 + cfg.portfolioDelta);
  const startBench = currentAum / (1 + cfg.benchDelta) * 0.96;

  return cfg.labels.map((label, idx) => {
    const progress = idx / Math.max(1, count - 1);
    const wave = Math.sin(idx * 1.45) * 0.008 * (1 - progress * 0.6);
    const benchWave = Math.cos(idx * 1.2) * 0.009 * (1 - progress * 0.6);

    const portfolioNav =
      idx === count - 1
        ? Number(currentAum.toFixed(2))
        : Number((startPort * (1 + cfg.portfolioDelta * progress + wave)).toFixed(2));

    const benchmarkNav = Number(
      (startBench * (1 + cfg.benchDelta * progress + benchWave)).toFixed(2)
    );

    return { label, portfolioNav, benchmarkNav };
  });
}

export const MODEL_ALLOCATION_PRESETS: Record<
  AllocationPresetId,
  {
    id: AllocationPresetId;
    label: string;
    subtitle: string;
    weights: Record<SsiSymbol, number>;
  }
> = {
  balanced_alpha: {
    id: 'balanced_alpha',
    label: 'Balanced Alpha',
    subtitle: '45% MAG7 · 20% DEFI · 10% MEME · 25% USSI',
    weights: { 'MAG7.ssi': 0.45, 'DEFI.ssi': 0.2, 'MEME.ssi': 0.1, USSI: 0.25 },
  },
  carry_fortress: {
    id: 'carry_fortress',
    label: 'Carry Fortress',
    subtitle: '30% MAG7 · 15% DEFI · 5% MEME · 50% USSI',
    weights: { 'MAG7.ssi': 0.3, 'DEFI.ssi': 0.15, 'MEME.ssi': 0.05, USSI: 0.5 },
  },
  growth_convex: {
    id: 'growth_convex',
    label: 'Convex Growth',
    subtitle: '50% MAG7 · 30% DEFI · 15% MEME · 5% USSI',
    weights: { 'MAG7.ssi': 0.5, 'DEFI.ssi': 0.3, 'MEME.ssi': 0.15, USSI: 0.05 },
  },
};

export function runPortfolioStressTest(
  state: DeskState,
  spotPrices: Record<string, SpotAssetPrice>,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>,
  scenarioId: StressScenarioId
): StressScenarioResult {
  const scenarioCatalog: Record<
    StressScenarioId,
    {
      name: string;
      description: string;
      shocks: Record<SsiSymbol | 'SPOT', number>;
      ussiYieldBonusPct: number;
    }
  > = {
    bull_breakout: {
      name: 'ETF Spot Breakout (+18%)',
      description: 'Major institutional inflows lift MAG7 & DeFi liquidity while carry basis remains steady.',
      shocks: { 'MAG7.ssi': 0.18, 'DEFI.ssi': 0.24, 'MEME.ssi': 0.31, USSI: 0.025, SPOT: 0.2 },
      ussiYieldBonusPct: 0.03,
    },
    macro_shock: {
      name: 'Macro Risk-Off Shock (-22%)',
      description: 'Broad spot drawdown tests USSI delta-neutral hedge cushioning and reserve floor.',
      shocks: { 'MAG7.ssi': -0.22, 'DEFI.ssi': -0.28, 'MEME.ssi': -0.38, USSI: 0.018, SPOT: -0.24 },
      ussiYieldBonusPct: 0.015,
    },
    defi_rotation: {
      name: 'DeFi Fee-Switch Rally (+26%)',
      description: 'Protocol revenue sharing triggers sharp capital rotation into DEFI.ssi bluechips.',
      shocks: { 'MAG7.ssi': 0.08, 'DEFI.ssi': 0.26, 'MEME.ssi': 0.05, USSI: 0.012, SPOT: 0.12 },
      ussiYieldBonusPct: 0.02,
    },
    carry_spike: {
      name: 'Perp Funding Expansion (+21% APR)',
      description: 'Elevated perpetual funding boosts USSI dollar carry without directional spot beta.',
      shocks: { 'MAG7.ssi': 0.04, 'DEFI.ssi': 0.03, 'MEME.ssi': -0.02, USSI: 0.064, SPOT: 0.03 },
      ussiYieldBonusPct: 0.05,
    },
  };

  const spec = scenarioCatalog[scenarioId];
  const baseSummary = calculatePortfolioSummary(state, spotPrices, indexQuotes);
  let stressedInvestedUsd = 0;
  let ussiHedgeContributionUsd = 0;

  for (const pos of Object.values(state.positions)) {
    if (pos.quantity <= 0) continue;
    const livePrice = getLiveAssetPrice(pos.symbol, spotPrices, indexQuotes);
    const baseVal = pos.quantity * livePrice;
    const shock =
      pos.symbol in indexQuotes
        ? spec.shocks[pos.symbol as SsiSymbol]
        : spec.shocks.SPOT;
    const delta = baseVal * shock;
    stressedInvestedUsd += baseVal + delta;
    if (pos.symbol === 'USSI') {
      ussiHedgeContributionUsd += delta + baseVal * spec.ussiYieldBonusPct;
    }
  }

  const projectedAumUsd = Number((state.cashUsdc + stressedInvestedUsd).toFixed(2));
  const pnlImpactUsd = Number((projectedAumUsd - baseSummary.totalAumUsd).toFixed(2));
  const pnlImpactPct =
    baseSummary.totalAumUsd > 0
      ? Number(((pnlImpactUsd / baseSummary.totalAumUsd) * 100).toFixed(2))
      : 0;

  const avgMandateBps =
    state.mandates.length > 0
      ? state.mandates.reduce((acc, m) => acc + m.managementFeeBps, 0) / state.mandates.length
      : 70;
  const projectedAnnualFeeUsd = Number(
    (
      (projectedAumUsd * avgMandateBps) / 10000 +
      Math.max(0, pnlImpactUsd) * 0.1 +
      baseSummary.totalOperatorRevenueUsd * 3.8
    ).toFixed(2)
  );

  return {
    id: scenarioId,
    name: spec.name,
    description: spec.description,
    projectedAumUsd,
    pnlImpactUsd,
    pnlImpactPct,
    ussiHedgeContributionUsd: Number(ussiHedgeContributionUsd.toFixed(2)),
    projectedAnnualFeeUsd,
  };
}

export function calculateRebalancePlan(
  state: DeskState,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>,
  presetId: AllocationPresetId
): RebalanceLeg[] {
  const preset = MODEL_ALLOCATION_PRESETS[presetId];
  const ssiSymbols: SsiSymbol[] = ['MAG7.ssi', 'DEFI.ssi', 'MEME.ssi', 'USSI'];

  let totalSsiUsd = 0;
  const currentUsdMap = {} as Record<SsiSymbol, number>;
  for (const sym of ssiSymbols) {
    const val = (state.positions[sym]?.quantity ?? 0) * (indexQuotes[sym]?.nav ?? 1);
    currentUsdMap[sym] = Number(val.toFixed(2));
    totalSsiUsd += val;
  }

  if (totalSsiUsd <= 0) return [];

  return ssiSymbols
    .map((sym) => {
      const currentUsd = currentUsdMap[sym];
      const targetUsd = Number((totalSsiUsd * preset.weights[sym]).toFixed(2));
      const deltaUsd = Number((targetUsd - currentUsd).toFixed(2));
      const nav = indexQuotes[sym]?.nav ?? 1;
      const side: 'MINT' | 'REDEEM' = deltaUsd >= 0 ? 'MINT' : 'REDEEM';
      const amountInput =
        side === 'MINT'
          ? Number(Math.abs(deltaUsd).toFixed(2))
          : Number((Math.abs(deltaUsd) / nav).toFixed(4));

      return {
        symbol: sym,
        currentUsd,
        targetUsd,
        deltaUsd,
        side,
        amountInput,
      };
    })
    .filter((leg) => Math.abs(leg.deltaUsd) >= 150);
}

export function executeBatchRebalance(
  state: DeskState,
  presetId: AllocationPresetId,
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>
): { nextState: DeskState; legsExecuted: number; receipts: SettlementReceipt[] } {
  const legs = calculateRebalancePlan(state, indexQuotes, presetId);
  if (legs.length === 0) {
    throw new Error('Portfolio is already aligned within target tolerance.');
  }

  const ordered = [
    ...legs.filter((l) => l.side === 'REDEEM'),
    ...legs.filter((l) => l.side === 'MINT'),
  ];

  let working = state;
  const created: SettlementReceipt[] = [];
  const label = MODEL_ALLOCATION_PRESETS[presetId].label;

  for (const leg of ordered) {
    const res = executeSsiTrade(
      working,
      {
        symbol: leg.symbol,
        side: leg.side,
        amountInput: leg.amountInput,
        venue: 'ValueChain Vault',
        note: `Atomic ${label} rebalance (${leg.side} ${leg.symbol})`,
      },
      indexQuotes
    );
    working = res.nextState;
    created.push(res.receipt);
  }

  return {
    nextState: working,
    legsExecuted: created.length,
    receipts: created,
  };
}

