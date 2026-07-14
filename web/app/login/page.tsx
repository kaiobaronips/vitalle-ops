import { redirect } from 'next/navigation';
import Image from 'next/image';
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
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-5 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-[560px] text-center">
          <div className="auth-wordmark" aria-label="Vitalle Odontologia & Harmonização">
            <Image src="/brand/vitalle-tooth.png" alt="" width={547} height={539} priority className="auth-tooth-logo" />
            <p className="display mt-6 text-[1.9rem] tracking-[0.2em] text-[var(--bone)] sm:mt-7 sm:text-[2.15rem] sm:tracking-[0.22em]">VITALLE</p>
            <p className="mt-3 text-[0.62rem] uppercase tracking-[0.32em] text-[var(--bone-40)] sm:mt-4 sm:text-[0.68rem] sm:tracking-[0.42em]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="mt-12 sm:mt-16">
            <VitalleLoginForm />
            <p className="mt-10 text-center text-sm text-[var(--bone-40)] sm:mt-12">Painel gerencial · acesso restrito</p>
          </div>
        </div>
      </section>
    </main>
  );
}
