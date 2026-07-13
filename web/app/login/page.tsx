import { redirect } from 'next/navigation';
import { VitalleLoginForm } from '@/components/vitalle/VitalleLoginForm';
import { getSessionToken } from '@/lib/session';
import { getVitalleDevSession } from '@/lib/vitalle-session';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const [token, devSession] = await Promise.all([getSessionToken(), getVitalleDevSession()]);
  if (token || devSession) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-page">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-[560px] text-center">
          <div className="auth-wordmark" aria-label="Vitalle Odontologia & Harmonização">
            <div className="auth-tooth-mark">V</div>
            <p className="display mt-7 text-[2.15rem] tracking-[0.22em] text-[var(--bone)]">VITALLE</p>
            <p className="mt-4 text-[0.68rem] uppercase tracking-[0.42em] text-[var(--bone-40)]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="mt-16">
            <VitalleLoginForm />
            <p className="mt-12 text-center text-sm text-[var(--bone-40)]">Painel gerencial · acesso restrito</p>
          </div>
        </div>
      </section>
    </main>
  );
}
