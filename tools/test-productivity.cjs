const fs=require("fs");
const vm=require("vm");
const assert=require("assert");
const html=fs.readFileSync("index.html.html","utf8");
const js=fs.readFileSync("productivity.js","utf8");
const css=fs.readFileSync("productivity.css","utf8");

assert(html.includes('href="productivity.css"'),"productivity stylesheet must be loaded");
assert(html.includes('src="productivity.js"'),"productivity script must be loaded");
assert(html.includes('id="commandDeck"'),"quick command deck must exist");
assert(html.includes('id="deckBackup"')&&html.includes('id="deckRestore"'),"backup and restore controls must exist");
assert(html.includes('Ctrl K'),"keyboard shortcut must be visible");
assert(js.includes('key.indexOf("winco_")===0'),"backup must be limited to WINCO-owned data");
assert(js.includes("winco_assistant_position_v1"),"layout reset must include floating assistant position");
assert(js.includes('event.altKey')&&js.includes('event.ctrlKey||event.metaKey'),"quick keyboard shortcuts must be supported");
assert(css.includes("@media(max-width:620px)"),"command deck must have a mobile layout");
new vm.Script(js,{filename:"productivity.js"});
console.log("productivity tests passed");
