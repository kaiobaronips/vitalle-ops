import Image from 'next/image';

export type CandyRewardDay = {
  date: string;
  label: string;
  complete: boolean;
  isToday: boolean;
  totalTasks: number;
  completedTasks: number;
};

function CandyIcon({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-6 w-7 shrink-0 place-items-center transition ${
        complete ? 'opacity-100 drop-shadow-[0_5px_10px_rgba(20,17,13,0.28)]' : 'opacity-25'
      }`}
    >
      <Image
        src="/brand/bombom.png"
        alt=""
        width={360}
        height={265}
        className="h-auto w-7"
      />
    </span>
  );
}

export function CandyRewardTracker({ days }: { days: CandyRewardDay[] }) {
  const completedDays = days.filter((day) => day.complete).length;
  const weekComplete = completedDays === days.length;

  return (
    <section
      className="rounded-full border border-[#e4d8c9] bg-white/80 px-2.5 py-2 shadow-sm backdrop-blur sm:px-3"
      aria-label={`Gamificação semanal: ${completedDays} de ${days.length} bombons completos`}
      title={weekComplete ? 'Semana completa. Prêmio liberado.' : `${completedDays} de ${days.length} bombons completos`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#6f665b] sm:inline">
          Semana
        </span>
        <div className="flex items-center gap-1">
          {days.map((day) => (
            <span
              key={day.date}
              className={`grid h-8 w-8 place-items-center rounded-full transition ${
                day.isToday ? 'bg-[#f4eadb] ring-1 ring-[#c99e67]/45' : 'bg-transparent'
              }`}
              title={`${day.label}: ${day.completedTasks}/${day.totalTasks} tarefas`}
            >
              <CandyIcon complete={day.complete} />
            </span>
          ))}
        </div>
        {weekComplete ? (
          <span className="hidden rounded-full bg-[#14110d] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#f0cf90] sm:inline">
            Prêmio
          </span>
        ) : null}
      </div>
    </section>
  );
}
