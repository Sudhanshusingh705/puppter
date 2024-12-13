import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeColleges() {
  console.log('Starting browser...');
  let browser;
  let allColleges = [];
  const totalColleges = 1680; // Total colleges to scrape
  const batchSize = 10; // Number of colleges to save in one batch
  let attempts = 0;
  const maxAttempts = 5;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('Navigating to website...');
    await page.goto('https://collegedunia.com/delhi-ncr-colleges', {
      waitUntil: 'networkidle2',
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table tbody tr');

    const csvWriter = createObjectCsvWriter({
      path: 'DelhiNCR_colleges.csv',
      header: [
        { id: 'cdRank', title: 'CD Rank' },
        { id: 'colleges', title: 'Colleges' },
      ],
    });

    // Loop for scraping the data
    let pageNum = 1; // Start from the first page
    let scrapedCount = 0;

    while (scrapedCount < totalColleges && attempts < maxAttempts) {
      console.log(`Scraping page ${pageNum}...`);
      await page.goto(`https://collegedunia.com/delhi-ncr-colleges?page=${pageNum}`, {
        waitUntil: 'networkidle2',
      });

      const newColleges = await page.evaluate(() => {
        const data = [];
        // Extract CD Rank and Colleges using provided XPath
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        
        rows.forEach((row, index) => {
          const cdRank = row.querySelector('td:nth-child(1)') ? row.querySelector('td:nth-child(1)').textContent.trim() : 'N/A';
          const colleges = row.querySelector('td:nth-child(2) div div a h3') ? row.querySelector('td:nth-child(2) div div a h3').textContent.trim() : 'N/A';
          data.push({ cdRank, colleges });
        });

        return data;
      });

      const previousCount = allColleges.length;
      const uniqueColleges = newColleges.filter(
        (college) =>
          !allColleges.some(
            (existing) => existing.cdRank === college.cdRank && existing.colleges === college.colleges
          )
      );
      allColleges.push(...uniqueColleges);

      if (allColleges.length === previousCount) {
        attempts++;
        console.log(`No new colleges found. Attempt ${attempts} of ${maxAttempts}.`);
        if (attempts >= maxAttempts) break;
      } else {
        attempts = 0; // Reset attempts
        console.log(`Extracted ${uniqueColleges.length} new colleges. Total: ${allColleges.length}`);
      }

      // Save data in batches of 10
      if (allColleges.length % batchSize === 0 || allColleges.length >= totalColleges) {
        await csvWriter.writeRecords(allColleges);
        console.log(`Saved ${allColleges.length} colleges to CSV.`);
      }

      // Move to the next page
      pageNum++;

      // Wait before scraping the next page
      await delay(2000);  // Adjust delay if necessary
    }

    console.log('Scraping complete. Saving final data...');
    await csvWriter.writeRecords(allColleges);
    console.log(`Total colleges saved: ${allColleges.length}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Browser closed.');
  }
}

scrapeColleges();
