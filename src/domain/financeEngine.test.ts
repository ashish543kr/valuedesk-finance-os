import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_SPOT_SNAPSHOT,
  SSI_INDEX_CATALOG,
  addClientMandate,
  buildAllIndexQuotes,
  buildOrderbookSnapshot,
  calculateIndexNav,
  calculateMintRedeemQuote,
  calculatePortfolioSummary,
  calculateRebalancePlan,
  createInitialDeskState,
  evaluateAgentCycle,
  executeBatchRebalance,
  executeSodexOrder,
  executeSsiTrade,
  runPortfolioStressTest,
} from './financeEngine';

test('SSI index constituent weights sum to 1.0 and compute positive NAV', () => {
  for (const def of SSI_INDEX_CATALOG) {
    const totalWeight = def.constituents.reduce((sum, c) => sum + c.weight, 0);
    assert.ok(Math.abs(totalWeight - 1) < 0.0001, `${def.symbol} weights should sum to 1`);
    const quote = calculateIndexNav(def, BASE_SPOT_SNAPSHOT);
    assert.ok(quote.nav > 0);
  }
});

test('Mint and Redeem quotes conserve net value after fees', () => {
  const mintQuote = calculateMintRedeemQuote({
    side: 'MINT',
    amountInput: 10000,
    nav: 1.25,
    feeBps: 40,
    slippageBps: 0,
  });
  assert.equal(mintQuote.grossUsd, 10000);
  assert.equal(mintQuote.totalFeeUsd, 40);
  assert.equal(mintQuote.netUsd, 9960);
  assert.equal(mintQuote.tokenQuantity, 7968);

  const redeemQuote = calculateMintRedeemQuote({
    side: 'REDEEM',
    amountInput: 1000,
    nav: 1.25,
    feeBps: 40,
    slippageBps: 0,
  });
  assert.equal(redeemQuote.grossUsd, 1250);
  assert.equal(redeemQuote.totalFeeUsd, 5);
  assert.equal(redeemQuote.netUsd, 1245);
});

test('SSI minting updates cash, position holdings, operator revenue, and receipts', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);
  const { nextState, receipt } = executeSsiTrade(
    initialState,
    { symbol: 'MAG7.ssi', side: 'MINT', amountInput: 5000 },
    quotes
  );

  assert.equal(nextState.cashUsdc, initialState.cashUsdc - 5000);
  assert.ok(nextState.positions['MAG7.ssi'].quantity > initialState.positions['MAG7.ssi'].quantity);
  assert.ok(nextState.operatorRevenueUsd.wrapSpreadFees > initialState.operatorRevenueUsd.wrapSpreadFees);
  assert.equal(nextState.receipts[0].id, receipt.id);
});

test('SoDEX buy and sell order updates position and validates insufficient balance', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);

  assert.throws(() => {
    executeSodexOrder(
      initialState,
      { pair: 'BTC/USDC', side: 'BUY', orderType: 'MARKET', quantity: 10 },
      BASE_SPOT_SNAPSHOT,
      quotes
    );
  });

  const { nextState } = executeSodexOrder(
    initialState,
    { pair: 'ETH/USDC', side: 'BUY', orderType: 'LIMIT', quantity: 1, limitPrice: 3400 },
    BASE_SPOT_SNAPSHOT,
    quotes
  );

  assert.equal(nextState.positions.ETH.quantity, initialState.positions.ETH.quantity + 1);
  assert.ok(nextState.operatorRevenueUsd.sodexRebates > initialState.operatorRevenueUsd.sodexRebates);
});

test('Autonomous agent cycle evaluates enabled rules and increases AUM revenue', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);
  const beforeSummary = calculatePortfolioSummary(initialState, BASE_SPOT_SNAPSHOT, quotes);

  const cycleResult = evaluateAgentCycle(initialState, quotes);
  assert.ok(cycleResult.executedAgents.length >= 1);
  assert.ok(cycleResult.receipts.length >= 1);

  const afterSummary = calculatePortfolioSummary(cycleResult.nextState, BASE_SPOT_SNAPSHOT, quotes);
  assert.ok(afterSummary.totalOperatorRevenueUsd > beforeSummary.totalOperatorRevenueUsd);
});

test('Client mandate creation increases AUM, active mandate count, and orderbook spread is valid', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);
  const { nextState, mandate } = addClientMandate(
    initialState,
    {
      clientName: 'Horizon DAO',
      strategyLabel: 'MAG7 Growth',
      allocatedIndex: 'MAG7.ssi',
      principalUsd: 15000,
      managementFeeBps: 75,
      carryPct: 10,
    },
    quotes
  );

  assert.equal(nextState.mandates.length, initialState.mandates.length + 1);
  assert.equal(nextState.mandates[0].id, mandate.id);

  const book = buildOrderbookSnapshot(1.24, 8);
  assert.equal(book.bids.length, 8);
  assert.equal(book.asks.length, 8);
  assert.ok(book.asks[0].price > book.bids[0].price);
});

test('Portfolio stress testing models macro drawdown and bull breakout accurately', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);

  const bull = runPortfolioStressTest(initialState, BASE_SPOT_SNAPSHOT, quotes, 'bull_breakout');
  const shock = runPortfolioStressTest(initialState, BASE_SPOT_SNAPSHOT, quotes, 'macro_shock');

  assert.ok(bull.pnlImpactUsd > 0);
  assert.ok(shock.pnlImpactUsd < 0);
  assert.ok(shock.ussiHedgeContributionUsd > 0);
  assert.ok(bull.projectedAnnualFeeUsd > shock.projectedAnnualFeeUsd);
});

test('Model portfolio rebalance computes legs and settles atomically', () => {
  const initialState = createInitialDeskState();
  const quotes = buildAllIndexQuotes(BASE_SPOT_SNAPSHOT);
  const plan = calculateRebalancePlan(initialState, quotes, 'carry_fortress');

  assert.ok(plan.length >= 2);
  const ussiLeg = plan.find((l) => l.symbol === 'USSI');
  assert.ok(ussiLeg && ussiLeg.side === 'MINT');

  const result = executeBatchRebalance(initialState, 'carry_fortress', quotes);
  assert.equal(result.legsExecuted, result.receipts.length);
  assert.ok(result.nextState.positions.USSI.quantity > initialState.positions.USSI.quantity);
});

