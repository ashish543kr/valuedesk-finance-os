import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { DeskState, SsiIndexQuote, SsiSymbol } from '../types/finance';
import { calculateMintRedeemQuote } from '../domain/financeEngine';
import { formatQty, formatUsd } from '../utils/formatters';

interface MintRedeemModalProps {
  isOpen: boolean;
  initialSymbol: SsiSymbol;
  state: DeskState;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  onClose: () => void;
  onSubmitTrade: (payload: {
    symbol: SsiSymbol;
    side: 'MINT' | 'REDEEM';
    amountInput: number;
  }) => Promise<void>;
}

const SSI_SYMBOLS: SsiSymbol[] = ['MAG7.ssi', 'DEFI.ssi', 'MEME.ssi', 'USSI'];

export function MintRedeemModal({
  isOpen,
  initialSymbol,
  state,
  indexQuotes,
  onClose,
  onSubmitTrade,
}: MintRedeemModalProps) {
  const [symbol, setSymbol] = useState<SsiSymbol>(initialSymbol);
  const [side, setSide] = useState<'MINT' | 'REDEEM'>('MINT');
  const [amountInput, setAmountInput] = useState('2500');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSymbol(initialSymbol);
    setErrorMsg(null);
  }, [initialSymbol, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeQuote = indexQuotes[symbol];
  const heldQty = state.positions[symbol]?.quantity ?? 0;
  const parsedAmount = Math.max(0, Number(amountInput) || 0);

  const preview = calculateMintRedeemQuote({
    side,
    amountInput: parsedAmount,
    nav: activeQuote?.nav ?? 1,
    feeBps: activeQuote?.managementFeeBps ?? 35,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (parsedAmount <= 0) {
      setErrorMsg('Enter an amount greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitTrade({ symbol, side, amountInput: parsedAmount });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Transaction failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mint-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mint-modal-title" className="font-display text-lg font-bold text-slate-950 dark:text-white">
              SSI Protocol Mint &amp; Redeem
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Atomic multi-asset index settlement on ValueChain L1
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mint and Redeem dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['MINT', 'REDEEM'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSide(mode);
                  setAmountInput(mode === 'MINT' ? '2500' : '1000');
                }}
                className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  side === mode
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {mode === 'MINT' ? 'Mint Index Tokens' : 'Redeem to USDC'}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="ssi-index-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              SSI Index Basket
            </label>
            <select
              id="ssi-index-select"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as SsiSymbol)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {SSI_SYMBOLS.map((sym) => (
                <option key={sym} value={sym}>
                  {sym} — NAV ${indexQuotes[sym]?.nav.toFixed(4)} ({indexQuotes[sym]?.yieldAprPct}% APR)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="ssi-amount-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {side === 'MINT' ? 'Deposit Amount (USDC)' : `Redeem Quantity (${symbol})`}
              </label>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                Available:{' '}
                {side === 'MINT'
                  ? formatUsd(state.cashUsdc)
                  : `${formatQty(heldQty)} ${symbol}`}
              </span>
            </div>
            <input
              id="ssi-amount-input"
              type="number"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Effective Basket NAV</span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                ${preview.effectiveNav.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {side === 'MINT' ? 'Estimated Tokens Minted' : 'Net USDC Returned'}
              </span>
              <span className="font-mono font-semibold text-slate-950 dark:text-white">
                {side === 'MINT'
                  ? `${formatQty(preview.tokenQuantity)} ${symbol}`
                  : formatUsd(preview.netUsd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Solo Operator Revenue Share
              </span>
              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                +{formatUsd(preview.operatorFeeUsd)}
              </span>
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              {submitting
                ? 'Confirming on ValueChain...'
                : side === 'MINT'
                  ? `Confirm Mint ${symbol}`
                  : `Confirm Redeem ${symbol}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
