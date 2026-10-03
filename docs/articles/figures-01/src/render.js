// Render every SVG in ./svg to a 2x PNG in ./png with the pre-installed Chromium.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const SVG = path.join(DIR, "svg");
const PNG = path.join(DIR, "png");
fs.mkdirSync(PNG, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  for (const f of fs.readdirSync(SVG).filter((n) => n.endsWith(".svg")).sort()) {
    const svg = fs.readFileSync(path.join(SVG, f), "utf8");
    const m = svg.match(/width="(\d+)" height="(\d+)"/);
    const w = Number(m[1]);
    const h = Number(m[2]);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.setContent(`<html><body style="margin:0;background:#fcfcfb">${svg}</body></html>`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(PNG, f.replace(".svg", ".png")), clip: { x: 0, y: 0, width: w, height: h } });
    await page.close();
    console.log("rendered", f);
  }
  await browser.close();
})();
