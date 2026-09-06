import { chromium } from "@playwright/test";
import { pathToFileURL } from "url";
import path from "path";

const src = path.resolve("docs/client/getting-started-with-prosper.html");
const out = path.resolve("docs/client/getting-started-with-prosper-BMS.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("wrote", out);
