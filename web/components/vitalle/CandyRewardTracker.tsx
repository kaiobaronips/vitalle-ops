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
      className={`relative grid h-5 w-7 shrink-0 place-items-center transition ${
        complete ? 'opacity-100 drop-shadow-[0_5px_10px_rgba(201,158,103,0.3)]' : 'opacity-35'
      }`}
    >
      <span
        className={`absolute left-0 h-3 w-3 rounded-[0.3rem] rotate-45 ${
          complete ? 'bg-[#c99e67]' : 'border border-[#3a332b] bg-transparent'
        }`}
      />
      <span
        className={`h-4 w-5 rounded-full border ${
          complete ? 'border-[#a37d4c] bg-gradient-to-br from-[#f0cf90] to-[#c99e67]' : 'border-[#3a332b] bg-transparent'
        }`}
      />
      <span
        className={`absolute right-0 h-3 w-3 rounded-[0.3rem] rotate-45 ${
          complete ? 'bg-[#c99e67]' : 'border border-[#3a332b] bg-transparent'
        }`}
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
