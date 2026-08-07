/**
 * Seasonal theming config — single source of truth for "which festive
 * moment is active right now, and what should change on the storefront".
 *
 * Priority order matters: Trung Thu and Tet come first because they are
 * the actual high-revenue seasons for a Vietnamese bakery. Christmas/Valentine are last, not
 * removed, just no longer the default the way they were before.
 *
 * Two kinds of date ranges, because they behave differently:
 * - `recurringRange`: fixed Gregorian dates (Christmas, Valentine) that
 *   repeat every year automatically — MM-DD only, no year needed.
 * - `dateRanges`: lunar-calendar festivals (Trung Thu, Tet) whose Gregorian
 *   date shifts every year. There is no lunar-calendar library dependency
 *   here on purpose (see plan doc — a small manually-updated lookup table
 *   is simpler and accurate enough, since these only need to be known a
 *   few months ahead). **Add next year's dates to this list annually.**
 */

export type SeasonId = 'trungthu' | 'tet' | 'valentine' | 'christmas'

export interface LunarDateRange {
  year: number
  /** inclusive, 'MM-DD' */
  start: string
  /** inclusive, 'MM-DD' */
  end: string
}

export interface RecurringDateRange {
  /** inclusive, 'MM-DD'. If `end` < `start` the range wraps across New Year's (e.g. Christmas). */
  start: string
  end: string
}

export interface SeasonMiniCard {
  id: number
  imageUrl: string
  quote: string
}

export interface Season {
  id: SeasonId
  label: string
  dateRanges?: LunarDateRange[]
  recurringRange?: RecurringDateRange
  /** Subtle floating-emoji overlay, same visual treatment for every season. `null` = no decoration. */
  decoration: { emoji: string; color: string } | null
  /** Card grid section rendered on the homepage below the hero. `null` = no section. */
  miniSection: { cards: SeasonMiniCard[] } | null
}

export const SEASONS: Season[] = [
  {
    id: 'trungthu',
    label: 'Trung Thu',
    // Rằm tháng 8 (the day itself) is 2026-09-25. Business window starts
    // ~1 month earlier, when mooncake gifting season actually begins.
    dateRanges: [{ year: 2026, start: '08-25', end: '09-26' }],
    decoration: { emoji: '🏮', color: '#C97B3F' },
    miniSection: {
      cards: [
        {
          id: 1,
          imageUrl: 'giftboxes/4_Hộp_Quà_Lễ_Hội.jpg',
          quote: 'Trung Thu này, gửi trọn yêu thương trong từng hộp quà.',
        },
        {
          id: 2,
          imageUrl: 'giftboxes/1_Hộp_Quà_Sinh_Nhật.jpg',
          quote: 'Đoàn viên bên gia đình, ngọt ngào bên hộp bánh nhỏ.',
        },
        {
          id: 3,
          imageUrl: 'giftboxes/3_Hộp_Quà_Cảm_Ơn.jpg',
          quote: 'Một mùa trăng tròn, một lời cảm ơn gửi đi.',
        },
      ],
    },
  },
  {
    id: 'tet',
    label: 'Tết Nguyên Đán',
    // Mùng 1 Tết 2026 is 2026-02-17. Business window is the weeks before,
    // when bánh mứt / gift box shopping happens.
    dateRanges: [{ year: 2026, start: '01-20', end: '02-20' }],
    decoration: { emoji: '🧧', color: '#C41E3A' },
    miniSection: {
      cards: [
        {
          id: 1,
          imageUrl: 'giftboxes/4_Hộp_Quà_Lễ_Hội.jpg',
          quote: 'Xuân sang, gửi lời chúc ngọt ngào đầu năm.',
        },
        {
          id: 2,
          imageUrl: 'giftboxes/1_Hộp_Quà_Sinh_Nhật.jpg',
          quote: 'Một hộp quà Tết, trọn vẹn lời chúc an khang.',
        },
        {
          id: 3,
          imageUrl: 'giftboxes/2_Hộp_Quà_Tình_Yêu.jpg',
          quote: 'Sum vầy đầu năm, ngọt ngào cả năm.',
        },
      ],
    },
  },
  {
    id: 'valentine',
    label: 'Valentine',
    recurringRange: { start: '02-08', end: '02-14' },
    decoration: { emoji: '💌', color: '#F7B4B8' },
    miniSection: null,
  },
  {
    id: 'christmas',
    label: 'Christmas',
    // Wraps New Year's: Dec 20 → Jan 5.
    recurringRange: { start: '12-20', end: '01-05' },
    decoration: { emoji: '❄', color: '#C59B72' },
    miniSection: {
      cards: [
        {
          id: 1,
          imageUrl: 'giftboxes/4_Hộp_Quà_Lễ_Hội.jpg',
          quote: 'Giáng sinh này, trao nhau điều ngọt ngào.',
        },
        {
          id: 2,
          imageUrl: 'giftboxes/1_Hộp_Quà_Sinh_Nhật.jpg',
          quote: 'Một hộp bánh nhỏ, đủ cho cả mùa yêu thương.',
        },
        {
          id: 3,
          imageUrl: 'giftboxes/3_Hộp_Quà_Cảm_Ơn.jpg',
          quote: 'Mùa lễ hội ngọt ngào hơn mỗi ngày.',
        },
      ],
    },
  },
]
