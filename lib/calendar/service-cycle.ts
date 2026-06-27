export const SERVICE_DAYS_PER_CYCLE = 24;
export const CLOSED_WEEKDAYS = [0]; // Sunday
export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export type CalendarCellKind = 'leading' | 'service' | 'closed' | 'trailing';

export type CalendarCell = {
  kind: CalendarCellKind;
  date: Date;
  cycleServiceDay?: number;
  cycleWeek?: number;
  serviceDay?: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
};

export function isServiceDay(date: Date): boolean {
  return !CLOSED_WEEKDAYS.includes(date.getDay());
}

export function mondayBasedOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function serviceDayName(date: Date): CalendarCell['serviceDay'] | undefined {
  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const day = map[date.getDay()];
  return day === 'Sun' ? undefined : day;
}

export function getCycleWeek(cycleServiceDay: number): number {
  return Math.ceil(cycleServiceDay / 6);
}

export function countServiceDaysInclusive(anchorDate: Date, selectedDate: Date): number {
  const step = anchorDate <= selectedDate ? 1 : -1;
  const cursor = new Date(anchorDate);
  let count = 0;

  while ((step === 1 && cursor <= selectedDate) || (step === -1 && cursor >= selectedDate)) {
    if (isServiceDay(cursor)) count += step;
    cursor.setDate(cursor.getDate() + step);
  }

  return count;
}

export function getServiceDayIndex(anchorDate: Date, selectedDate: Date): number | null {
  if (!isServiceDay(selectedDate)) return null;
  const counted = countServiceDaysInclusive(anchorDate, selectedDate);
  const zeroBased = ((counted - 1) % SERVICE_DAYS_PER_CYCLE + SERVICE_DAYS_PER_CYCLE) % SERVICE_DAYS_PER_CYCLE;
  return zeroBased + 1;
}

export function buildFiveWeekServiceGrid(anchorDate: Date): CalendarCell[] {
  const leadingCells = mondayBasedOffset(anchorDate);
  const gridStart = new Date(anchorDate);
  gridStart.setDate(anchorDate.getDate() - leadingCells);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    if (date < anchorDate) return { kind: 'leading', date } satisfies CalendarCell;
    if (!isServiceDay(date)) return { kind: 'closed', date } satisfies CalendarCell;

    const cycleServiceDay = getServiceDayIndex(anchorDate, date);
    if (!cycleServiceDay || cycleServiceDay > SERVICE_DAYS_PER_CYCLE) {
      return { kind: 'trailing', date } satisfies CalendarCell;
    }

    return {
      kind: 'service',
      date,
      cycleServiceDay,
      cycleWeek: getCycleWeek(cycleServiceDay),
      serviceDay: serviceDayName(date)
    } satisfies CalendarCell;
  });
}
