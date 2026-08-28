const fs = require("fs");

const source = fs.readFileSync("calendar-module.html", "utf8");
for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new Function(match[1]);
}

for (const expected of [
  'id="calendarGrid"',
  'id="eventTitle"',
  'winco_calendar_events_v1',
  'className="event-toggle"',
  'completed:toggle.checked',
  'events.map(item=>item.id===editingId?row:item)',
  'events.filter(item=>item.id!==editingId)'
]) {
  if (!source.includes(expected)) throw new Error(`Calendar feature missing: ${expected}`);
}

const index = fs.readFileSync("index.html.html", "utf8");
const match = index.match(/<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/);
if (!match) throw new Error("mod-data missing");
const modules = JSON.parse(match[1]);
const calendar = modules.find(item => item.id === "calendar");
if (!calendar) throw new Error("calendar module missing from mod-data");
const embedded = Buffer.from(calendar.b64, "base64").toString("utf8");
if (!embedded.includes('data-winco-module="calendar"')) throw new Error("calendar module polish missing");

console.log("Calendar checks passed");
