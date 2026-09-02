const fs = require("fs");

const index = fs.readFileSync("index.html.html", "utf8");
const match = index.match(/<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/);
if (!match) throw new Error("mod-data missing");

const modules = JSON.parse(match[1]);
const order = modules.find(item => item.id === "order");
if (!order) throw new Error("order module missing");

const source = Buffer.from(order.b64, "base64").toString("utf8");
if (!source.includes('body[data-winco-module="order"] .sub{white-space:pre-wrap;overflow-wrap:anywhere}')) {
  throw new Error("Order descriptions do not preserve edited line breaks");
}

console.log("Order formatting checks passed");
