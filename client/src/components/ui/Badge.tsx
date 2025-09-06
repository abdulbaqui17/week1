import cn from 'classnames';

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('bg-slate-800/60 text-slate-300 rounded px-2 py-0.5 text-xs', className)}>{children}</span>;
}
