import cn from 'classnames';

type Item<T extends string> = { key: T; label: string };

export function PillTabs<T extends string>({ items, value, onChange, className }: { items: Item<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)} role="tablist">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn('text-xs px-2 py-1 rounded border', active ? 'bg-slate-800/60 text-white border-slate-600' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700')}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
