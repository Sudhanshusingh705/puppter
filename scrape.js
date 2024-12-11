const puppeteer = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeColleges() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    console.log('Navigating to collegedunia.com...');
    await page.goto('https://collegedunia.com/india-colleges', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table', { timeout: 60000 });

    const csvWriter = createObjectCsvWriter({
      path: 'college_details.csv',
      header: [
        {id: 'cdRank', title: 'CD Rank'},
        {id: 'name', title: 'College Name'}
      ]
    });

    let allColleges = [];
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;  // Reduced to accommodate fewer colleges

    console.log('Extracting college data...');
    while (scrollAttempts < maxScrollAttempts) {
      const newColleges = await page.evaluate(() => {
        const items = [];
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach(row => {
          const cdRank = row.querySelector('td:first-child')?.textContent?.trim();
          const name = row.querySelector('td:nth-child(2) h3')?.textContent?.trim();
          
          if (cdRank && name) {
            items.push({ cdRank, name });
          }
        });
        return items;
      });

      console.log(`Found ${newColleges.length} new colleges on this scroll`);

      for (const college of newColleges) {
        if (!allColleges.some(existingCollege => existingCollege.cdRank === college.cdRank)) {
          allColleges.push({
            cdRank: college.cdRank,
            name: college.name
          });
          console.log(`Processed college ${college.cdRank}: ${college.name}`);
        }
      }

      console.log(`Total colleges processed: ${allColleges.length}`);

      // Save to CSV after each scroll
      await csvWriter.writeRecords(allColleges);
      console.log('Updated CSV file');

      if (allColleges.length >= 100) {
        console.log('Reached test limit of 100 colleges');
        break;
      }

      const currentHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(2000);

      if (currentHeight === previousHeight) {
        scrollAttempts++;
        console.log(`No new content loaded. Attempt ${scrollAttempts} of ${maxScrollAttempts}`);
      } else {
        scrollAttempts = 0;
        console.log('New content loaded, continuing to scroll...');
      }

      previousHeight = currentHeight;
    }

    console.log('--- Scraping Summary ---');
    console.log(`Total colleges scraped: ${allColleges.length}`);
    console.log('First 5 colleges:');
    console.log(JSON.stringify(allColleges.slice(0, 5), null, 2));
    console.log('College details saved to college_details.csv');

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

scrapeColleges();