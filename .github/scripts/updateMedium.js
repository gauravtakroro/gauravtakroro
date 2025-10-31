const fs = require("fs");
const Parser = require("rss-parser");
const parser = new Parser();

(async () => {
  try {
    const feed = await parser.parseURL("https://medium.com/feed/@gauravtakjaipur");

    const latestPosts = feed.items.slice(0, 10).map(item => {
      const title = item.title.replace(/"/g, '\\"');
      const link = item.link;
      const date = new Date(item.isoDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `- [${title}](${link}) *(Published on ${date})*`;
    }).join("\n");

    const readmePath = "README.md";
    const readmeContent = fs.readFileSync(readmePath, "utf8");

    const updatedContent = readmeContent.replace(
      /(<!-- MEDIUM-BLOG-START -->)([\s\S]*?)(<!-- MEDIUM-BLOG-END -->)/,
      `$1\n${latestPosts}\n$3`
    );

    fs.writeFileSync(readmePath, updatedContent);
    console.log("✅ README updated with latest Medium posts!");
  } catch (error) {
    console.error("❌ Failed to update Medium posts:", error);
    process.exit(1);
  }
})();
