import type { ReactNode } from 'react';
import Image from 'next/image';
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
  icon: IconName;
};

const opsItems: NavItem[] = [
  { href: '/setores/avaliador', label: 'Avaliador', icon: 'clipboard' },
  { href: '/setores/asb', label: 'Auxiliar em Saude Bucal (ASB)', icon: 'tooth' },
  { href: '/setores/secretaria-recepcao', label: 'Secretaria / Recepção', icon: 'calendar' },
  { href: '/setores/marketing-comercial', label: 'Marketing / Comercial', icon: 'megaphone' },
];

const adminItems: NavItem[] = [
  { href: '/dashboard', label: 'Visão Geral', icon: 'layout' },
  { href: '/admin/setores', label: 'Setores', icon: 'layers' },
  { href: '/historico', label: 'Historico', icon: 'history' },
  { href: '/admin/configuracoes', label: 'Configuração', icon: 'settings' },
];

type IconName = 'calendar' | 'clipboard' | 'history' | 'layers' | 'layout' | 'logout' | 'megaphone' | 'settings' | 'tooth';

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

function NavIcon({ name }: { name: IconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      {name === 'calendar' ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" {...common} />
          <path d="M8 3v4M16 3v4M4 10h16" {...common} />
        </>
      ) : null}
      {name === 'clipboard' ? (
        <>
          <path d="M9 4h6l1 2h2a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 6 6h2l1-2Z" {...common} />
          <path d="M9 13h6M9 16h4" {...common} />
        </>
      ) : null}
      {name === 'history' ? (
        <>
          <path d="M4 12a8 8 0 1 0 2.35-5.66L4 8.7" {...common} />
          <path d="M4 4.5V8.7h4.2M12 8v4l2.6 1.6" {...common} />
        </>
      ) : null}
      {name === 'layers' ? (
        <>
          <path d="m12 3 8 4-8 4-8-4 8-4Z" {...common} />
          <path d="m4 12 8 4 8-4M4 17l8 4 8-4" {...common} />
        </>
      ) : null}
      {name === 'layout' ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" {...common} />
          <rect x="13" y="4" width="7" height="7" rx="1.5" {...common} />
          <rect x="4" y="13" width="7" height="7" rx="1.5" {...common} />
          <rect x="13" y="13" width="7" height="7" rx="1.5" {...common} />
        </>
      ) : null}
      {name === 'logout' ? (
        <>
          <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" {...common} />
          <path d="M14 8l4 4-4 4M18 12H9" {...common} />
        </>
      ) : null}
      {name === 'megaphone' ? (
        <>
          <path d="M5 13h3l9 4V7l-9 4H5a2 2 0 0 0 0 4Z" {...common} />
          <path d="m8 15 1.2 4H12" {...common} />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" {...common} />
          <path d="m19 12 1.5-1.2-1.6-2.8-1.9.7a7.3 7.3 0 0 0-1.5-.9L15.2 6h-3.4l-.3 1.8c-.5.2-1 .5-1.5.9L8.1 8l-1.6 2.8L8 12l-1.5 1.2L8.1 16l1.9-.7c.5.4 1 .7 1.5.9l.3 1.8h3.4l.3-1.8c.5-.2 1-.5 1.5-.9l1.9.7 1.6-2.8L19 12Z" {...common} />
        </>
      ) : null}
      {name === 'tooth' ? (
        <>
          <path d="M8.5 4.4c1.4 0 2.1.9 3.5.9s2.1-.9 3.5-.9c2.1 0 3.5 1.8 3.2 4.1-.2 1.8-1.1 3.4-1.8 5-.9 2-1.3 5.1-3 5.1-1.2 0-1.1-2.4-1.9-2.4s-.7 2.4-1.9 2.4c-1.7 0-2.1-3.1-3-5.1-.7-1.6-1.6-3.2-1.8-5-.3-2.3 1.1-4.1 3.2-4.1Z" {...common} />
        </>
      ) : null}
    </svg>
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
      <span className={`grid h-5 w-5 place-items-center ${active ? 'text-[var(--gold)]' : 'text-[var(--bone-40)]'}`}>
        <NavIcon name={item.icon} />
      </span>
      <span className="leading-tight">{item.label}</span>
    </Link>
  );
}

function MobileNav({ items, title, activeFallback }: { items: NavItem[]; title: string; activeFallback: string }) {
  return (
    <nav className="border-b border-[var(--line)] bg-[var(--bone)]/95 lg:hidden">
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = activeItem(title || activeFallback, item) || (!title && item.label === activeFallback);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-10 min-w-max items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-[var(--gold)] bg-[#17130f] text-white shadow-sm'
                  : 'border-[#e1d9ce] bg-white text-[#3a332b] hover:border-[var(--gold)]'
              }`}
            >
              <span className={`grid h-4 w-4 shrink-0 place-items-center ${active ? 'text-[var(--gold)]' : 'text-[var(--stone)]'}`}>
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function OpsShell({ children, principal, title, subtitle, accentLabel: _accentLabel = 'VITALLE OPS', headerAction }: OpsShellProps) {
  const items = navItems(principal.admin_like);
  const activeFallback = principal.admin_like ? 'Visão Geral' : '';

  return (
    <div className="min-h-screen bg-[var(--bone)] text-[var(--noir)] lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[278px] flex-col bg-[var(--ink)] text-[var(--bone)] lg:flex">
        <div className="border-b border-white/[0.06] px-8 pb-8 pt-9">
          <Link href="/" className="block rounded-xl bg-[var(--bone)] px-4 py-3">
            <Image src="/brand/vitalle-logo.png" alt="Vitalle Odontologia & Harmonização" width={738} height={177} priority className="h-auto w-full" />
          </Link>
          <p className="mt-4 text-center text-[0.68rem] font-medium uppercase tracking-[0.24em] text-[var(--bone-40)]">
            Dashboard Operacional
          </p>
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
              <span className="grid h-5 w-5 place-items-center text-[var(--bone-40)]">
                <NavIcon name="logout" />
              </span>
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-[278px]">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bone)]/90 backdrop-blur-md">
          <div className="flex min-h-[4.75rem] items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:min-h-[5.25rem] lg:px-10 lg:py-4">
            <div className="min-w-0">
              <h1 className="display truncate text-2xl leading-none text-[var(--noir)] sm:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--stone)] sm:mt-2 sm:text-sm">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {headerAction}
              <form action={logoutAction} className="lg:hidden">
                <button type="submit" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--noir)] sm:px-4 sm:text-sm">
                  Sair
                </button>
              </form>
            </div>
          </div>
          <MobileNav items={items} title={title} activeFallback={activeFallback} />
        </header>

        <main className="px-4 py-5 sm:px-5 sm:py-7 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1400px] space-y-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
