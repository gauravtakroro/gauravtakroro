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
  await page.goto(MEDIUM_URL, { waitUntil: "networkidle2" });

  // Wait for articles to load
  await page.waitForSelector("article");

  const posts = await page.$$eval("article", (articles) =>
    articles.map((article) => {
      const titleEl = article.querySelector("h2, h1");
      const title = titleEl ? titleEl.textContent.trim() : "Untitled";

      const linkEl = article.querySelector("a");
      const link = linkEl ? linkEl.href.split("?")[0] : null;

      const clapEl = Array.from(article.querySelectorAll("span")).find((el) =>
        el.textContent.includes("clap")
      );
      const clapsText = clapEl ? clapEl.textContent.replace(/[^0-9K]/g, "").trim() : "0";
      const claps = clapsText.includes("K")
        ? parseFloat(clapsText) * 1000
        : parseInt(clapsText) || 0;

      const viewsEl = Array.from(article.querySelectorAll("span")).find((el) =>
        el.textContent.includes("views")
      );
      const viewsText = viewsEl ? viewsEl.textContent.replace(/[^0-9K]/g, "").trim() : "0";
      const views = viewsText.includes("K")
        ? parseFloat(viewsText) * 1000
        : parseInt(viewsText) || 0;

      return { title, link, claps, views };
    })
  );

  await browser.close();

  // Sort by views (descending)
  const topPosts = posts
    .filter((p) => p.link)
    .sort((a, b) => b.views - a.views)
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
  console.log("✅ README updated with top Medium posts!");
})();
