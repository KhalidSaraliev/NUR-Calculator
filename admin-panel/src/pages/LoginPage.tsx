import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { requestOtp, verifyOtp, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await requestOtp(phone);
      setStep('code');
    } catch {
      setError('Не удалось отправить код. Проверьте номер телефона.');
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await verifyOtp(phone, code);
      if (result === 'ok') {
        navigate('/', { replace: true });
      } else if (result === 'forbidden') {
        setError('У этого аккаунта нет прав администратора компании.');
      } else {
        setError('Профиль не найден. Сначала завершите регистрацию в приложении NUR Chat.');
      }
    } catch {
      setError('Неверный или истёкший код.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nur-mist px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-card">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-semibold tracking-tight text-nur-emerald">
            NUR<span className="text-nur-gold">.</span>Chat
          </span>
          <p className="mt-2 text-sm text-nur-ink/60">Вход в админ-панель компании</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="text-sm font-medium text-nur-ink/70">
                Номер телефона
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="+7 700 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-nur-line px-3 py-2.5 text-sm outline-none focus-visible:border-nur-forest"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-nur-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-nur-emerald disabled:opacity-60"
            >
              {loading ? 'Отправляем код…' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="text-sm font-medium text-nur-ink/70">
                Код из SMS
              </label>
              <input
                id="code"
                type="text"
                required
                inputMode="numeric"
                placeholder="1234"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-nur-line px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus-visible:border-nur-forest"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-nur-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-nur-emerald disabled:opacity-60"
            >
              {loading ? 'Проверяем…' : 'Войти'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-center text-xs text-nur-ink/50 hover:underline"
            >
              Изменить номер
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
