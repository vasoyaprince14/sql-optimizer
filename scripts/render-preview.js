// Renders docs/assets/report-preview.svg to docs/assets/report-preview.png using Puppeteer
// Usage: node scripts/render-preview.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const svgPath = path.resolve(__dirname, '..', 'docs', 'assets', 'report-preview.svg');
  const pngPath = path.resolve(__dirname, '..', 'docs', 'assets', 'report-preview.png');

  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found at', svgPath);
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const { width, height } = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const w = Number(svg.getAttribute('width')) || 1200;
    const h = Number(svg.getAttribute('height')) || 600;
    return { width: w, height: h };
  });

  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  const el = await page.$('svg');
  await el.screenshot({ path: pngPath, type: 'png' });

  await browser.close();
  console.log('Generated PNG at', pngPath);
})();
