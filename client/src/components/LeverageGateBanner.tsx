export function LeverageGateBanner({ onEnable, onLearnMore }: { onEnable(): void; onLearnMore?(): void }) {
  return (
    <div className="mb-3 rounded-md border border-slate-800 bg-slate-900 p-3 text-[11px]">
      <div className="font-semibold text-slate-200 mb-1">Use leverage?</div>
      <div className="text-slate-400 mb-2">Amplify exposure with posted margin. Higher risk.</div>
      <div className="flex gap-2">
        <button type="button" onClick={onEnable} className="px-2.5 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200">Enable leverage</button>
  <a href="#" onClick={(e)=>{e.preventDefault(); (onLearnMore||onEnable)();}} className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 leading-7">Learn more</a>
      </div>
    </div>
  );
}
