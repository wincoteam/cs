const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("index.html.html", "utf8");
const css = fs.readFileSync("quality.css", "utf8");
const floatingCss = fs.readFileSync("floating-tools.css", "utf8");
const floatingJs = fs.readFileSync("floating-tools.js", "utf8");

const cards = [...html.matchAll(/<button\s+class="card[^"]*"[^>]*>/g)].map(match => match[0]);
assert.equal(cards.length, 11, "all eleven dashboard cards should be present");
assert(cards.every(card => /\btype="button"/.test(card)), "dashboard cards must not submit an enclosing form");

assert(css.includes(".history-widget:not(.is-open){bottom:104px}"), "history launcher spacing is missing");
assert(css.includes(".tracking-widget:not(.is-open){bottom:160px}"), "tracking launcher spacing is missing");
assert(css.includes(".counsel-widget:not(.is-open){bottom:216px}"), "counsel launcher spacing is missing");
assert(css.includes(".history-widget.is-open,.tracking-widget.is-open,.counsel-widget.is-open{bottom:max(18px,env(safe-area-inset-bottom))}"), "opened utility panels must stay in the viewport");
assert(css.includes("@supports(height:100dvh)"), "dynamic viewport support is missing");
assert(css.includes(":focus-visible"), "keyboard focus treatment is missing");
assert(html.includes('href="floating-tools.css"') && html.includes('src="floating-tools.js"'), "floating utility assets must be loaded");
assert(["counselWidget","trackingWidget","historyWidget"].every(id => floatingJs.includes(`id:"${id}"`)), "all three left utilities must support dragging");
assert(floatingJs.includes('localStorage.setItem(key,JSON.stringify(position))'), "floating positions must be persisted");
assert(floatingJs.includes('drag(launch);drag(head);'), "both launcher buttons and opened panel headers must be draggable");
assert(floatingCss.includes(".is-floating-dragging"), "dragging feedback is missing");

console.log("UI quality checks passed");
