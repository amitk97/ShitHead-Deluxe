// Seasonal event dates for the notification functions.
// COPIED from index.html (DIWALI_DATES … seasonalWindowsForYear): keep the
// two in step when event dates change. check-seasons.js in the scratchpad
// compared both for 2026–2045 when this was written.
'use strict';

const SEASONAL_EVENTS = [
  { id: 'lunar', name: 'Lunar New Year', title: 'Year of Fortune', emoji: '🧧' },
  { id: 'valentine', name: "Valentine's", title: 'Love Is Blind', emoji: '💘' },
  { id: 'ramadan', name: 'Ramadan', title: 'Ramadan Kareem', emoji: '🌙' },
  { id: 'easter', name: 'Easter', title: 'Egg Hunt', emoji: '🐣' },
  { id: 'summer', name: 'Summer Holidays', title: 'Out of Office', emoji: '☀️' },
  { id: 'halloween', name: 'Halloween', title: 'Trick or Treat', emoji: '🎃' },
  { id: 'diwali', name: 'Diwali', title: 'Festival of Lights', emoji: '🪔' },
  { id: 'christmas', name: 'Christmas', title: 'Deck the Halls', emoji: '🎄' },
  { id: 'newyear', name: "New Year's", title: 'Happy New Year', emoji: '🎆' }
];

const DIWALI_DATES = { 2026: '11-08', 2027: '10-29', 2028: '10-17', 2029: '11-05', 2030: '10-26', 2031: '11-14', 2032: '11-02', 2033: '10-22', 2034: '11-10', 2035: '10-30', 2036: '10-19', 2037: '11-07', 2038: '10-27', 2039: '10-17', 2040: '11-04' };
const LUNAR_NEW_YEAR_DATES = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08', 2036: '01-28', 2037: '02-15', 2038: '02-04', 2039: '01-24', 2040: '02-12' };
const RAMADAN_DATES = [['2026-02-18', '2026-03-20'], ['2027-02-08', '2027-03-09'], ['2028-01-28', '2028-02-26'], ['2029-01-16', '2029-02-14'], ['2030-01-05', '2030-02-04'], ['2030-12-26', '2031-01-24'], ['2031-12-16', '2032-01-14'], ['2032-12-04', '2033-01-03'], ['2033-11-23', '2033-12-23'], ['2034-11-12', '2034-12-12'], ['2035-11-01', '2035-12-01'], ['2036-10-21', '2036-11-19'], ['2037-10-10', '2037-11-09'], ['2038-09-30', '2038-10-29'], ['2039-09-19', '2039-10-19'], ['2040-09-08', '2040-10-07']];
const seasonDate = (y, m, d) => new Date(y, m - 1, d);
const seasonAddDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const seasonParse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return seasonDate(y, m, d); };
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return seasonDate(year, month, day);
}
// First local date in [from, to) whose calendar parts satisfy test.
function seasonFindCalendarDay(calendar, from, to, test) {
  try {
    const fmt = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, { month: 'numeric', day: 'numeric' });
    for (let d = from; d < to; d = seasonAddDays(d, 1)) {
      const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
      if (test(parts)) return d;
    }
  } catch (e) {}
  return null;
}
// Every window [start, end] (both whole local days) of an event that
// starts in the given year.
function seasonalWindowsForYear(eventId, year) {
  switch (eventId) {
    case 'valentine': return [[seasonDate(year, 2, 1), seasonDate(year, 2, 16)]];
    case 'summer': return [[seasonDate(year, 7, 1), seasonDate(year, 8, 31)]];
    case 'halloween': return [[seasonDate(year, 10, 15), seasonDate(year, 11, 2)]];
    case 'christmas': return [[seasonDate(year, 12, 1), seasonDate(year, 12, 26)]];
    case 'newyear': return [[seasonDate(year, 12, 27), seasonDate(year + 1, 1, 7)]];
    case 'easter': { const e = easterSunday(year); return [[seasonAddDays(e, -14), seasonAddDays(e, 7)]]; }
    case 'diwali': {
      const md = DIWALI_DATES[year];
      if (!md) return [];
      const day = seasonParse(`${year}-${md}`);
      return [[seasonAddDays(day, -7), seasonAddDays(day, 7)]];
    }
    case 'lunar': {
      const md = LUNAR_NEW_YEAR_DATES[year];
      const day = md ? seasonParse(`${year}-${md}`) : seasonFindCalendarDay('chinese', seasonDate(year, 1, 15), seasonDate(year, 2, 25), p => p.month === '1' && p.day === '1');
      return day ? [[seasonAddDays(day, -3), seasonAddDays(day, 14)]] : [];
    }
    case 'ramadan': {
      const known = RAMADAN_DATES.filter(([start]) => start.startsWith(`${year}-`));
      if (known.length || year <= 2040) return known.map(([start, eid]) => [seasonParse(start), seasonAddDays(seasonParse(eid), 3)]);
      const out = [];
      let from = seasonDate(year, 1, 1);
      while (from < seasonDate(year + 1, 1, 1)) {
        const start = seasonFindCalendarDay('islamic-umalqura', from, seasonDate(year + 1, 1, 1), p => p.month === '9' && p.day === '1');
        if (!start) break;
        const eid = seasonFindCalendarDay('islamic-umalqura', seasonAddDays(start, 27), seasonAddDays(start, 32), p => p.month === '10' && p.day === '1') || seasonAddDays(start, 30);
        out.push([start, seasonAddDays(eid, 3)]);
        from = seasonAddDays(start, 300);
      }
      return out;
    }
    default: return [];
  }
}

// Events whose window starts on the given calendar day ({ y, m, d }).
function eventsStartingOn({ y, m, d }) {
  const out = [];
  SEASONAL_EVENTS.forEach((event) => {
    [y - 1, y].forEach((year) => {
      seasonalWindowsForYear(event.id, year).forEach(([start]) => {
        if (start.getFullYear() === y && start.getMonth() + 1 === m && start.getDate() === d) {
          out.push({ ...event, key: `${event.id}-${start.getFullYear()}` });
        }
      });
    });
  });
  return out;
}

module.exports = { SEASONAL_EVENTS, seasonalWindowsForYear, eventsStartingOn };
