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
};

function navItems(adminLike: boolean) {
  const base = [
    { href: '/dashboard', label: 'Visão geral' },
    { href: '/meu-dia', label: 'Meu dia' },
    { href: '/operacao', label: 'Operação' },
    { href: '/setores', label: 'Setores' },
    { href: '/alertas', label: 'Alertas' },
    { href: '/historico', label: 'Histórico' },
    { href: '/auditoria', label: 'Auditoria' },
    { href: '/relatorios', label: 'Relatórios' },
  ];
  const admin = [
    { href: '/admin/tarefas', label: 'Tarefas e POPs' },
    { href: '/admin/setores', label: 'Setores' },
    { href: '/admin/usuarios', label: 'Usuários' },
    { href: '/admin/configuracoes', label: 'Configurações' },
  ];
  return adminLike ? [...base, ...admin] : base;
}

export function OpsShell({ children, principal, title, subtitle, accentLabel = 'VITALLE OPS' }: OpsShellProps) {
  const items = navItems(principal.admin_like);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <aside className="fixed left-4 top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:flex">
        <Link href="/dashboard" className="rounded-lg border border-slate-200 bg-slate-950 px-4 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{accentLabel}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">Vitalle Ops</h1>
        </Link>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <span>{item.label}</span>
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            </Link>
          ))}
        </nav>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessão</p>
          <div className="mt-2 text-sm font-semibold text-slate-900">{principal.display_name}</div>
          <div className="text-sm text-slate-600">{principal.role}</div>
          <div className="text-xs text-slate-500">{principal.unit_id || 'sem unidade'}</div>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="px-4 py-4 xl:ml-80 xl:px-8 xl:py-8">
        <details className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-slate-950 px-4 py-3 text-white marker:hidden">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-300">{accentLabel}</span>
              <span className="mt-1 block text-sm font-semibold">Menu</span>
            </span>
            <span className="text-2xl leading-none">+</span>
          </summary>
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
                {item.label}
              </Link>
            ))}
            <form action={logoutAction} className="mt-2">
              <button type="submit" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Sair
              </button>
            </form>
          </div>
        </details>

        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{accentLabel}</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {principal.display_name}
            </div>
          </div>
        </header>

        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
