import cn from 'classnames';
import { forwardRef } from 'react';

type Variant = 'default' | 'primary' | 'destructive' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base = 'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed';
const variants: Record<Variant, string> = {
  default: 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600',
  primary: 'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600', // BUY
  destructive: 'bg-rose-500 text-white hover:bg-rose-600 border border-rose-600', // SELL
  ghost: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700',
  subtle: 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3',
  md: 'h-9 px-3',
  lg: 'h-11 px-4 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Btn({ className, variant = 'default', size = 'md', ...props }, ref) {
  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});
