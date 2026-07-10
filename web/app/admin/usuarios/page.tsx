import { OpsShell } from '@/components/vitalle/OpsShell';
import { UserForm } from '@/components/vitalle/VitalleForms';
import { getVitalleMe, getVitalleSectors, getVitalleUsers } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage() {
  const [meResult, sectorsResult, usersResult] = await Promise.all([getVitalleMe(), getVitalleSectors(), getVitalleUsers()]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const users = usersResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Usuários" subtitle="Cadastre colaboradores, funções e vínculos setoriais.">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Novo usuário</h3>
          <div className="mt-4">
            <UserForm sectors={sectors} />
          </div>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <details key={String(user.id)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="list-none cursor-pointer">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{String(user.role ?? '')}</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{String(user.full_name ?? user.display_name ?? user.email ?? '')}</div>
                <div className="text-sm text-slate-600">{String(user.email ?? '')}</div>
              </summary>
              <div className="mt-4">
                <UserForm user={user} sectors={sectors} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </OpsShell>
  );
}
