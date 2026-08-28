const fs = require("fs");

const source = fs.readFileSync("today-schedule.js", "utf8");
new Function(source);

for (const expected of [
  "winco_calendar_events_v1",
  "today-schedule-check",
  "completed:check.checked",
  'window.openModule("calendar",true)',
  "wincoCalendarUpdated"
  ,"winco_today_schedule_position_v1"
  ,"head.addEventListener(\"pointermove\""
  ,"calendarCardStatus"
  ,"Number(Boolean(a.completed))-Number(Boolean(b.completed))"
]) {
  if (!source.includes(expected)) throw new Error(`Today schedule feature missing: ${expected}`);
}

const index = fs.readFileSync("index.html.html", "utf8");
for (const expected of ["today-schedule.css", 'id="todaySchedule"', "today-schedule.js"]) {
  if (!index.includes(expected)) throw new Error(`Today schedule asset missing: ${expected}`);
}

console.log("Today schedule checks passed");
