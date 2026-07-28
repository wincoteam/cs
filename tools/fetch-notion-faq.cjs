const fs = require("node:fs");
const path = require("node:path");

const CATEGORIES = [
  ["cleaner", "청소기", "2da4f43a-7c12-806e-a27a-e5f9f9310287"],
  ["camp", "캠핑용품", "2334f43a-7c12-8099-a1da-d74642265e0f"],
  ["charger", "충전기", "2334f43a-7c12-80ab-934a-f1a5f3a35063"],
  ["lantern", "랜턴", "2264f43a-7c12-8010-a0b8-e7f72466bd7b"],
  ["living", "생활용품", "2264f43a-7c12-8090-9779-c29497986d2e"],
];

const API = "https://www.notion.so/api/v3";
const value = (record) => record?.value?.value || record?.value || record;
const plain = (property) =>
  (property || []).map((part) => (Array.isArray(part) ? part[0] || "" : "")).join("").trim();

async function post(path, body) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return response.json();
    lastStatus = response.status;
  }
  throw new Error(`${path}: ${lastStatus}`);
}

async function chunk(pageId) {
  return post("loadCachedPageChunk", {
    pageId,
    limit: 100,
    cursor: { stack: [] },
    chunkNumber: 0,
    verticalColumns: false,
  });
}

async function records(ids) {
  if (!ids.length) return [];
  try {
    const result = await post("getRecordValues", {
      requests: ids.map((id) => ({ table: "block", id, version: -1 })),
    });
    return result.results.map(value).filter((block) => block?.id);
  } catch (error) {
    if (ids.length === 1) return [];
    const middle = Math.ceil(ids.length / 2);
    return [
      ...(await records(ids.slice(0, middle))),
      ...(await records(ids.slice(middle))),
    ];
  }
}

function addRecordMap(blocks, recordMap) {
  for (const record of Object.values(recordMap?.block || {})) {
    const block = value(record);
    if (block?.id) blocks.set(block.id, block);
  }
}

async function crawlPage(pageId) {
  const loaded = await chunk(pageId);
  const blocks = new Map();
  addRecordMap(blocks, loaded.recordMap);
  const queue = [...(blocks.get(pageId)?.content || [])];
  const seen = new Set();
  while (queue.length) {
    const ids = [...new Set(queue.splice(0, 80))].filter((id) => !seen.has(id));
    ids.forEach((id) => seen.add(id));
    const missing = ids.filter((id) => !blocks.has(id));
    for (const block of await records(missing)) blocks.set(block.id, block);
    for (const id of ids) queue.push(...(blocks.get(id)?.content || []));
  }
  return { loaded, blocks };
}

function descendantText(block, blocks) {
  const lines = [];
  function visit(id) {
    const child = blocks.get(id);
    if (!child) return;
    const text = plain(child.properties?.title);
    if (text && !["image", "file", "bookmark"].includes(child.type)) lines.push(text);
    for (const childId of child.content || []) visit(childId);
  }
  for (const id of block.content || []) visit(id);
  return lines;
}

function notionUrl(pageId, name) {
  const slug = encodeURIComponent(name.replace(/\s+/g, "-"));
  return `https://wincoservice.notion.site/${slug}-${pageId.replaceAll("-", "")}`;
}

function parseProduct(pageId, blocks) {
  const page = blocks.get(pageId);
  const name = plain(page?.properties?.title);
  const sections = [];
  const faqs = [];
  let faqMode = false;

  for (const id of page?.content || []) {
    const block = blocks.get(id);
    if (!block) continue;
    const title = plain(block.properties?.title);
    if (/FAQ|자주\s*묻는/i.test(title)) {
      faqMode = true;
      for (const childId of block.content || []) {
        const question = blocks.get(childId);
        if (!question) continue;
        const q = plain(question.properties?.title);
        const answer = descendantText(question, blocks).join("\n");
        if (q && answer) faqs.push([q, answer]);
      }
      continue;
    }
    if (!faqMode && title && block.content?.length) {
      const lines = descendantText(block, blocks);
      if (lines.length) sections.push([title, lines]);
    } else if (faqMode && title) {
      const answer = descendantText(block, blocks).join("\n");
      if (answer) faqs.push([title, answer]);
    }
  }

  return {
    name,
    model: name.match(/\(([^)]+)\)/)?.[1] || "",
    url: notionUrl(pageId, name),
    sections,
    faqs,
  };
}

(async () => {
  const output = [];
  for (const [key, label, categoryPageId] of CATEGORIES) {
    const { loaded } = await crawlPage(categoryPageId);
    const categoryBlock = value(loaded.recordMap.block[categoryPageId]);
    const viewId = categoryBlock.view_ids[0];
    const view = value(loaded.recordMap.collection_view[viewId]);
    const products = [];
    for (const pageId of view.page_sort || []) {
      const { blocks } = await crawlPage(pageId);
      const product = parseProduct(pageId, blocks);
      if (product.name) products.push({ ...product, pageId });
    }
    output.push({ key, label, products });
  }

  if (process.argv.includes("--sync")) {
    const styles = {
      cleaner: ["🧹", "#eaf3fb"],
      camp: ["🏕️", "#edf5e8"],
      charger: ["🔌", "#f2edfb"],
      lantern: ["🏮", "#fff1dc"],
      living: ["🏠", "#f8ece8"],
    };
    const extra = output.flatMap(({ key, products }) =>
      products.map(({ pageId, ...product }) => ({
        ...product,
        cat: key,
        icon: styles[key][0],
        soft: styles[key][1],
      })),
    );
    const modulePath = path.join(__dirname, "..", "faq-module.html");
    const source = fs.readFileSync(modulePath, "utf8");
    const replacement = `/* NOTION_DATA_START */${JSON.stringify(extra, null, 2)}/* NOTION_DATA_END */`;
    const updated = source.replace(
      /\/\* NOTION_DATA_START \*\/[\s\S]*?\/\* NOTION_DATA_END \*\//,
      replacement,
    );
    if (updated === source) throw new Error("Notion data marker was not replaced");
    fs.writeFileSync(modulePath, updated);
    process.stdout.write(`Synced ${extra.length} products into ${modulePath}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
