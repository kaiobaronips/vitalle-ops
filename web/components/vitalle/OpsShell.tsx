import type { ReactNode } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/vitalle-actions';
import type { PrincipalContext } from '@/lib/vitalle-types';

type OpsShellProps = {
  children: ReactNode;
  principal: PrincipalContext;
  title: string;
  subtitle?: string;
  accentLabel?: string;
  headerAction?: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const opsItems: NavItem[] = [
  { href: '/setores/avaliador', label: 'Avaliador', icon: 'A' },
  { href: '/setores/asb', label: 'Auxiliar em Saude Bucal (ASB)', icon: 'B' },
  { href: '/setores/secretaria-recepcao', label: 'Secretaria / Recepção', icon: 'S' },
  { href: '/setores/marketing-comercial', label: 'Marketing / Comercial', icon: 'M' },
];

const adminItems: NavItem[] = [
  { href: '/dashboard', label: 'Visão Geral', icon: '□' },
  { href: '/setores', label: 'Setores', icon: '◌' },
  { href: '/historico', label: 'Historico', icon: '◷' },
  { href: '/admin/configuracoes', label: 'Configuração', icon: '⚙' },
];

function navItems(adminLike: boolean) {
  return adminLike ? adminItems : opsItems;
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function activeItem(title: string, item: NavItem) {
  const normalizedTitle = normalize(title);
  const normalizedLabel = normalize(item.label);
  return normalizedTitle.includes(normalizedLabel.split(' ')[0]);
}

function VitalleMark() {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--gold)]/35 text-[var(--gold)]">
      <span className="display text-3xl leading-none">V</span>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative flex min-h-12 items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors ${
        active
          ? 'bg-white/[0.045] text-[var(--bone)]'
          : 'text-[var(--bone-60)] hover:bg-white/[0.025] hover:text-[var(--bone)]'
      }`}
    >
      {active ? <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[var(--gold)]" /> : null}
      <span className={`grid h-5 w-5 place-items-center text-xs ${active ? 'text-[var(--gold)]' : 'text-[var(--bone-40)]'}`}>
        {item.icon}
      </span>
      <span className="leading-tight">{item.label}</span>
    </Link>
  );
}

export function OpsShell({ children, principal, title, subtitle, accentLabel: _accentLabel = 'VITALLE OPS', headerAction }: OpsShellProps) {
  const items = navItems(principal.admin_like);
  const activeFallback = principal.admin_like ? 'Visão Geral' : '';

  return (
    <div className="min-h-screen bg-[var(--bone)] text-[var(--noir)] lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[278px] flex-col bg-[var(--ink)] text-[var(--bone)] lg:flex">
        <div className="border-b border-white/[0.06] px-8 pb-8 pt-9">
          <Link href="/" className="flex items-center gap-4">
            <VitalleMark />
            <span className="leading-none">
              <span className="display block text-[1.8rem] tracking-[0.16em] text-[var(--bone)]">VITALLE</span>
              <span className="mt-2 block text-[0.62rem] uppercase tracking-[0.26em] text-[var(--bone-40)]">Odontologia</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-8">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={activeItem(title || activeFallback, item) || (!title && item.label === activeFallback)}
            />
          ))}
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-7">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm text-[var(--bone-60)] transition-colors hover:bg-white/[0.025] hover:text-[var(--bone)]"
            >
              <span className="grid h-5 w-5 place-items-center text-lg text-[var(--bone-40)]">↳</span>
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-[278px]">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bone)]/90 backdrop-blur-md">
          <div className="flex min-h-[5.25rem] items-center justify-between gap-4 px-5 py-4 lg:px-10">
            <div>
              <h1 className="display text-3xl leading-none text-[var(--noir)]">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-[var(--stone)]">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-3">
              {headerAction}
              <form action={logoutAction} className="lg:hidden">
                <button type="submit" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm text-[var(--noir)]">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 lg:px-10">
          <div className="mx-auto max-w-[1400px] space-y-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
