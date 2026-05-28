const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const START_URL = "https://rfyl.en.alibaba.com/productlist.html";

async function main() {
  const browser = await chromium.launch({ headless: false });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  console.log("Opening:", START_URL);

  await page.goto(START_URL, {
    waitUntil: "networkidle",
    timeout: 90000,
  });

  await page.waitForTimeout(8000);

  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: "alibaba-debug.png",
    fullPage: true,
  });

  const html = await page.content();

  fs.writeFileSync(
    path.join(process.cwd(), "alibaba-debug.html"),
    html,
    "utf-8"
  );

  const result = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: a.innerText?.trim(),
      href: a.href,
    }));

    const images = Array.from(document.querySelectorAll("img")).map((img) => ({
      alt: img.alt,
      src: img.src,
      dataSrc: img.getAttribute("data-src"),
    }));

    return {
      title: document.title,
      linkCount: links.length,
      imageCount: images.length,
      firstLinks: links.slice(0, 30),
      firstImages: images.slice(0, 30),
      bodyText: document.body.innerText.slice(0, 3000),
    };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

main();