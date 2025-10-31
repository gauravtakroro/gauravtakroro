import fs from "fs";
import puppeteer from "puppeteer";

const MEDIUM_URL = "https://medium.com/@gauravtakjaipur/latest";
const README_PATH = "README.md";

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(MEDIUM_URL, { waitUntil: "networkidle2" });

  // Wait for articles to load
  await page.waitForSelector("article");

  const posts = await page.$$eval("article", articles =>
    articles.map(article => {
      const titleEl = article.querySelector("h2, h1");
      const title = titleEl ? titleEl.textContent.trim() : "Untitled";

      const linkEl = article.querySelector("a");
      const link = linkEl ? linkEl.href.split("?")[0] : null;

      const clapEl = article.querySelector("button[data-action='show-recommends']");
      const claps = clapEl ? clapEl.textContent.replace("K", "000").trim() : "0";

      const viewsEl = article.querySelector("span:contains('views')");
      const views = viewsEl ? viewsEl.textContent.replace("views", "").trim() : "0";

      return { title, link, claps: parseInt(claps) || 0, views: parseInt(views) || 0 };
    })
  );

  await browser.close();

  // Sort by views or claps
  const topPosts = posts
    .filter(p => p.link)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const blogList = topPosts
    .map(
      p =>
        `- [${p.title}](${p.link}) — 👏 ${p.claps.toLocaleString()} claps | 👁️ ${p.views.toLocaleString()} views`
    )
    .join("\n");

  const readme = fs.readFileSync(README_PATH, "utf8");
  const updated = readme.replace(
    /(<!-- MEDIUM-BLOG-START -->)([\s\S]*?)(<!-- MEDIUM-BLOG-END -->)/,
    `$1\n${blogList}\n$3`
  );

  fs.writeFileSync(README_PATH, updated);
  console.log("✅ Updated README with top Medium posts");
})();
