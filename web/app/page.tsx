import Link from 'next/link';
import { redirect } from 'next/navigation';
import { opsLoginAction } from '@/app/vitalle-actions';
import { getSessionToken } from '@/lib/session';
import { getVitalleDevSession } from '@/lib/vitalle-session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [token, dev] = await Promise.all([getSessionToken(), getVitalleDevSession()]);

  if (token || dev) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-page">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <div className="auth-wordmark" aria-label="Vitalle Odontologia & Harmonização">
            <div className="auth-tooth-mark">V</div>
            <p className="display mt-7 text-[2.15rem] tracking-[0.22em] text-[var(--bone)]">VITALLE</p>
            <p className="mt-4 text-[0.68rem] uppercase tracking-[0.42em] text-[var(--bone-40)]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-[330px] grid-cols-2 gap-4">
            <Link href="/login" className="auth-choice">
              <span className="display text-[1.8rem] tracking-[0.04em]">ADM</span>
            </Link>
            <form action={opsLoginAction}>
              <button type="submit" className="auth-choice">
                <span className="display text-[1.8rem] tracking-[0.04em]">OPS</span>
              </button>
            </form>
          </div>

          <p className="mt-14 text-sm text-[var(--bone-40)]">Escolha o perfil de acesso para continuar.</p>
        </div>
      </section>
    </main>
  );
}
