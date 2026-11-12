import { useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PersonPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xl font-bold text-[var(--color-maroon)]">JS</div>
          <div>
            <h2 className="text-xl font-bold">James Sheary</h2>
            <p className="text-sm text-[var(--color-ink)]/50">Senior Account Manager · Accounts</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-[var(--color-success)]">92%</p>
            <p className="text-xs text-[var(--color-ink)]/40">On-time rate</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: CheckCircle2, label: 'Completed', value: '45', color: 'var(--color-success)' },
            { icon: Clock, label: 'Open', value: '8', color: 'var(--color-warning)' },
            { icon: TrendingUp, label: 'Points', value: '380', color: 'var(--color-maroon)' },
            { icon: Calendar, label: 'Date Changes', value: '2', color: 'var(--color-ink)' },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--color-ivory)] rounded-lg p-3 text-center">
              <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-[var(--color-ink)]/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5DDD3] p-5">
        <h3 className="font-semibold mb-3">Today's Timeline</h3>
        <div className="space-y-3">
          {[
            { time: '9:05 AM', event: 'Logged in', type: 'login' },
            { time: '9:12 AM', event: 'Started: Morning cash & safe count', type: 'start' },
            { time: '9:45 AM', event: 'Submitted: Morning cash & safe count (₹4,82,300)', type: 'submit' },
            { time: '10:00 AM', event: 'Started: Payments due list', type: 'start' },
            { time: '11:23 AM', event: 'Still working on: Payments due list', type: 'active' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-xs text-[var(--color-ink)]/40 w-16 shrink-0">{e.time}</span>
              <div className="w-2 h-2 rounded-full bg-[var(--color-maroon)] shrink-0" />
              <span>{e.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

