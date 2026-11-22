import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SsiSymbol } from '../types/finance';

interface NewMandateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMandate: (payload: {
    clientName: string;
    strategyLabel: string;
    allocatedIndex: SsiSymbol;
    principalUsd: number;
    managementFeeBps: number;
    carryPct: number;
  }) => Promise<void>;
}

export function NewMandateModal({
  isOpen,
  onClose,
  onCreateMandate,
}: NewMandateModalProps) {
  const [clientName, setClientName] = useState('');
  const [strategyLabel, setStrategyLabel] = useState('Institutional Core Mandate');
  const [allocatedIndex, setAllocatedIndex] = useState<SsiSymbol>('MAG7.ssi');
  const [principalUsd, setPrincipalUsd] = useState('25000');
  const [managementFeeBps, setManagementFeeBps] = useState('75');
  const [carryPct, setCarryPct] = useState('12');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!clientName.trim()) {
      setErrorMsg('Client or DAO name is required.');
      return;
    }
    const principal = Number(principalUsd);
    if (!Number.isFinite(principal) || principal < 1000) {
      setErrorMsg('Minimum mandate principal is $1,000 USDC.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateMandate({
        clientName: clientName.trim(),
        strategyLabel: strategyLabel.trim(),
        allocatedIndex,
        principalUsd: principal,
        managementFeeBps: Number(managementFeeBps) || 75,
        carryPct: Number(carryPct) || 10,
      });
      setClientName('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to create mandate.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandate-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mandate-modal-title" className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Onboard Client Vault Mandate
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Allocates client USDC straight into an automated SSI basket on ValueChain L1.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mandate dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="mandate-client-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Client or Treasury Name
            </label>
            <input
              id="mandate-client-name"
              type="text"
              placeholder="e.g. Meridian Treasury DAO"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mandate-index"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                SSI Sleeve
              </label>
              <select
                id="mandate-index"
                value={allocatedIndex}
                onChange={(e) => setAllocatedIndex(e.target.value as SsiSymbol)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="MAG7.ssi">MAG7.ssi</option>
                <option value="USSI">USSI</option>
                <option value="DEFI.ssi">DEFI.ssi</option>
                <option value="MEME.ssi">MEME.ssi</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="mandate-principal"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Principal (USDC)
              </label>
              <input
                id="mandate-principal"
                type="number"
                min="1000"
                step="500"
                value={principalUsd}
                onChange={(e) => setPrincipalUsd(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mandate-fee-bps"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Management Fee (bps)
              </label>
              <input
                id="mandate-fee-bps"
                type="number"
                min="10"
                max="250"
                value={managementFeeBps}
                onChange={(e) => setManagementFeeBps(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="mandate-carry-pct"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Performance Carry (%)
              </label>
              <input
                id="mandate-carry-pct"
                type="number"
                min="0"
                max="35"
                value={carryPct}
                onChange={(e) => setCarryPct(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="mandate-strategy-label"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Mandate Description
            </label>
            <input
              id="mandate-strategy-label"
              type="text"
              value={strategyLabel}
              onChange={(e) => setStrategyLabel(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
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
              {submitting ? 'Deploying Vault...' : 'Create Mandate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
