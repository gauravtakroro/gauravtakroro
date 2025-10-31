const fs = require("fs");
const puppeteer = require("puppeteer");

const MEDIUM_URL = "https://medium.com/@gauravtakjaipur/latest";
const README_PATH = "README.md";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  console.log("🌐 Navigating to Medium profile...");
  await page.goto(MEDIUM_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Try to scroll and trigger lazy loading
  let previousHeight;
  try {
    previousHeight = await page.evaluate("document.body.scrollHeight");
    while (true) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitFor(3000);
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;
    }
  } catch (err) {
    console.warn("⚠️ Scroll loading may have stopped early:", err.message);
  }

  // Wait a bit more and retry selector
  await page.waitForTimeout(3000);
  const articles = await page.$$("article");
  if (articles.length === 0) {
    console.error("❌ No articles found — Medium page structure might have changed.");
    await browser.close();
    process.exit(1);
  }

  console.log(`✅ Found ${articles.length} articles`);

  const posts = await page.$$eval("article", (articles) =>
    articles.map((article) => {
      const titleEl = article.querySelector("h2, h1");
      const title = titleEl ? titleEl.textContent.trim() : "Untitled";

      const linkEl = article.querySelector("a[href*='medium.com']");
      const link = linkEl ? linkEl.href.split("?")[0] : null;

      const text = article.innerText;
      const clapsMatch = text.match(/(\d+(\.\d+)?[Kk]?)\s*clap/);
      const viewsMatch = text.match(/(\d+(\.\d+)?[Kk]?)\s*view/);

      const parseCount = (str) => {
        if (!str) return 0;
        return str.includes("K") || str.includes("k")
          ? parseFloat(str) * 1000
          : parseInt(str);
      };

      return {
        title,
        link,
        claps: parseCount(clapsMatch ? clapsMatch[1] : "0"),
        views: parseCount(viewsMatch ? viewsMatch[1] : "0"),
      };
    })
  );

  await browser.close();

  // Sort by views descending
  const topPosts = posts
    .filter((p) => p.link)
    .sort((a, b) => b.views - a.views || b.claps - a.claps)
    .slice(0, 5);

  const blogList = topPosts
    .map(
      (p) =>
        `- [${p.title}](${p.link}) — 👏 ${p.claps.toLocaleString()} claps | 👁️ ${p.views.toLocaleString()} views`
    )
    .join("\n");

  const readme = fs.readFileSync(README_PATH, "utf8");
  const updated = readme.replace(
    /(<!-- MEDIUM-BLOG-START -->)([\s\S]*?)(<!-- MEDIUM-BLOG-END -->)/,
    `$1\n${blogList}\n$3`
  );

  fs.writeFileSync(README_PATH, updated);
  console.log("🚀 README updated successfully!");
})();
