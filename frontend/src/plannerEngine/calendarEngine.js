/**
 * calendarEngine.js
 * Centralized Working-Day & Holiday Calculation Engine.
 * Strictly calculates working days (Mon-Fri) excluding weekends and custom holidays.
 */

export class CalendarEngine {
  /**
   * Parses YYYY-MM-DD string or Date object into a pure local Date (midnight).
   */
  static parseDate(val) {
    if (!val) return new Date();
    if (val instanceof Date) {
      return new Date(val.getFullYear(), val.getMonth(), val.getDate());
    }
    if (typeof val === 'string') {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const d = new Date(val);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Formats a date object to 'YYYY-MM-DD'.
   */
  static toISODate(date) {
    const d = this.parseDate(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Formats a date for UI display: '15 Aug 2026' or 'Mon, 15 Aug 2026'
   */
  static formatDisplayDate(date, includeDayName = false) {
    if (!date) return '-';
    const d = this.parseDate(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();

    if (includeDayName) {
      return `${dayName}, ${dayNum} ${mon} ${yr}`;
    }
    return `${dayNum} ${mon} ${yr}`;
  }

  /**
   * Checks if date is a weekend (Saturday = 6, Sunday = 0).
   */
  static isWeekend(date) {
    const d = this.parseDate(date);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * Checks if date matches any custom holiday in the list.
   */
  static isHoliday(date, holidays = []) {
    const iso = this.toISODate(date);
    return holidays.some(h => {
      const hDate = typeof h === 'string' ? h : h.date;
      return hDate === iso;
    });
  }

  /**
   * Gets the holiday object if date is a holiday.
   */
  static getHolidayInfo(date, holidays = []) {
    const iso = this.toISODate(date);
    return holidays.find(h => {
      const hDate = typeof h === 'string' ? h : h.date;
      return hDate === iso;
    }) || null;
  }

  /**
   * Determines if a date is a valid working day (Mon-Fri and NOT a holiday).
   */
  static isWorkingDay(date, holidays = []) {
    return !this.isWeekend(date) && !this.isHoliday(date, holidays);
  }

  /**
   * If date is not a working day, advances day-by-day until a valid working day is found.
   */
  static ensureWorkingDay(date, holidays = []) {
    let cur = this.parseDate(date);
    while (!this.isWorkingDay(cur, holidays)) {
      cur.setDate(cur.getDate() + 1);
    }
    return cur;
  }

  /**
   * Returns the immediate next working day following the given date.
   */
  static getNextWorkingDay(date, holidays = []) {
    const next = this.parseDate(date);
    next.setDate(next.getDate() + 1);
    return this.ensureWorkingDay(next, holidays);
  }

  /**
   * Calculates the End Date given a Start Date and a duration in Working Days.
   * If duration = 1, startDate is also the endDate (if valid working day).
   * If duration = 3 (starting Friday): Fri (1) -> Sat (X) -> Sun (X) -> Mon (2) -> Tue (3). End = Tuesday.
   */
  static calculateEndDate(startDate, durationWorkingDays, holidays = []) {
    if (!startDate) return null;
    let daysNeeded = Math.max(1, Math.ceil(durationWorkingDays || 1));
    let cur = this.ensureWorkingDay(startDate, holidays);

    // Day 1 is counted
    daysNeeded--;

    while (daysNeeded > 0) {
      cur.setDate(cur.getDate() + 1);
      if (this.isWorkingDay(cur, holidays)) {
        daysNeeded--;
      }
    }

    return cur;
  }

  /**
   * Counts the exact number of working days between two dates (inclusive).
   */
  static countWorkingDays(startDate, endDate, holidays = []) {
    if (!startDate || !endDate) return 0;
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    if (start > end) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (this.isWorkingDay(cur, holidays)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  /**
   * Counts total calendar days between start and end date (inclusive).
   */
  static countCalendarDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Counts total non-working days (weekends + holidays) between two dates.
   */
  static countNonWorkingDays(startDate, endDate, holidays = []) {
    const calDays = this.countCalendarDays(startDate, endDate);
    const workDays = this.countWorkingDays(startDate, endDate, holidays);
    return Math.max(0, calDays - workDays);
  }

  /**
   * Generates a date range array for Gantt timeline rendering.
   */
  static generateDateRange(startDate, endDate) {
    const dates = [];
    const cur = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }
}
