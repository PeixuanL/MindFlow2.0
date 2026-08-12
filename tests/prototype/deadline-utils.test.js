import test from "node:test";
import assert from "node:assert/strict";
import {
  getDeadlineTime,
  getLocalDayDelta,
  parseDeadlineValue,
} from "../../src/prototype/deadline-utils.mjs";

test("parseDeadlineValue treats date-only deadlines as the end of the local day", () => {
  const deadline = parseDeadlineValue("2026-08-12");

  assert.equal(deadline.isDateOnly, true);
  assert.equal(deadline.date.getFullYear(), 2026);
  assert.equal(deadline.date.getMonth(), 7);
  assert.equal(deadline.date.getDate(), 12);
  assert.equal(deadline.date.getHours(), 23);
  assert.equal(deadline.date.getMinutes(), 59);
});

test("date-only deadlines remain due today for the whole local day", () => {
  const deadline = parseDeadlineValue("2026-08-12");
  const noon = new Date(2026, 7, 12, 12, 0, 0);

  assert.equal(getLocalDayDelta(deadline.date, noon), 0);
  assert.equal(getDeadlineTime("2026-08-12") > noon.getTime(), true);
});

test("parseDeadlineValue keeps explicit times exact", () => {
  const deadline = parseDeadlineValue("2026-08-12T09:30:00+08:00");

  assert.equal(deadline.isDateOnly, false);
  assert.equal(deadline.date.toISOString(), "2026-08-12T01:30:00.000Z");
});
