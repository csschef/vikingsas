// Butikens egna antaganden för labben, inte PostNords upphämtningstider. Svenska helgdagar hanteras inte än.

const TIME_ZONE = 'Europe/Stockholm'

type HandoverRules = {
  cutoffHour: number
  handoverHour: number
}

// Hela timmar 0 till 23, annars gäller standardvärdet
function hourFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback
}

function rulesFromEnv(): HandoverRules {
  return {
    cutoffHour: hourFromEnv('SHIPPING_CUTOFF_HOUR', 12),
    handoverHour: hourFromEnv('SHIPPING_HANDOVER_HOUR', 14),
  }
}

// Datum och timme i Sverige för ett ögonblick, oavsett vilken tidszon servern går i
function swedishClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour') }
}

// Före bryttiden samma vardag, annars nästa vardag (exakt på bryttiden räknas som efter). Svarar i svensk lokal tid, "2026-11-02T14:00:00".
export function nextHandoverTime(now = new Date(), rules = rulesFromEnv()) {
  const clock = swedishClock(now)
  // Kalenderräkning i UTC, så att sommar- och vintertid inte flyttar datumet
  const today = new Date(Date.UTC(clock.year, clock.month - 1, clock.day))
  const weekday = today.getUTCDay()

  let daysAhead = 0
  if (weekday === 6) daysAhead = 2
  else if (weekday === 0) daysAhead = 1
  else if (clock.hour >= rules.cutoffHour) daysAhead = weekday === 5 ? 3 : 1

  const handoverDay = new Date(Date.UTC(clock.year, clock.month - 1, clock.day + daysAhead))
  const date = handoverDay.toISOString().slice(0, 10)
  return `${date}T${String(rules.handoverHour).padStart(2, '0')}:00:00`
}
