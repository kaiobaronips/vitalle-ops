import Link from 'next/link';
import Image from 'next/image';
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
      <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-md text-center">
          <div className="auth-wordmark" aria-label="Vitalle Odontologia & Harmonização">
            <Image src="/brand/vitalle-tooth.png" alt="" width={547} height={539} priority className="auth-tooth-logo" />
            <p className="display mt-6 text-[1.9rem] tracking-[0.2em] text-[var(--bone)] sm:mt-7 sm:text-[2.15rem] sm:tracking-[0.22em]">VITALLE</p>
            <p className="mt-3 text-[0.62rem] uppercase tracking-[0.32em] text-[var(--bone-40)] sm:mt-4 sm:text-[0.68rem] sm:tracking-[0.42em]">
              Odontologia & Harmonização
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[310px] grid-cols-2 gap-3 sm:mt-16 sm:max-w-[330px] sm:gap-4">
            <Link href="/login" className="auth-choice">
              <span className="display text-[1.55rem] tracking-[0.04em] sm:text-[1.8rem]">ADM</span>
            </Link>
            <form action={opsLoginAction}>
              <button type="submit" className="auth-choice">
                <span className="display text-[1.55rem] tracking-[0.04em] sm:text-[1.8rem]">OPS</span>
              </button>
            </form>
          </div>

          <p className="mt-10 text-sm text-[var(--bone-40)] sm:mt-14">Escolha o perfil de acesso para continuar.</p>
        </div>
      </section>
    </main>
  );
}
