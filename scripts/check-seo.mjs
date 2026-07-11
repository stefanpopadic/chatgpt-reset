import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const canonical = "https://chatgptreset.com/";
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) failures.push(label);
}

function requirePngSize(relativePath, width, height) {
  const image = readFileSync(join(root, relativePath));
  const actualWidth = image.readUInt32BE(16);
  const actualHeight = image.readUInt32BE(20);

  if (actualWidth !== width || actualHeight !== height) {
    failures.push(`${relativePath} must be ${width}x${height}, found ${actualWidth}x${actualHeight}`);
  }
}

const html = read("index.html");
const app = read("src/App.jsx");
const robots = read("public/robots.txt");
const sitemap = read("public/sitemap.xml");
const manifest = JSON.parse(read("public/site.webmanifest"));
const structuredDataMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const structuredData = structuredDataMatch ? JSON.parse(structuredDataMatch[1]) : null;

[
  ["<title>ChatGPT Reset | 10,000,000 Taps, One Reset</title>", "descriptive title"],
  ['name="description"', "meta description"],
  [`rel="canonical" href="${canonical}"`, "canonical URL"],
  ['name="robots"', "robots meta"],
  ['property="og:title"', "Open Graph title"],
  ['property="og:image" content="https://chatgptreset.com/og-image.png"', "Open Graph image"],
  ['name="twitter:card" content="summary_large_image"', "X large image card"],
  ['type="application/ld+json"', "structured data"],
  ['rel="manifest" href="/site.webmanifest"', "web app manifest link"],
].forEach(([expected, label]) => requireText(html, expected, label));

requireText(app, '<h1 className="site-title">', "visible h1");
requireText(robots, `Sitemap: ${canonical}sitemap.xml`, "absolute sitemap reference");
requireText(sitemap, `<loc>${canonical}</loc>`, "canonical sitemap URL");

if (manifest.start_url !== "/") failures.push("manifest start_url");
if (manifest.icons?.length !== 3) failures.push("manifest icon set");
if (!structuredData?.["@graph"]?.some((item) => item["@type"] === "WebSite")) {
  failures.push("WebSite structured data");
}
if (!structuredData?.["@graph"]?.some((item) => item["@type"] === "WebApplication")) {
  failures.push("WebApplication structured data");
}

requirePngSize("public/og-image.png", 1200, 630);
requirePngSize("public/icons/icon-192.png", 192, 192);
requirePngSize("public/icons/icon-512.png", 512, 512);
requirePngSize("public/apple-touch-icon.png", 180, 180);

if (failures.length > 0) {
  console.error(`SEO check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("SEO check passed: metadata, crawler files, structured data, and social assets are launch-ready.");
