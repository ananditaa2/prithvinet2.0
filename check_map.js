const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.toString()}`);
  });

  try {
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
    
    // Login
    await page.type('input[type="email"]', 'admin@prithvinet.gov.in');
    await page.type('input[type="password"]', 'Demo@123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Go to heatmap
    console.log("Navigating to heatmap...");
    await page.goto('http://localhost:8080/dashboard/heatmap', { waitUntil: 'networkidle2' });
    
    // Wait for a second to let map render
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Done checking.");
  } catch (err) {
    console.error("Puppeteer error:", err);
  } finally {
    await browser.close();
  }
})();
