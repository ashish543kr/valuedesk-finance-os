import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Send, X } from 'lucide-react';
import {
  AzexChatMessage,
  AzexExecutableAction,
  PortfolioSummary,
  SsiSymbol,
} from '../types/finance';
import { formatUsd } from '../utils/formatters';
import { AzexAvatar } from './AzexAvatar';

interface AzexAssistantProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  summary: PortfolioSummary | null;
  latestBlockNumber: number;
  onExecuteSsiTrade: (payload: {
    symbol: SsiSymbol;
    side: 'MINT' | 'REDEEM';
    amountInput: number;
  }) => Promise<void>;
  onRunAgentCycle: () => Promise<{ executedAgents: string[] }>;
}

const QUICK_PROMPTS = [
  'Audit my portfolio risk & yield right now',
  'How does ValueChain L1 & SoDEX settlement work?',
  'Mint $2,500 USDC of USSI for delta-neutral carry',
  'Explain SoSoValue MAG7.ssi basket & AI/ML signals',
];

export function AzexAssistant({
  isOpen,
  onOpenChange,
  summary,
  latestBlockNumber,
  onExecuteSsiTrade,
  onRunAgentCycle,
}: AzexAssistantProps) {
  const [messages, setMessages] = useState<AzexChatMessage[]>([
    {
      id: 'azex-welcome',
      role: 'assistant',
      content:
        'Hi, I am AZEX, your AI quant copilot engineered by Ashish Kumar (Team AZEX). I monitor live SoSoValue SSI NAVs, SoDEX spreads, and ValueChain L1 telemetry to help you run a one-person on-chain fund. Ask me anything — from live portfolio audits and trade executions to Web3, SoSoValue OpenAPI, or AI/ML research.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function sendPrompt(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;

    const userMsg: AzexChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await resp.json()) as {
        reply?: string;
        suggestedAction?: AzexExecutableAction | null;
        error?: string;
      };

      if (!resp.ok || !data.reply) {
        throw new Error(data.error || 'AZEX AI request failed.');
      }

      const aiMsg: AzexChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        suggestedAction: data.suggestedAction ?? null,
        actionExecuted: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AZEX AI.');
    } finally {
      setSending(false);
    }
  }

  async function handleExecuteSuggestedAction(msgId: string, action: AzexExecutableAction) {
    setExecutingId(msgId);
    setError(null);
    try {
      if (action.type === 'RUN_AGENTS') {
        await onRunAgentCycle();
      } else if (action.type === 'SSI_TRADE' && action.symbol && action.side && action.amountInput) {
        await onExecuteSsiTrade({
          symbol: action.symbol,
          side: action.side,
          amountInput: action.amountInput,
        });
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, actionExecuted: true } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed.');
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open AZEX AI Assistant"
          className="fixed right-5 bottom-5 z-40 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-left text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:border-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          <AzexAvatar size={32} />
          <div className="pr-1">
            <div className="font-display text-xs font-semibold leading-tight text-white">
              Ask AZEX AI
            </div>
            <div className="font-mono text-[10px] leading-tight text-slate-400">
              Quant Copilot
            </div>
          </div>
        </button>
      )}

      {isOpen && (
        <aside
          aria-label="AZEX AI Assistant"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <AzexAvatar size={42} thinking={sending} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                    AZEX
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · AI Quant Copilot
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {summary ? `AUM ${formatUsd(summary.totalAumUsd)} · Block #${latestBlockNumber}` : 'ValueChain Telemetry Linked'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close AZEX AI Assistant"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && <AzexAvatar size={30} className="mt-0.5 shrink-0" />}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white dark:bg-orange-600'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {!isUser && msg.suggestedAction && (
                      <div className="mt-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                        <button
                          type="button"
                          disabled={Boolean(msg.actionExecuted) || executingId === msg.id}
                          onClick={() =>
                            handleExecuteSuggestedAction(msg.id, msg.suggestedAction!)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            msg.actionExecuted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500'
                          }`}
                        >
                          {msg.actionExecuted ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Settled on ValueChain L1
                            </>
                          ) : executingId === msg.id ? (
                            'Executing...'
                          ) : (
                            <>
                              {msg.suggestedAction.label}
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2.5">
                <AzexAvatar size={30} thinking />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  AZEX is computing live SSI telemetry...
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          <div className="border-t border-slate-200 p-3.5 dark:border-slate-800">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => sendPrompt(q)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] font-medium text-slate-700 transition-colors hover:border-orange-500 hover:text-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="Ask AZEX AI a question"
                placeholder="Ask AZEX about SSI NAVs, risk, or trades..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message to AZEX"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-orange-600 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-500"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
