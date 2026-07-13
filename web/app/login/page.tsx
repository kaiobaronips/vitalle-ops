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
          <div className="flex flex-col items-center">
            <div className="brand-mark" aria-hidden="true">
              V
            </div>
            <p className="mt-6 font-display text-4xl tracking-[0.18em] text-[var(--bone)]">VITALLE</p>
            <p className="mt-3 text-[0.66rem] uppercase tracking-[0.35em] text-[var(--bone-40)]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="auth-panel mt-16 px-6 py-8 sm:px-8 sm:py-10">
            <p className="auth-label text-center text-[var(--bone-60)]">Senha de acesso</p>
            <div className="mt-5">
              <VitalleLoginForm />
            </div>
            <p className="mt-12 text-center text-sm text-[var(--bone-40)]">Painel gerencial · acesso restrito</p>
          </div>
        </div>
      </section>
    </main>
  );
}
