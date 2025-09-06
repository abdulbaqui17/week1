import cn from 'classnames';
import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Inp({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 px-3 rounded bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600',
        className
      )}
      {...props}
    />
  );
});
