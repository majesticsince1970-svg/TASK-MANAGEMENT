import { useNavigate } from 'react-router-dom';
import { Gem, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function PinLoginPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const demoUsers = [
    { id: '1', name: 'Hadi Muhammad', role: 'Owner' },
    { id: '2', name: 'Abdul Latif', role: 'Director' },
    { id: '3', name: 'James Sheary', role: 'Accounts Head' },
  ];

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // TODO: Verify PIN
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ivory)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-maroon)] flex items-center justify-center mx-auto mb-3">
            <Gem className="w-6 h-6 text-[var(--color-gold)]" />
          </div>
          <h2 className="text-xl font-bold">Shared Device Login</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-6">
          {!selectedUser ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-ink)]/60 mb-3">Select your name:</p>
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--color-ivory)] border border-transparent hover:border-[#E5DDD3] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-sm font-semibold text-[var(--color-maroon)]">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-[var(--color-ink)]/50">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setPin(''); }}
                className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 mb-4 hover:text-[var(--color-ink)]"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <p className="text-center text-sm text-[var(--color-ink)]/60 mb-4">Enter 4-digit PIN</p>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full ${
                      pin.length > i ? 'bg-[var(--color-maroon)]' : 'bg-[#E5DDD3]'
                    } transition-colors`}
                  />
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === '⌫') setPin(pin.slice(0, -1));
                      else if (key) handlePinDigit(key);
                    }}
                    disabled={!key}
                    className="h-14 rounded-xl text-xl font-semibold hover:bg-[var(--color-ivory)] active:bg-[var(--color-maroon)]/10 transition-colors disabled:invisible"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-[var(--color-maroon)] hover:underline"
          >
            Use email instead
          </button>
        </div>
      </div>
    </div>
  );
}

