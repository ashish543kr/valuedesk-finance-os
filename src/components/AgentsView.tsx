import { useState } from 'react';
import { Bot, Play, Sparkles } from 'lucide-react';
import { AiStrategyProposal, DeskState, SsiIndexQuote, SsiSymbol } from '../types/finance';
import { formatRelativeTime, formatUsd } from '../utils/formatters';

interface AgentsViewProps {
  state: DeskState;
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  onToggleAgent: (agentId: string) => Promise<void>;
  onRunAgentCycle: () => Promise<{ executedAgents: string[] }>;
  onExecuteProposalAction: (action: {
    symbol: SsiSymbol;
    side: 'MINT' | 'REDEEM';
    amountInput: number;
  }) => Promise<void>;
}

export function AgentsView({
  state,
  indexQuotes,
  onToggleAgent,
  onRunAgentCycle,
  onExecuteProposalAction,
}: AgentsViewProps) {
  const [runningCycle, setRunningCycle] = useState(false);
  const [cycleMessage, setCycleMessage] = useState<string | null>(null);
  const [directive, setDirective] = useState(
    'Maximize risk-adjusted yield across MAG7.ssi and USSI while capturing management wrap fees.'
  );
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiStrategyProposal | null>(null);
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [executedIndices, setExecutedIndices] = useState<Record<number, boolean>>({});

  async function handleRunCycle() {
    setRunningCycle(true);
    setCycleMessage(null);
    try {
      const res = await onRunAgentCycle();
      if (res.executedAgents.length > 0) {
        setCycleMessage(
          `Executed ${res.executedAgents.length} rule(s): ${res.executedAgents.join(', ')}.`
        );
      } else {
        setCycleMessage('Evaluated all active mandates. Thresholds are within nominal range.');
      }
    } finally {
      setRunningCycle(false);
    }
  }

  async function handleGenerateStrategy(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzingAi(true);
    setAiError(null);
    setExecutedIndices({});

    try {
      const resp = await fetch('/api/ai/strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorDirective: directive }),
      });
      const data = (await resp.json()) as { proposal?: AiStrategyProposal; error?: string };
      if (!resp.ok || !data.proposal) {
        throw new Error(data.error || 'Unable to generate AI strategy proposal.');
      }
      setProposal(data.proposal);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI strategist request failed.');
    } finally {
      setAnalyzingAi(false);
    }
  }

  async function handleExecuteAction(idx: number) {
    if (!proposal) return;
    const action = proposal.recommendedActions[idx];
    if (!action) return;
    setExecutingIdx(idx);
    setAiError(null);
    try {
      const nav = indexQuotes[action.targetAsset]?.nav ?? 1;
      const amountInput =
        action.actionType === 'REDEEM'
          ? Number((action.allocationUsdc / nav).toFixed(4))
          : action.allocationUsdc;

      await onExecuteProposalAction({
        symbol: action.targetAsset,
        side: action.actionType === 'REDEEM' ? 'REDEEM' : 'MINT',
        amountInput,
      });
      setExecutedIndices((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to execute proposed action.');
    } finally {
      setExecutingIdx(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Autonomous Agentic Desk
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Automate one-person fund operations with deterministic rules and Gemini quant strategy proposals.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunCycle}
          disabled={runningCycle}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
        >
          <Play className="h-4 w-4" />
          {runningCycle ? 'Running Cycle...' : 'Run Agent Cycle'}
        </button>
      </div>

      {cycleMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {cycleMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                Deterministic Mandate Engines
              </h2>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {state.agents.filter((a) => a.enabled).length} active
              </span>
            </div>

            {state.agents.map((agent) => {
              const targetQuote = indexQuotes[agent.targetAsset];
              return (
                <div key={agent.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2.5">
                        <Bot className="h-4 w-4 text-orange-600" />
                        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                          {agent.name}
                        </h3>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          · {agent.targetAsset}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {agent.triggerDescription}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={agent.enabled}
                      aria-label={`Toggle ${agent.name}`}
                      onClick={() => onToggleAgent(agent.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        agent.enabled
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {agent.enabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-4 font-mono">
                      <span>Executions: {agent.executionsCount}</span>
                      <span>Fees Earned: {formatUsd(agent.revenueGeneratedUsd)}</span>
                      {targetQuote && <span>Live APR: {targetQuote.yieldAprPct.toFixed(1)}%</span>}
                    </div>
                    <span>
                      {agent.lastRunAt ? `Last run ${formatRelativeTime(agent.lastRunAt)}` : 'Standby'}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {agent.lastActionSummary}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                AI Quant Strategist
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Analyzes live SSI index NAVs, catalyst news, and treasury reserves to propose executable basket rebalances.
            </p>

            <form onSubmit={handleGenerateStrategy} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="operator-directive"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Operator Mandate Directive
                </label>
                <textarea
                  id="operator-directive"
                  rows={3}
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={analyzingAi}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
              >
                {analyzingAi ? 'Synthesizing Market Structure...' : 'Generate Strategy Proposal'}
              </button>
            </form>

            {aiError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {aiError}
              </div>
            )}

            {proposal && (
              <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {proposal.marketRegime}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    Confidence {proposal.confidencePct}%
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {proposal.thesis}
                </p>

                <div className="space-y-2.5">
                  {proposal.recommendedActions.map((act, idx) => {
                    const isDone = Boolean(executedIndices[idx]);
                    const isBusy = executingIdx === idx;
                    return (
                      <div
                        key={`${act.targetAsset}-${idx}`}
                        className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-xs font-semibold text-slate-950 dark:text-white">
                            {act.actionType} {act.targetAsset} · {formatUsd(act.allocationUsdc)}
                          </div>
                          <button
                            type="button"
                            disabled={isDone || isBusy}
                            onClick={() => handleExecuteAction(idx)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-orange-600 dark:bg-orange-600'
                            }`}
                          >
                            {isDone ? 'Executed' : isBusy ? 'Settling...' : 'Execute'}
                          </button>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          Impact: {act.expectedYieldImpact}
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {act.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {proposal.riskWarnings.length > 0 && (
                  <div className="space-y-1 border-t border-slate-200 pt-3 text-xs text-amber-700 dark:border-slate-800 dark:text-amber-400">
                    {proposal.riskWarnings.map((warn, idx) => (
                      <div key={idx}>Risk note: {warn}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
