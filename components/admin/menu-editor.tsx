import type { PlanDayMenu } from '@/lib/menu/queries';
import { updatePlanDayMenu } from '@/app/admin/menu/actions';

const fields: Array<[keyof PlanDayMenu, string]> = [
  ['component_1', 'Main'],
  ['component_2', 'Second'],
  ['component_3', 'Third'],
  ['component_4', 'Fourth'],
  ['component_5', 'Fifth'],
  ['calories', 'Kcal'],
  ['protein_g', 'Protein'],
  ['carbohydrates_g', 'Carbs'],
  ['fats_g', 'Fats'],
  ['fiber_g', 'Fiber']
];

export function MenuEditor({ rows }: { rows: PlanDayMenu[] }) {
  if (rows.length === 0) {
    return (
      <div className="mt-10 border border-line bg-ivory p-8">
        <p className="editorial-label text-accentRed">No Menu Data</p>
        <p className="mt-4 leading-7 text-charcoal">Publish allplans_nutrition.csv from the import center to enable permanent website editing.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-5">
      {rows.map((row) => (
        <form key={row.id} action={updatePlanDayMenu} className="border border-line bg-ivory p-5">
          <input type="hidden" name="id" value={row.id} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="editorial-label text-accentRed">Day {String(row.cycle_service_day).padStart(2, '0')} · Week {row.cycle_week} · {row.service_day}</p>
              <h2 className="mt-2 font-serif text-3xl">{row.plan_display_name}</h2>
            </div>
            <select name="status" defaultValue={row.status} className="border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-forest">
              <option value="live">Live</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {fields.map(([key, label]) => (
              <label key={String(key)} className="grid gap-2 text-sm text-muted">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em]">{label}</span>
                <input
                  name={String(key)}
                  defaultValue={row[key] == null ? '' : String(row[key])}
                  className="border border-line bg-cream px-3 py-3 text-charcoal outline-none focus:border-forest"
                />
              </label>
            ))}
          </div>
          <button type="submit" className="mt-5 border border-forest bg-forest px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-ivory transition hover:bg-olive">
            Save Permanent Change
          </button>
        </form>
      ))}
    </div>
  );
}
