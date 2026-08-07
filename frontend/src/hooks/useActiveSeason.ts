import { useMemo } from 'react'
import { SEASONS, Season, SeasonId } from '../config/seasons'

/**
 * Which seasonal moment (if any) is active today. Returns `null` on the
 * evergreen default when no season matches — this is the common case most
 * of the year by design.
 *
 * QA override: append `?season=trungthu` (any SeasonId) to the URL to
 * preview a season without waiting for its actual date — doesn't touch
 * anything else, purely a query-param read.
 */
export function useActiveSeason(): Season | null {
  return useMemo(() => computeActiveSeason(new Date()), [])
}

export function computeActiveSeason(now: Date): Season | null {
  const override = getSeasonOverrideFromQuery()
  if (override) {
    const forced = SEASONS.find((s) => s.id === override)
    if (forced) return forced
  }

  const monthDay = toMonthDay(now)
  const year = now.getFullYear()

  for (const season of SEASONS) {
    if (season.recurringRange && isWithinRange(monthDay, season.recurringRange.start, season.recurringRange.end)) {
      return season
    }
    if (season.dateRanges) {
      const match = season.dateRanges.find(
        (range) => range.year === year && isWithinRange(monthDay, range.start, range.end)
      )
      if (match) return season
    }
  }

  return null
}

function getSeasonOverrideFromQuery(): SeasonId | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const value = params.get('season')
  return (value as SeasonId) || null
}

/** 'MM-DD' for a given Date, in local time. */
function toMonthDay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

/** Inclusive MM-DD range check. Handles wraparound (e.g. '12-20' → '01-05'). */
function isWithinRange(monthDay: string, start: string, end: string): boolean {
  if (start <= end) {
    return monthDay >= start && monthDay <= end
  }
  // Wraps across New Year's.
  return monthDay >= start || monthDay <= end
}
