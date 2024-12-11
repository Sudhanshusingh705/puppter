




















const puppeteer = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs').promises;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeColleges() {
  console.log('Starting browser...');
  let browser;
  let allColleges = [];  // Move this declaration outside of the try block

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(180000);

    console.log('Navigating to collegedunia.com...');
    await page.goto('https://collegedunia.com/india-colleges', {
      waitUntil: 'networkidle0',
      timeout: 180000
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table', { timeout: 180000 });

    const csvWriter = createObjectCsvWriter({
      path: 'college_details.csv',
      header: [
        {id: 'cdRank', title: 'CD Rank'},
        {id: 'name', title: 'College Name'}
      ]
    });

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 200;
    const targetColleges = 2000;
    let noNewCollegesCount = 0;
    const maxNoNewCollegesAttempts = 10;

    async function loadMoreContent() {
      // ... (keep the loadMoreContent function as is)
    }

    console.log('Extracting college data...');
    while (scrollAttempts < maxScrollAttempts) {
      try {
        // ... (keep the main scraping loop as is)
      } catch (error) {
        console.error('Error during scraping iteration:', error);
        await delay(15000);
        scrollAttempts++;
      }
    }

    // Final save to CSV
    await csvWriter.writeRecords(allColleges);

    console.log('--- Scraping Summary ---');
    console.log(`Total colleges scraped: ${allColleges.length}`);
    console.log('First 5 colleges:');
    console.log(JSON.stringify(allColleges.slice(0, 5), null, 2));
    console.log('College details saved to college_details.csv');

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    if (allColleges.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: '20k_college_details_final.csv',
        header: [
          {id: 'cdRank', title: 'CD Rank'},
          {id: 'name', title: 'College Name'}
        ]
      });
      await csvWriter.writeRecords(allColleges);
      console.log('Final progress saved to 20k_college_details_final.csv');
    }
    if (browser) {
      await browser.close().catch(console.error);
    }
    console.log('Browser closed.');
  }
}

scrapeColleges();

