const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

function parseDateOnly(value) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function parseDeadlineValue(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return null;
  }

  const dateOnly = parseDateOnly(rawValue);
  if (dateOnly) {
    return {
      date: dateOnly,
      isDateOnly: true,
    };
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    isDateOnly: false,
  };
}

export function getDeadlineTime(value) {
  return parseDeadlineValue(value)?.date.getTime() ?? Number.NaN;
}

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getLocalDayDelta(leftDate, rightDate = new Date()) {
  return Math.round((startOfLocalDay(leftDate) - startOfLocalDay(rightDate)) / DAY_MS);
}
