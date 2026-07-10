import { OpsShell } from '@/components/vitalle/OpsShell';
import { SettingForm } from '@/components/vitalle/VitalleForms';
import { getVitalleMe, getVitalleSettings } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminConfiguracoesPage() {
  const [meResult, settingsResult] = await Promise.all([getVitalleMe(), getVitalleSettings()]);
  const me = meResult.data;
  const settings = settingsResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Configurações" subtitle="Parâmetros do sistema e ajustes operacionais.">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Nova configuração</h3>
          <div className="mt-4">
            <SettingForm />
          </div>
        </div>
        <div className="grid gap-4">
          {settings.map((setting) => (
            <details key={setting.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{setting.key}</div>
                <div className="mt-1 text-sm text-slate-600">Configuração ativa</div>
              </summary>
              <div className="mt-4">
                <SettingForm setting={setting} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </OpsShell>
  );
}
