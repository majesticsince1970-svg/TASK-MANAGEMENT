import { Button } from '@/components/ui/button';
import { Plus, FileText, Link2, ChevronRight } from 'lucide-react';

const TEMPLATES = [
  { id: '1', name: 'Payment List', dept: 'Accounts', proof: 'payment_list', timing: 'dated' },
  { id: '2', name: 'Stock Check', dept: 'Stock & Old Gold', proof: 'checklist', timing: 'dated' },
  { id: '3', name: 'Social Media Post', dept: 'Creative', proof: 'photo', timing: 'dated' },
];

const CHAINS = [
  { id: '1', name: 'Reel Pipeline', dept: 'Creative', steps: ['Shoot', 'Edit', 'Caption Approval', 'Post', 'Results after 48h'] },
];

export default function TemplatesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates & Chains</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Plus className="w-4 h-4" /> Template</Button>
          <Button size="sm"><Link2 className="w-4 h-4" /> Chain</Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4 hover:shadow-sm cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-[var(--color-maroon)]" />
                <h3 className="font-semibold text-sm">{t.name}</h3>
              </div>
              <div className="flex gap-2 text-xs text-[var(--color-ink)]/50">
                <span className="px-2 py-0.5 bg-[var(--color-ivory)] rounded-full">{t.dept}</span>
                <span className="px-2 py-0.5 bg-[var(--color-ivory)] rounded-full">{t.proof}</span>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 w-full text-xs">Use Template</Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Chains</h2>
        {CHAINS.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
            <div className="flex items-center gap-3 mb-3">
              <Link2 className="w-5 h-5 text-[var(--color-ai)]" />
              <h3 className="font-semibold">{c.name}</h3>
              <span className="text-xs text-[var(--color-ink)]/50">{c.dept}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {c.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-[var(--color-ivory)] rounded-lg">{i + 1}. {step}</span>
                  {i < c.steps.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--color-ink)]/20" />}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3">Start Chain</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

