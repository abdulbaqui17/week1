import { PillTabs } from './ui/PillTabs';
import { useAppStore, type TF } from '../store/app';

export default function ChartToolbar() {
  const tf = useAppStore((s) => s.tf);
  const setTf = useAppStore((s) => s.setTf);
  return (
    <div className="mb-2">
      <PillTabs<TF>
        items={[
          { key: '1m', label: '1m' },
          { key: '5m', label: '5m' },
          { key: '15m', label: '15m' },
        ]}
        value={tf}
        onChange={setTf}
      />
    </div>
  );
}
