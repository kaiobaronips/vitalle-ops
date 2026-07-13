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
          <div className="flex flex-col items-center">
            <div className="brand-mark" aria-hidden="true">
              V
            </div>
            <p className="mt-6 font-display text-4xl tracking-[0.18em] text-[var(--bone)]">VITALLE</p>
            <p className="mt-3 text-[0.66rem] uppercase tracking-[0.35em] text-[var(--bone-40)]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            <Link href="/login" className="auth-choice">
              <span className="display text-[2.05rem] tracking-[0.04em]">ADM</span>
            </Link>
            <form action={opsLoginAction}>
              <button type="submit" className="auth-choice">
                <span className="display text-[2.05rem] tracking-[0.04em]">OPS</span>
              </button>
            </form>
          </div>

          <p className="mt-14 text-sm text-[var(--bone-40)]">Escolha o perfil de acesso para continuar.</p>
        </div>
      </section>
    </main>
  );
}
