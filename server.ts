import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  BASE_SPOT_SNAPSHOT,
  addClientMandate,
  buildAllIndexQuotes,
  buildOrderbookSnapshot,
  calculatePortfolioSummary,
  createInitialDeskState,
  evaluateAgentCycle,
  executeBatchRebalance,
  executeSodexOrder,
  executeSsiTrade,
  getLiveAssetPrice,
} from './src/domain/financeEngine.ts';
import type {
  AiStrategyProposal,
  AllocationPresetId,
  AzexExecutableAction,
  DeskState,
  MarketNewsItem,
  SodexPair,
  SoSoValueTelemetry,
  SpotAssetPrice,
  SsiSymbol,
} from './src/types/finance.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '.data');
const STATE_FILE = path.join(DATA_DIR, 'desk-state.json');

const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  SOLUSDT: 'SOL',
  BNBUSDT: 'BNB',
  XRPUSDT: 'XRP',
  AVAXUSDT: 'AVAX',
  ADAUSDT: 'ADA',
  UNIUSDT: 'UNI',
  AAVEUSDT: 'AAVE',
  LINKUSDT: 'LINK',
  LDOUSDT: 'LDO',
  DOGEUSDT: 'DOGE',
  PEPEUSDT: 'PEPE',
  WIFUSDT: 'WIF',
  BONKUSDT: 'BONK',
};

const COINGECKO_IDS: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  binancecoin: 'BNB',
  ripple: 'XRP',
  'avalanche-2': 'AVAX',
  cardano: 'ADA',
  uniswap: 'UNI',
  aave: 'AAVE',
  chainlink: 'LINK',
  maker: 'MKR',
  'lido-dao': 'LDO',
  dogecoin: 'DOGE',
  pepe: 'PEPE',
  dogwifcoin: 'WIF',
  bonk: 'BONK',
  sosovalue: 'SOSO',
};

const CURATED_NEWS_FALLBACK: MarketNewsItem[] = [
  {
    id: 'news-1',
    title: 'Institutional spot ETF inflows accelerate across BTC and ETH custody rails',
    source: 'SoSoValue Research',
    publishedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    url: 'https://sosovalue.com',
    impactedIndex: 'MAG7.ssi',
    sentiment: 'Bullish',
    summary: 'Net institutional creations lifted large-cap spot depth and narrowed MAG7.ssi wrap spreads.',
  },
  {
    id: 'news-2',
    title: 'Perpetual funding basis widens on major venues as delta-neutral demand climbs',
    source: 'ValueChain Telemetry',
    publishedAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
    url: 'https://sosovalue.com',
    impactedIndex: 'USSI',
    sentiment: 'Bullish',
    summary: 'Positive annualized basis keeps USSI hedged carry yield elevated above Treasury benchmarks.',
  },
  {
    id: 'news-3',
    title: 'DeFi fee-switch governance proposals drive renewed volume to bluechip DEX and lending markets',
    source: 'SoDEX Market Desk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    url: 'https://sosovalue.com',
    impactedIndex: 'DEFI.ssi',
    sentiment: 'Bullish',
    summary: 'Protocol revenue growth across Uniswap, Aave, and Maker boosts DEFI.ssi fundamental weighting.',
  },
  {
    id: 'news-4',
    title: 'High-beta cultural liquidity pools see intraday volatility expansion on L1 orderbooks',
    source: 'On-Chain Flow Monitor',
    publishedAt: new Date(Date.now() - 1000 * 60 * 145).toISOString(),
    url: 'https://sosovalue.com',
    impactedIndex: 'MEME.ssi',
    sentiment: 'Cautious',
    summary: 'Elevated intraday dispersion triggers tighter slippage guardrails for automated meme index rebalancing.',
  },
];

let cachedSpotPrices: Record<string, SpotAssetPrice> = structuredClone(BASE_SPOT_SNAPSHOT);
let baselineSpotPrices: Record<string, SpotAssetPrice> | null = null;
let lastPriceFetchMs = 0;
let cachedNews: MarketNewsItem[] = CURATED_NEWS_FALLBACK;
let lastNewsFetchMs = 0;
let cachedSoSoTelemetry: SoSoValueTelemetry | null = null;
let lastSoSoFetchMs = 0;

function loadDeskState(): DeskState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DeskState;
      if (parsed && typeof parsed.cashUsdc === 'number' && parsed.positions) {
        return parsed;
      }
    }
  } catch {
  }
  const initial = createInitialDeskState();
  saveDeskState(initial);
  return initial;
}

function saveDeskState(state: DeskState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
  }
}

let deskState: DeskState = loadDeskState();

async function fetchWithTimeout(
  url: string,
  timeoutMs = 4000,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(extraHeaders ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseNumericField(record: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function extractFirstRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const data = obj.data;
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    return data[0] as Record<string, unknown>;
  }
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.list) && nested.list.length > 0 && typeof nested.list[0] === 'object') {
      return nested.list[0] as Record<string, unknown>;
    }
    return nested;
  }
  if (Array.isArray(obj.list) && obj.list.length > 0 && typeof obj.list[0] === 'object') {
    return obj.list[0] as Record<string, unknown>;
  }
  return null;
}

async function getSoSoValueOpenApiTelemetry(): Promise<SoSoValueTelemetry> {
  const now = Date.now();
  if (cachedSoSoTelemetry && now - lastSoSoFetchMs < 60000) {
    return cachedSoSoTelemetry;
  }

  const sosoKey = process.env.SOSOVALUE_API_KEY?.trim();
  const hasKey = Boolean(sosoKey && sosoKey !== 'MY_SOSOVALUE_API_KEY');

  if (!hasKey || !sosoKey) {
    const unconfigured: SoSoValueTelemetry = {
      connected: false,
      source: 'spot-fallback',
      btcEtfDailyNetInflowUsd: null,
      ethEtfDailyNetInflowUsd: null,
      btcEtfTotalNetAssetsUsd: null,
      ethEtfTotalNetAssetsUsd: null,
      mag7ConstituentsCount: null,
      lastSyncedAt: new Date().toISOString(),
      message: 'Add SOSOVALUE_API_KEY in .env to stream institutional US ETF flows & SSI constituent weights.',
    };
    cachedSoSoTelemetry = unconfigured;
    lastSoSoFetchMs = now;
    return unconfigured;
  }

  const headers = { 'x-soso-api-key': sosoKey };
  let btcEtfDailyNetInflowUsd: number | null = null;
  let btcEtfTotalNetAssetsUsd: number | null = null;
  let ethEtfDailyNetInflowUsd: number | null = null;
  let ethEtfTotalNetAssetsUsd: number | null = null;
  let mag7ConstituentsCount: number | null = null;
  let connected = false;

  try {
    const [btcResp, ethResp, magResp] = await Promise.allSettled([
      fetchWithTimeout(
        'https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=BTC&country_code=US&limit=3',
        4500,
        headers
      ),
      fetchWithTimeout(
        'https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=ETH&country_code=US&limit=3',
        4500,
        headers
      ),
      fetchWithTimeout(
        'https://openapi.sosovalue.com/openapi/v1/indices/ssimag7/constituents',
        4500,
        headers
      ),
    ]);

    if (btcResp.status === 'fulfilled' && btcResp.value.ok) {
      const json = (await btcResp.value.json()) as unknown;
      const rec = extractFirstRecord(json);
      btcEtfDailyNetInflowUsd = parseNumericField(rec, [
        'dailyNetInflow',
        'daily_net_inflow',
        'totalNetInflow',
        'netInflow',
      ]);
      btcEtfTotalNetAssetsUsd = parseNumericField(rec, [
        'totalNetAssets',
        'total_net_assets',
        'netAssets',
      ]);
      if (rec) connected = true;
    }

    if (ethResp.status === 'fulfilled' && ethResp.value.ok) {
      const json = (await ethResp.value.json()) as unknown;
      const rec = extractFirstRecord(json);
      ethEtfDailyNetInflowUsd = parseNumericField(rec, [
        'dailyNetInflow',
        'daily_net_inflow',
        'totalNetInflow',
        'netInflow',
      ]);
      ethEtfTotalNetAssetsUsd = parseNumericField(rec, [
        'totalNetAssets',
        'total_net_assets',
        'netAssets',
      ]);
      if (rec) connected = true;
    }

    if (magResp.status === 'fulfilled' && magResp.value.ok) {
      const json = (await magResp.value.json()) as { data?: unknown };
      if (Array.isArray(json.data)) {
        mag7ConstituentsCount = json.data.length;
        connected = true;
      } else if (json.data && typeof json.data === 'object') {
        const list = (json.data as { list?: unknown[] }).list;
        if (Array.isArray(list)) {
          mag7ConstituentsCount = list.length;
          connected = true;
        }
      }
    }
  } catch {
  }

  const nextTelemetry: SoSoValueTelemetry = {
    connected,
    source: connected ? 'sosovalue-openapi' : 'spot-fallback',
    btcEtfDailyNetInflowUsd,
    ethEtfDailyNetInflowUsd,
    btcEtfTotalNetAssetsUsd,
    ethEtfTotalNetAssetsUsd,
    mag7ConstituentsCount,
    lastSyncedAt: new Date().toISOString(),
    message: connected
      ? 'Live SoSoValue OpenAPI v1 telemetry synchronized'
      : 'SOSOVALUE_API_KEY check returned no active v1 ETF records; live Binance/CoinGecko pricing remains active.',
  };

  cachedSoSoTelemetry = nextTelemetry;
  lastSoSoFetchMs = now;
  return nextTelemetry;
}

async function getLiveSpotPrices(): Promise<Record<string, SpotAssetPrice>> {
  const now = Date.now();
  if (now - lastPriceFetchMs < 25000) {
    return cachedSpotPrices;
  }

  const nextPrices: Record<string, SpotAssetPrice> = structuredClone(cachedSpotPrices);
  let updatedFromRemote = false;

  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(Object.keys(BINANCE_SYMBOLS)));
    const resp = await fetchWithTimeout(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      3500
    );
    if (resp.ok) {
      const rows = (await resp.json()) as Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        quoteVolume: string;
      }>;
      for (const row of rows) {
        const asset = BINANCE_SYMBOLS[row.symbol];
        const price = Number(row.lastPrice);
        if (asset && Number.isFinite(price) && price > 0) {
          nextPrices[asset] = {
            symbol: asset,
            name: BASE_SPOT_SNAPSHOT[asset]?.name ?? asset,
            price,
            change24hPct: Number(Number(row.priceChangePercent).toFixed(2)),
            volume24hUsd: Number(row.quoteVolume) || nextPrices[asset].volume24hUsd,
            source: 'binance',
          };
          updatedFromRemote = true;
        }
      }
    }
  } catch {
  }

  if (!updatedFromRemote) {
    try {
      const ids = Object.keys(COINGECKO_IDS).join(',');
      const resp = await fetchWithTimeout(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        3500
      );
      if (resp.ok) {
        const payload = (await resp.json()) as Record<
          string,
          { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }
        >;
        for (const [cgId, asset] of Object.entries(COINGECKO_IDS)) {
          const item = payload[cgId];
          if (item && typeof item.usd === 'number' && item.usd > 0) {
            nextPrices[asset] = {
              symbol: asset,
              name: BASE_SPOT_SNAPSHOT[asset]?.name ?? asset,
              price: item.usd,
              change24hPct: Number((item.usd_24h_change ?? 0).toFixed(2)),
              volume24hUsd: item.usd_24h_vol ?? nextPrices[asset]?.volume24hUsd ?? 0,
              source: 'coingecko',
            };
            updatedFromRemote = true;
          }
        }
      }
    } catch {
    }
  }

  if (updatedFromRemote && !baselineSpotPrices) {
    const calibrated: Record<string, SpotAssetPrice> = {};
    for (const [sym, spot] of Object.entries(nextPrices)) {
      calibrated[sym] = {
        ...spot,
        price: sym === 'USDC' ? 1.0 : Number((spot.price * 0.985).toFixed(spot.price < 0.01 ? 8 : 4)),
      };
    }
    baselineSpotPrices = calibrated;
  }

  cachedSpotPrices = nextPrices;
  lastPriceFetchMs = now;
  return cachedSpotPrices;
}

function getIndexQuotes(spotPrices: Record<string, SpotAssetPrice>) {
  return buildAllIndexQuotes(spotPrices, baselineSpotPrices ?? BASE_SPOT_SNAPSHOT);
}

function classifyNewsIndex(title: string, body: string): {
  impactedIndex: SsiSymbol;
  sentiment: MarketNewsItem['sentiment'];
} {
  const text = `${title} ${body}`.toLowerCase();
  let impactedIndex: SsiSymbol = 'MAG7.ssi';

  if (text.includes('defi') || text.includes('uniswap') || text.includes('aave') || text.includes('lending') || text.includes('maker')) {
    impactedIndex = 'DEFI.ssi';
  } else if (text.includes('meme') || text.includes('doge') || text.includes('pepe') || text.includes('shib') || text.includes('wif')) {
    impactedIndex = 'MEME.ssi';
  } else if (text.includes('yield') || text.includes('stablecoin') || text.includes('usdc') || text.includes('funding') || text.includes('treasury')) {
    impactedIndex = 'USSI';
  }

  let sentiment: MarketNewsItem['sentiment'] = 'Neutral';
  if (text.includes('surge') || text.includes('inflow') || text.includes('rally') || text.includes('growth') || text.includes('record') || text.includes('launch') || text.includes('adopt')) {
    sentiment = 'Bullish';
  } else if (text.includes('drop') || text.includes('hack') || text.includes('lawsuit') || text.includes('outflow') || text.includes('risk') || text.includes('volatile')) {
    sentiment = 'Cautious';
  }

  return { impactedIndex, sentiment };
}

async function getLiveMarketNews(): Promise<MarketNewsItem[]> {
  const now = Date.now();
  if (now - lastNewsFetchMs < 60000) {
    return cachedNews;
  }

  try {
    const resp = await fetchWithTimeout(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
      3500
    );
    if (resp.ok) {
      const data = (await resp.json()) as {
        Data?: Array<{
          id: string;
          title: string;
          body: string;
          source_info?: { name?: string };
          published_on: number;
          url: string;
        }>;
      };
      if (Array.isArray(data.Data) && data.Data.length > 0) {
        cachedNews = data.Data.slice(0, 10).map((item) => {
          const { impactedIndex, sentiment } = classifyNewsIndex(item.title, item.body);
          return {
            id: String(item.id),
            title: item.title,
            source: item.source_info?.name ?? 'Market Wire',
            publishedAt: new Date(item.published_on * 1000).toISOString(),
            url: item.url,
            impactedIndex,
            sentiment,
            summary: item.body.slice(0, 140).trim() + (item.body.length > 140 ? '...' : ''),
          };
        });
        lastNewsFetchMs = now;
        return cachedNews;
      }
    }
  } catch {
  }

  lastNewsFetchMs = now;
  return cachedNews;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/overview', async (_req, res) => {
    try {
      const [spotPrices, news, sosoValueFeed] = await Promise.all([
        getLiveSpotPrices(),
        getLiveMarketNews(),
        getSoSoValueOpenApiTelemetry(),
      ]);
      const indexQuotes = getIndexQuotes(spotPrices);
      const summary = calculatePortfolioSummary(deskState, spotPrices, indexQuotes);
      const feedSource = Object.values(spotPrices).some((s) => s.source !== 'snapshot')
        ? 'live'
        : 'snapshot';

      res.json({
        spotPrices,
        indexQuotes,
        state: deskState,
        summary,
        news,
        sosoValueFeed,
        valueChain: {
          chainName: 'ValueChain L1',
          blockNumber: deskState.latestBlockNumber,
          finalityMs: 392,
          tps: 14820,
          feedSource,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load market overview.',
      });
    }
  });

  app.get('/api/orderbook', async (req, res) => {
    try {
      const pairParam = String(req.query.pair ?? 'MAG7.ssi/USDC') as SodexPair;
      const [baseAsset] = pairParam.split('/');
      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const midPrice = getLiveAssetPrice(baseAsset, spotPrices, indexQuotes);
      const spreadBps = baseAsset.endsWith('.ssi') || baseAsset === 'USSI' ? 6 : 9;
      const snapshot = buildOrderbookSnapshot(midPrice, spreadBps);

      res.json({
        pair: pairParam,
        baseAsset,
        ...snapshot,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load SoDEX orderbook.',
      });
    }
  });

  app.post('/api/trade/ssi', async (req, res) => {
    try {
      const { symbol, side, amountInput, slippageBps } = req.body as {
        symbol: SsiSymbol;
        side: 'MINT' | 'REDEEM';
        amountInput: number;
        slippageBps?: number;
      };

      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const { nextState, receipt } = executeSsiTrade(
        deskState,
        {
          symbol,
          side,
          amountInput: Number(amountInput),
          slippageBps: slippageBps ? Number(slippageBps) : 12,
        },
        indexQuotes
      );

      deskState = nextState;
      saveDeskState(deskState);

      res.json({
        state: deskState,
        receipt,
        summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'SSI trade failed.',
      });
    }
  });

  app.post('/api/trade/sodex', async (req, res) => {
    try {
      const { pair, side, orderType, quantity, limitPrice } = req.body as {
        pair: SodexPair;
        side: 'BUY' | 'SELL';
        orderType: 'MARKET' | 'LIMIT';
        quantity: number;
        limitPrice?: number;
      };

      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const { nextState, receipt } = executeSodexOrder(
        deskState,
        {
          pair,
          side,
          orderType,
          quantity: Number(quantity),
          limitPrice: limitPrice ? Number(limitPrice) : undefined,
        },
        spotPrices,
        indexQuotes
      );

      deskState = nextState;
      saveDeskState(deskState);

      res.json({
        state: deskState,
        receipt,
        summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'SoDEX order execution failed.',
      });
    }
  });

  app.post('/api/agents/toggle', (req, res) => {
    const { agentId } = req.body as { agentId: string };
    const found = deskState.agents.find((a) => a.id === agentId);
    if (!found) {
      res.status(404).json({ error: 'Agent not found.' });
      return;
    }

    deskState = {
      ...deskState,
      agents: deskState.agents.map((a) =>
        a.id === agentId ? { ...a, enabled: !a.enabled } : a
      ),
    };
    saveDeskState(deskState);
    res.json({ state: deskState });
  });

  app.post('/api/agents/run', async (_req, res) => {
    try {
      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const result = evaluateAgentCycle(deskState, indexQuotes);
      deskState = result.nextState;
      saveDeskState(deskState);

      res.json({
        state: deskState,
        executedAgents: result.executedAgents,
        receipts: result.receipts,
        summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to execute agent cycle.',
      });
    }
  });

  app.post('/api/mandates', async (req, res) => {
    try {
      const {
        clientName,
        strategyLabel,
        allocatedIndex,
        principalUsd,
        managementFeeBps,
        carryPct,
      } = req.body as {
        clientName: string;
        strategyLabel: string;
        allocatedIndex: SsiSymbol;
        principalUsd: number;
        managementFeeBps: number;
        carryPct: number;
      };

      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const { nextState, mandate, receipt } = addClientMandate(
        deskState,
        {
          clientName,
          strategyLabel,
          allocatedIndex,
          principalUsd: Number(principalUsd),
          managementFeeBps: Number(managementFeeBps),
          carryPct: Number(carryPct),
        },
        indexQuotes
      );

      deskState = nextState;
      saveDeskState(deskState);

      res.json({
        state: deskState,
        mandate,
        receipt,
        summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create client mandate.',
      });
    }
  });

  app.post('/api/reset', async (_req, res) => {
    deskState = createInitialDeskState();
    saveDeskState(deskState);
    const spotPrices = await getLiveSpotPrices();
    const indexQuotes = buildAllIndexQuotes(spotPrices);
    res.json({
      state: deskState,
      summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
    });
  });

  app.get('/api/protocol', (_req, res) => {
    res.json({
      protocol: 'SoSoValue Index Protocol (SSI)',
      repository: 'https://github.com/SoSoValueLabs/ssi-protocol',
      settlementChain: 'ValueChain L1',
      custodyPartners: ['Cobo MPC', 'Ceffu Institutional'],
      contracts: [
        { symbol: 'MAG7.ssi', network: 'Base / ValueChain L1', standard: 'ERC-20 Index Wrapper', audit: 'Verified' },
        { symbol: 'DEFI.ssi', network: 'Base / ValueChain L1', standard: 'ERC-20 Index Wrapper', audit: 'Verified' },
        { symbol: 'MEME.ssi', network: 'Base / ValueChain L1', standard: 'ERC-20 Index Wrapper', audit: 'Verified' },
        { symbol: 'USSI', network: 'Base / ValueChain L1', standard: 'Delta-Neutral Yield Vault', audit: 'Verified' },
      ],
    });
  });

  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const pushTick = async () => {
      if (closed) return;
      try {
        const spotPrices = await getLiveSpotPrices();
        deskState = {
          ...deskState,
          latestBlockNumber: deskState.latestBlockNumber + 1,
        };
        const indexQuotes = getIndexQuotes(spotPrices);
        const summary = calculatePortfolioSummary(deskState, spotPrices, indexQuotes);
        const payload = JSON.stringify({
          spotPrices,
          indexQuotes,
          summary,
          blockNumber: deskState.latestBlockNumber,
          timestamp: new Date().toISOString(),
        });
        res.write(`data: ${payload}\n\n`);
      } catch {
      }
    };

    pushTick();
    const timer = setInterval(pushTick, 4000);
    req.on('close', () => clearInterval(timer));
  });

  async function withAiRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 350 * attempt));
        }
      }
    }
    throw lastError;
  }

  function safeParseAiJson<T>(rawText: string): T | null {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  app.post('/api/ai/strategist', async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');
    const hasGroq = Boolean(groqKey && groqKey.length > 0);

    if (!hasGemini && !hasGroq) {
      res.status(503).json({
        error: 'AI API key is not configured. Add GEMINI_API_KEY (or optional GROQ_API_KEY) in your .env file or AI Studio Secrets to activate live AI strategist analysis.',
      });
      return;
    }

    try {
      const { operatorDirective } = (req.body ?? {}) as { operatorDirective?: string };
      const [spotPrices, news] = await Promise.all([getLiveSpotPrices(), getLiveMarketNews()]);
      const indexQuotes = getIndexQuotes(spotPrices);
      const summary = calculatePortfolioSummary(deskState, spotPrices, indexQuotes);

      const contextPayload = {
        cashUsdc: deskState.cashUsdc,
        totalAumUsd: summary.totalAumUsd,
        positions: Object.values(deskState.positions).map((p) => ({
          symbol: p.symbol,
          quantity: p.quantity,
          avgEntryPrice: p.avgEntryPrice,
        })),
        ssiIndexes: Object.values(indexQuotes).map((q) => ({
          symbol: q.symbol,
          nav: q.nav,
          change24hPct: q.change24hPct,
          yieldAprPct: q.yieldAprPct,
          managementFeeBps: q.managementFeeBps,
        })),
        recentNews: news.slice(0, 4).map((n) => ({
          title: n.title,
          impactedIndex: n.impactedIndex,
          sentiment: n.sentiment,
        })),
        operatorDirective:
          operatorDirective?.trim() ||
          'Optimize risk-adjusted treasury yield and solo-operator fee revenue across SSI indexes.',
      };

      let parsed: Partial<Omit<AiStrategyProposal, 'generatedAt'>> | null = null;

      if (hasGemini && geminiKey) {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await withAiRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Analyze this live SoSoValue SSI portfolio and market snapshot, and propose 2 to 3 concrete executable actions that fit the operator directive and available cash ($${deskState.cashUsdc.toFixed(2)} USDC):\n${JSON.stringify(contextPayload)}`,
            config: {
              systemInstruction:
                'You are an institutional quantitative portfolio strategist operating a one-person on-chain finance business on SoSoValue SSI Protocol, SoDEX, and ValueChain L1. Recommend practical, risk-aware allocations strictly using valid targetAsset values: MAG7.ssi, DEFI.ssi, MEME.ssi, or USSI, and actionType MINT or REDEEM.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  marketRegime: { type: Type.STRING },
                  confidencePct: { type: Type.NUMBER },
                  thesis: { type: Type.STRING },
                  recommendedActions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        targetAsset: { type: Type.STRING },
                        actionType: { type: Type.STRING },
                        allocationUsdc: { type: Type.NUMBER },
                        expectedYieldImpact: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                      },
                      required: [
                        'targetAsset',
                        'actionType',
                        'allocationUsdc',
                        'expectedYieldImpact',
                        'rationale',
                      ],
                    },
                  },
                  riskWarnings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'marketRegime',
                  'confidencePct',
                  'thesis',
                  'recommendedActions',
                  'riskWarnings',
                ],
              },
            },
          })
        );

        parsed = safeParseAiJson<Partial<Omit<AiStrategyProposal, 'generatedAt'>>>(
          response.text ?? '{}'
        );
      } else {
        const groqResp = await withAiRetry(() =>
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content:
                    'Return strict JSON with keys: marketRegime (string), confidencePct (number 50-99), thesis (string), recommendedActions (array of {targetAsset: MAG7.ssi|DEFI.ssi|MEME.ssi|USSI, actionType: MINT|REDEEM, allocationUsdc: number, expectedYieldImpact: string, rationale: string}), riskWarnings (string[]).',
                },
                {
                  role: 'user',
                  content: JSON.stringify(contextPayload),
                },
              ],
            }),
          })
        );
        if (!groqResp.ok) {
          throw new Error('Free AI provider request failed.');
        }
        const groqData = (await groqResp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        parsed = safeParseAiJson<Partial<Omit<AiStrategyProposal, 'generatedAt'>>>(
          groqData.choices?.[0]?.message?.content ?? '{}'
        );
      }

      if (!parsed) {
        throw new Error('AI strategist returned an unreadable format. Please retry.');
      }

      const validAssets = new Set<SsiSymbol>(['MAG7.ssi', 'DEFI.ssi', 'MEME.ssi', 'USSI']);
      const normalizedActions = (parsed.recommendedActions ?? []).map((act) => ({
        targetAsset: validAssets.has(act.targetAsset as SsiSymbol)
          ? (act.targetAsset as SsiSymbol)
          : 'MAG7.ssi',
        actionType: (act.actionType === 'REDEEM' ? 'REDEEM' : 'MINT') as 'MINT' | 'REDEEM',
        allocationUsdc: Math.max(500, Math.min(25000, Math.round(Number(act.allocationUsdc) || 2500))),
        expectedYieldImpact: act.expectedYieldImpact || '+2.4% APR',
        rationale: act.rationale || 'Rebalance toward optimal Sharpe ratio basket.',
      }));

      res.json({
        proposal: {
          marketRegime: parsed.marketRegime || 'Constructive Risk-On Rotation',
          confidencePct: Math.max(50, Math.min(99, Math.round(Number(parsed.confidencePct) || 82))),
          thesis: parsed.thesis || 'Balanced allocation across large-cap SSI exposure and delta-neutral carry.',
          recommendedActions: normalizedActions,
          riskWarnings: parsed.riskWarnings ?? ['Monitor intraday orderbook spread before large mints.'],
          generatedAt: new Date().toISOString(),
        } satisfies AiStrategyProposal,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'AI strategist request failed.',
      });
    }
  });

  app.post('/api/portfolio/rebalance', async (req, res) => {
    try {
      const { presetId } = (req.body ?? {}) as { presetId: AllocationPresetId };
      const validPresets = new Set<AllocationPresetId>([
        'balanced_alpha',
        'carry_fortress',
        'growth_convex',
      ]);
      if (!validPresets.has(presetId)) {
        res.status(400).json({ error: 'Invalid model allocation preset.' });
        return;
      }

      const spotPrices = await getLiveSpotPrices();
      const indexQuotes = getIndexQuotes(spotPrices);
      const { nextState, legsExecuted, receipts } = executeBatchRebalance(
        deskState,
        presetId,
        indexQuotes
      );

      deskState = nextState;
      saveDeskState(deskState);

      res.json({
        state: deskState,
        legsExecuted,
        receipts,
        summary: calculatePortfolioSummary(deskState, spotPrices, indexQuotes),
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Atomic rebalance failed.',
      });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');
    const hasGroq = Boolean(groqKey && groqKey.length > 0);

    if (!hasGemini && !hasGroq) {
      res.status(503).json({
        error:
          'AZEX AI requires GEMINI_API_KEY (or optional GROQ_API_KEY) configured in your .env file or AI Studio Secrets.',
      });
      return;
    }

    try {
      const { message, history } = (req.body ?? {}) as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      const cleanMsg = message?.trim();
      if (!cleanMsg) {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const [spotPrices, news, sosoFeed] = await Promise.all([
        getLiveSpotPrices(),
        getLiveMarketNews(),
        getSoSoValueOpenApiTelemetry(),
      ]);
      const indexQuotes = getIndexQuotes(spotPrices);
      const summary = calculatePortfolioSummary(deskState, spotPrices, indexQuotes);

      const snapshot = {
        cashUsdc: deskState.cashUsdc,
        summary,
        positions: Object.values(deskState.positions),
        indexes: Object.values(indexQuotes).map((q) => ({
          symbol: q.symbol,
          nav: q.nav,
          change24hPct: q.change24hPct,
          yieldAprPct: q.yieldAprPct,
          feeBps: q.managementFeeBps,
        })),
        activeAgents: deskState.agents.filter((a) => a.enabled).map((a) => a.name),
        mandatesCount: deskState.mandates.length,
        latestBlock: deskState.latestBlockNumber,
        sosoValueOpenApi: {
          connected: sosoFeed.connected,
          btcEtfDailyNetInflowUsd: sosoFeed.btcEtfDailyNetInflowUsd,
          ethEtfDailyNetInflowUsd: sosoFeed.ethEtfDailyNetInflowUsd,
        },
        topNews: news.slice(0, 3).map((n) => `${n.impactedIndex} (${n.sentiment}): ${n.title}`),
        builder: 'Ashish Kumar (B.Tech CSE 3rd Year, Team AZEX)',
      };

      const historyText = (history ?? [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Operator' : 'AZEX'}: ${m.content}`)
        .join('\n');

      interface ChatAiPayload {
        reply?: string;
        includeAction?: boolean;
        actionType?: string;
        symbol?: string;
        side?: string;
        amountInput?: number;
        actionLabel?: string;
      }

      let parsed: ChatAiPayload = {};
      let rawFallbackReply = '';

      if (hasGemini && geminiKey) {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        try {
          const response = await withAiRetry(() =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Live ValueDesk Telemetry:\n${JSON.stringify(snapshot)}\n\nRecent Conversation:\n${historyText || 'None'}\n\nOperator Question: ${cleanMsg}`,
              config: {
                systemInstruction:
                  'You are AZEX, a highly capable, friendly young male AI copilot and quantitative researcher engineered by Ashish Kumar (Team AZEX, B.Tech CSE 3rd Year) inside ValueDesk on SoSoValue, SoDEX, and ValueChain L1. Answer ANY question the user asks clearly, accurately, and thoroughly — whether about portfolio risk, live SSI index NAVs, SoDEX trading, Web3 architecture, AI/ML, coding, or general topics. When answering finance questions, reference exact live numbers from telemetry. Set includeAction=true only when the user requests or benefits directly from executing a trade, rebalance, or agent cycle; otherwise set includeAction=false. Valid symbols: MAG7.ssi, DEFI.ssi, MEME.ssi, USSI. Valid actionType: SSI_TRADE or RUN_AGENTS.',
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    reply: { type: Type.STRING },
                    includeAction: { type: Type.BOOLEAN },
                    actionType: { type: Type.STRING },
                    symbol: { type: Type.STRING },
                    side: { type: Type.STRING },
                    amountInput: { type: Type.NUMBER },
                    actionLabel: { type: Type.STRING },
                  },
                  required: ['reply', 'includeAction'],
                },
              },
            })
          );

          const rawText = (response.text ?? '').trim();
          const jsonCandidate = safeParseAiJson<ChatAiPayload>(rawText);
          if (jsonCandidate && typeof jsonCandidate.reply === 'string') {
            parsed = jsonCandidate;
          } else if (rawText.length > 0) {
            rawFallbackReply = rawText;
          }
        } catch {
          const plainResponse = await withAiRetry(() =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Live Telemetry: ${JSON.stringify(snapshot)}\nHistory: ${historyText}\nQuestion: ${cleanMsg}`,
              config: {
                systemInstruction:
                  'You are AZEX, a helpful young male AI copilot built by Ashish Kumar (Team AZEX). Answer the user question directly, clearly, and accurately in plain helpful prose under 160 words.',
              },
            })
          );
          rawFallbackReply = (plainResponse.text ?? '').trim();
        }
      } else {
        const groqResp = await withAiRetry(() =>
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content:
                    'You are AZEX, a helpful young male AI copilot built by Ashish Kumar (Team AZEX) inside ValueDesk. Answer ALL questions accurately (portfolio telemetry, SoSoValue, Web3, AI/ML, or general questions). Return JSON with keys: reply (string), includeAction (boolean), actionType (SSI_TRADE or RUN_AGENTS), symbol (MAG7.ssi|DEFI.ssi|MEME.ssi|USSI), side (MINT|REDEEM), amountInput (number), actionLabel (string).',
                },
                {
                  role: 'user',
                  content: `Telemetry: ${JSON.stringify(snapshot)}\nHistory: ${historyText}\nQuestion: ${cleanMsg}`,
                },
              ],
            }),
          })
        );
        if (!groqResp.ok) {
          throw new Error('AZEX AI provider request failed.');
        }
        const groqData = (await groqResp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawText = (groqData.choices?.[0]?.message?.content ?? '').trim();
        const jsonCandidate = safeParseAiJson<ChatAiPayload>(rawText);
        if (jsonCandidate && typeof jsonCandidate.reply === 'string') {
          parsed = jsonCandidate;
        } else {
          rawFallbackReply = rawText;
        }
      }

      const finalReply = (parsed.reply || rawFallbackReply || '').trim();
      if (!finalReply) {
        throw new Error('AZEX AI returned an empty response. Please try asking again.');
      }

      const validSymbols = new Set<SsiSymbol>(['MAG7.ssi', 'DEFI.ssi', 'MEME.ssi', 'USSI']);
      let suggestedAction: AzexExecutableAction | null = null;
      if (parsed.includeAction) {
        if (parsed.actionType === 'RUN_AGENTS') {
          suggestedAction = {
            type: 'RUN_AGENTS',
            label: parsed.actionLabel || 'Run Autonomous Agent Cycle',
          };
        } else {
          const sym = validSymbols.has(parsed.symbol as SsiSymbol)
            ? (parsed.symbol as SsiSymbol)
            : 'USSI';
          const side: 'MINT' | 'REDEEM' = parsed.side === 'REDEEM' ? 'REDEEM' : 'MINT';
          const amt = Math.max(500, Math.min(20000, Math.round(Number(parsed.amountInput) || 2500)));
          suggestedAction = {
            type: 'SSI_TRADE',
            symbol: sym,
            side,
            amountInput: amt,
            label:
              parsed.actionLabel ||
              `${side === 'MINT' ? 'Mint' : 'Redeem'} ${side === 'MINT' ? `$${amt.toLocaleString()} USDC of ` : `${amt} `}${sym}`,
          };
        }
      }

      res.json({
        reply: finalReply,
        suggestedAction,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'AZEX AI assistant error.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`ValueDesk server running on ${port}`);
  });
}

startServer();
