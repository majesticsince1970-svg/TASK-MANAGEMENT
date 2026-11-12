import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      navigate('/');
    } catch {
      setError(t('auth.invalid'));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ivory)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-maroon)] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Gem className="w-8 h-8 text-[var(--color-gold)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-ink)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {t('app.name')}
          </h1>
          <p className="text-sm text-[var(--color-ink)]/50 mt-1">Majestic Jewellers · Since 1970</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-8 relative overflow-hidden">
          {/* Gold top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-maroon)] to-[var(--color-gold)]" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] focus:outline-none focus:ring-2 focus:ring-[var(--color-maroon)] text-sm"
                placeholder="name@majesticjewellers.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] focus:outline-none focus:ring-2 focus:ring-[var(--color-maroon)] text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--color-urgent)] bg-[var(--color-urgent)]/5 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? t('auth.logging_in') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/pin')}
              className="text-sm text-[var(--color-maroon)] hover:underline"
            >
              Use PIN instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

