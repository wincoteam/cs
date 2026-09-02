const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("index.html.html", "utf8");
const css = fs.readFileSync("quality.css", "utf8");

const cards = [...html.matchAll(/<button\s+class="card[^"]*"[^>]*>/g)].map(match => match[0]);
assert.equal(cards.length, 11, "all eleven dashboard cards should be present");
assert(cards.every(card => /\btype="button"/.test(card)), "dashboard cards must not submit an enclosing form");

assert(css.includes(".history-widget:not(.is-open){bottom:104px}"), "history launcher spacing is missing");
assert(css.includes(".tracking-widget:not(.is-open){bottom:160px}"), "tracking launcher spacing is missing");
assert(css.includes(".counsel-widget:not(.is-open){bottom:216px}"), "counsel launcher spacing is missing");
assert(css.includes(".history-widget.is-open,.tracking-widget.is-open,.counsel-widget.is-open{bottom:max(18px,env(safe-area-inset-bottom))}"), "opened utility panels must stay in the viewport");
assert(css.includes("@supports(height:100dvh)"), "dynamic viewport support is missing");
assert(css.includes(":focus-visible"), "keyboard focus treatment is missing");

console.log("UI quality checks passed");
