import React, { useEffect, useState } from 'react';

type Tone = 'success' | 'error' | 'info';
export interface Toast { id: string; title: string; body?: string; tone?: Tone; ttlMs?: number }

const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function emit() { for (const l of listeners) l(toasts); }

export function addToast(t: Toast) {
	const ttl = t.ttlMs ?? 4000;
	toasts = [t, ...toasts.filter(x => x.id !== t.id)].slice(0, 6);
	emit();
	if (ttl > 0) setTimeout(() => { removeToast(t.id); }, ttl);
}
export function removeToast(id: string) { toasts = toasts.filter(t => t.id !== id); emit(); }

export function ToastViewport() {
	const [list, setList] = useState<Toast[]>(toasts);
	useEffect(() => { const fn = (t: Toast[]) => setList([...t]); listeners.add(fn); return () => { listeners.delete(fn); }; }, []);
	return (
		<div className="fixed z-50 top-2 right-2 space-y-2 w-64">
			{list.map(t => (
				<div key={t.id} className={`rounded border p-2 text-sm shadow bg-slate-900/90 backdrop-blur border-slate-700 ${t.tone==='success'?'text-green-300':t.tone==='error'?'text-red-300':'text-slate-200'}`}> 
					<div className="font-semibold">{t.title}</div>
					{t.body && <div className="text-xs opacity-80">{t.body}</div>}
				</div>
			))}
		</div>
	);
}

// Auto-mount viewport in app root if running in browser
if (typeof window !== 'undefined') {
	const id = 'toast-viewport-root';
	let host = document.getElementById(id);
	if (!host) { host = document.createElement('div'); host.id = id; document.body.appendChild(host); }
	// Lazy hydrate
	import('react-dom').then(r => { const { createRoot } = r as any; createRoot(host!).render(React.createElement(ToastViewport)); });
}

export default ToastViewport;
