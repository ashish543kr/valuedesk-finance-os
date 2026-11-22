import { WorkspaceTab } from '../types/finance';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenMintModal: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'sodex', label: 'SoDEX Desk' },
  { id: 'agents', label: 'AI Agents' },
  { id: 'treasury', label: 'Treasury' },
];

export function TopBar({ activeTab, onSelectTab, onOpenMintModal }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className="flex shrink-0 items-center gap-2.5 text-left whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <polygon
              points="16,2 28,9 28,23 16,30 4,23 4,9"
              className="fill-slate-900 dark:fill-slate-100"
            />
            <path
              d="M11 11.5H20.5V14.5H14V16H20.5V21H11V18H17.5V16.5H11V11.5Z"
              className="fill-white dark:fill-slate-950"
            />
            <rect x="20" y="15" width="3.5" height="3.5" fill="#EA431F" />
          </svg>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-100">
            ValueDesk
          </span>
        </button>

        <nav aria-label="Workspace navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 ${
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-orange-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onOpenMintModal}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
          >
            Mint / Redeem
          </button>
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-around border-t border-slate-200 px-2 py-1.5 dark:border-slate-800"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 rounded-md transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-orange-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
