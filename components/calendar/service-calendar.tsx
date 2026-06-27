import { buildFiveWeekServiceGrid, WEEKDAY_LABELS } from '@/lib/calendar/service-cycle';
import type { PlanDayMenu } from '@/lib/menu/queries';

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date).toUpperCase();
}

function macroLine(menu?: PlanDayMenu) {
  if (!menu) return 'P · C · F · Fiber';
  return `P ${menu.protein_g ?? 0}g · C ${menu.carbohydrates_g ?? 0}g · F ${menu.fats_g ?? 0}g · Fiber ${menu.fiber_g ?? 0}g`;
}

function components(menu?: PlanDayMenu) {
  if (!menu) return [];
  return [menu.component_1, menu.component_2, menu.component_3, menu.component_4, menu.component_5].filter(Boolean);
}

export function ServiceCalendar({
  anchorDate = new Date('2026-07-01'),
  menuRows = [],
  planName
}: {
  anchorDate?: Date;
  menuRows?: PlanDayMenu[];
  planName?: string | null;
}) {
  const cells = buildFiveWeekServiceGrid(anchorDate);
  const byCycleDay = new Map(menuRows.map((row) => [row.cycle_service_day, row]));

  return (
    <section className="bg-cream px-5 py-12 md:px-10 lg:px-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="editorial-label text-accentRed">24 Service Days</p>
          <h1 className="mt-3 font-serif text-5xl text-forest">Weekly Menu Calendar</h1>
          {planName ? <p className="mt-3 text-sm text-muted">Showing: {planName}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL 4 WEEKS', 'WEEK 01', 'WEEK 02', 'WEEK 03', 'WEEK 04'].map((label, index) => (
            <button
              key={label}
              className={`border border-line px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.26em] ${index === 0 ? 'bg-forest text-ivory' : 'bg-ivory text-forest'}`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-line bg-ivory">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day} className="border-b border-r border-line px-4 py-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.32em] text-muted">
            {day}
          </div>
        ))}
        {cells.map((cell, index) => {
          const isService = cell.kind === 'service';
          const isClosed = cell.kind === 'closed';
          const menu = cell.cycleServiceDay ? byCycleDay.get(cell.cycleServiceDay) : undefined;
          const items = components(menu);

          return (
            <article
              key={`${cell.kind}-${cell.date.toISOString()}-${index}`}
              className={`min-h-64 border-b border-r border-line p-4 ${isService ? 'bg-ivory text-forest' : 'bg-cream/70 text-muted'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em]">{formatDay(cell.date)}</span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em]">{isService ? `Day ${String(cell.cycleServiceDay).padStart(2, '0')}` : ''}</span>
              </div>

              {isService ? (
                <div className="mt-7">
                  <p className="editorial-label text-accentRed">Week {String(cell.cycleWeek).padStart(2, '0')}</p>
                  {menu ? (
                    <>
                      <h2 className="mt-4 font-serif text-2xl leading-7">{items[0] ?? 'Menu allocation'}</h2>
                      <ul className="mt-4 space-y-1 text-sm leading-5 text-charcoal">
                        {items.slice(1).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      <div className="mt-8 border-l border-line pl-3 font-mono text-[0.65rem] leading-5 text-muted">
                        {macroLine(menu)}<br />{menu.calories ?? 0} KCAL
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 font-serif text-2xl">Awaiting menu</h2>
                      <p className="mt-3 text-sm leading-6 text-charcoal">Publish the plan nutrition CSV to populate this service day.</p>
                    </>
                  )}
                </div>
              ) : isClosed ? (
                <div className="mt-12">
                  <p className="font-serif text-2xl text-muted">Kitchen Closed</p>
                  <p className="mt-3 text-sm">No Sunday delivery</p>
                </div>
              ) : (
                <div className="mt-12 text-sm">Outside active cycle</div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
