const fs = require("fs");

const source = fs.readFileSync("today-schedule.js", "utf8");
new Function(source);

for (const expected of [
  "winco_calendar_events_v1",
  "today-schedule-check",
  "completed:check.checked",
  'window.openModule("calendar",true)',
  "wincoCalendarUpdated"
  ,"has-today-schedule"
  ,"home.classList.toggle"
  ,"calendarCardStatus"
  ,"Number(Boolean(a.completed))-Number(Boolean(b.completed))"
]) {
  if (!source.includes(expected)) throw new Error(`Today schedule feature missing: ${expected}`);
}

const index = fs.readFileSync("index.html.html", "utf8");
for (const expected of ["today-schedule.css", 'class="grid schedule-split"', 'id="todaySchedule"', "today-schedule.js"]) {
  if (!index.includes(expected)) throw new Error(`Today schedule asset missing: ${expected}`);
}

console.log("Today schedule checks passed");
