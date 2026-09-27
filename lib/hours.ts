import { salon, type OpeningHours } from '@/config/salon'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function hour(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { text: m ? `${h12}:${String(m).padStart(2, '0')}` : `${h12}`, mer: h < 12 ? 'am' : 'pm' }
}

/** "9am", "12pm", "9:30am" */
export function fmtHour(hm: string) {
  const h = hour(hm)
  return `${h.text}${h.mer}`
}

/** "9am – 7pm", "12 – 6pm" */
export function fmtRange(open: string, close: string) {
  const a = hour(open)
  const b = hour(close)
  return a.mer === b.mer ? `${a.text} – ${b.text}${b.mer}` : `${a.text}${a.mer} – ${b.text}${b.mer}`
}

/** Opening hours grouped for display: open runs first, closed days last. */
export function groupedHours(hours: Record<number, OpeningHours> = salon.hours) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const groups: { days: number[]; h: OpeningHours }[] = []
  for (const d of order) {
    const h = hours[d]
    const last = groups.at(-1)
    if (last && JSON.stringify(last.h) === JSON.stringify(h)) last.days.push(d)
    else groups.push({ days: [d], h })
  }
  return groups
    .map((g) => ({
      label: g.days.length > 1 ? `${DAYS[g.days[0]]} – ${DAYS[g.days.at(-1)!]}` : DAYS[g.days[0]],
      value: g.h ? fmtRange(g.h.open, g.h.close) : 'Closed',
      closed: !g.h,
    }))
    .sort((a, b) => Number(a.closed) - Number(b.closed))
}

/** "Open today 9am – 7pm" / "Closed today" */
export function todayHoursLine(weekday: number) {
  const h = salon.hours[weekday as keyof typeof salon.hours]
  return h ? `Open today ${fmtRange(h.open, h.close)}` : 'Closed today'
}
