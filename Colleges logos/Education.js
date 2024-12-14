import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeCollegeLogos() {
  console.log('Starting browser...');
  let browser;
  let allLogos = [];
  const totalColleges = 3500; // Total colleges to scrape
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
    await page.goto('https://collegedunia.com/education-colleges', {
      waitUntil: 'networkidle2',
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table tbody tr');

    const csvWriter = createObjectCsvWriter({
      path: 'Education_colleges_logos.csv',
      header: [
        { id: 'logo', title: 'Logo URL' },
      ],
    });

    let pageNum = 1; // Start from the first page
    let scrapedCount = 0;

    while (scrapedCount < totalColleges && attempts < maxAttempts) {
      console.log(`Scraping page ${pageNum}...`);
      await page.goto(`https://collegedunia.com/education-colleges?page=${pageNum}`, {
        waitUntil: 'networkidle2',
      });

      const newLogos = await page.evaluate(() => {
        const data = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr'));

        rows.forEach((row, index) => {
          const logoElement = row.querySelector('td:nth-child(2) div div a img');
          const logoURL = logoElement ? logoElement.src.trim() : 'N/A';
          if (logoURL !== 'N/A') {
            data.push({ logo: logoURL });
          }
        });

        return data;
      });

      const previousCount = allLogos.length;
      const uniqueLogos = newLogos.filter(
        (logo) => !allLogos.some((existing) => existing.logo === logo.logo)
      );
      allLogos.push(...uniqueLogos);

      if (allLogos.length === previousCount) {
        attempts++;
        console.log(`No new logos found. Attempt ${attempts} of ${maxAttempts}.`);
        if (attempts >= maxAttempts) break;
      } else {
        attempts = 0; // Reset attempts
        console.log(`Extracted ${uniqueLogos.length} new logos. Total: ${allLogos.length}`);
      }

      // Save data in batches of 10
      if (allLogos.length % batchSize === 0 || allLogos.length >= totalColleges) {
        await csvWriter.writeRecords(allLogos);
        console.log(`Saved ${allLogos.length} logos to CSV.`);
      }

      // Move to the next page
      pageNum++;

      // Wait before scraping the next page
      await delay(2000); // Adjust delay if necessary
    }

    console.log('Scraping complete. Saving final data...');
    await csvWriter.writeRecords(allLogos);
    console.log(`Total logos saved: ${allLogos.length}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Browser closed.');
  }
}

scrapeCollegeLogos();
