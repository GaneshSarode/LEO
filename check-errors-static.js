const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Page loaded on port 3000.');
    
    // Check local storage / indexeddb to ensure user is logged in
    // Wait, the app doesn't require login, it uses a random session ID if not logged in.
    
    // Click "Tasks" tab
    console.log('Clicking Tasks...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tasksTab = tabs.find(t => t.innerText.includes('Tasks'));
      if(tasksTab) tasksTab.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Click "Schedule" tab
    console.log('Clicking Schedule...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(t => t.innerText.includes('Schedule'));
      if(tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click "Habits" tab
    console.log('Clicking Habits...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(t => t.innerText.includes('Habits'));
      if(tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Successfully navigated through tabs.');
  } catch (err) {
    console.log('Error:', err.message);
  }

  await browser.close();
})();
