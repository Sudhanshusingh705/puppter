import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url, folder, filename) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const folderPath = path.resolve(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.resolve(folderPath, filename);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error);
  }
}

async function scrapeCollegeLogos() {
  console.log('Starting browser...');
  let browser;
  const totalColleges = 7400; // Total colleges to scrape
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
    await page.goto('https://collegedunia.com/management-colleges', {
      waitUntil: 'networkidle2',
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table tbody tr');

    let pageNum = 1; // Start from the first page
    let scrapedCount = 0;

    while (scrapedCount < totalColleges && attempts < maxAttempts) {
      console.log(`Scraping page ${pageNum}...`);
      await page.goto(`https://collegedunia.com/management-colleges?page=${pageNum}`, {
        waitUntil: 'networkidle2',
      });

      const newLogos = await page.evaluate(() => {
        const data = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr'));

        rows.forEach((row) => {
          const collegeNameElement = row.querySelector('td:nth-child(2) div div a h3');
          const logoElement = row.querySelector('td:nth-child(2) div div a img');
          const collegeName = collegeNameElement ? collegeNameElement.textContent.trim() : 'Unknown_College';
          const logoURL = logoElement ? logoElement.src.trim() : null;
          if (logoURL) {
            data.push({ collegeName, logoURL });
          }
        });

        return data;
      });

      for (const { collegeName, logoURL } of newLogos) {
        const sanitizedCollegeName = collegeName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${sanitizedCollegeName}.jpg`;
        await downloadImage(logoURL, 'College_Logos', filename);
        console.log(`Downloaded logo for ${collegeName}`);
      }

      scrapedCount += newLogos.length;
      if (newLogos.length === 0) {
        attempts++;
        console.log(`No new logos found. Attempt ${attempts} of ${maxAttempts}.`);
        if (attempts >= maxAttempts) break;
      } else {
        attempts = 0; // Reset attempts
      }

      // Move to the next page
      pageNum++;

      // Wait before scraping the next page
      await delay(2000); // Adjust delay if necessary
    }

    console.log('Scraping complete. Logos saved.');
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




















// import puppeteer from 'puppeteer';
// import { createObjectCsvWriter } from 'csv-writer';

// async function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// async function scrapeCollegeLogos() {
//   console.log('Starting browser...');
//   let browser;
//   let allLogos = [];
//   const totalColleges = 130; // Total colleges to scrape
//   const batchSize = 10; // Number of colleges to save in one batch
//   let attempts = 0;
//   const maxAttempts = 5;

//   try {
//     browser = await puppeteer.launch({
//       headless: false,
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
//     });

//     const page = await browser.newPage();
//     await page.setUserAgent(
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//     );

//     console.log('Navigating to website...');
//     await page.goto('https://collegedunia.com/veterinary-sciences-colleges', {
//       waitUntil: 'networkidle2',
//     });

//     console.log('Waiting for content to load...');
//     await page.waitForSelector('table tbody tr');

//     const csvWriter = createObjectCsvWriter({
//       path: 'Veterinary_colleges_logos.csv',
//       header: [
//         { id: 'logo', title: 'Logo URL' },
//       ],
//     });

//     let pageNum = 1; // Start from the first page
//     let scrapedCount = 0;

//     while (scrapedCount < totalColleges && attempts < maxAttempts) {
//       console.log(`Scraping page ${pageNum}...`);
//       await page.goto(`https://collegedunia.com/veterinary-sciences-colleges?page=${pageNum}`, {
//         waitUntil: 'networkidle2',
//       });

//       const newLogos = await page.evaluate(() => {
//         const data = [];
//         const rows = Array.from(document.querySelectorAll('table tbody tr'));

//         rows.forEach((row, index) => {
//           const logoElement = row.querySelector('td:nth-child(2) div div a img');
//           const logoURL = logoElement ? logoElement.src.trim() : 'N/A';
//           if (logoURL !== 'N/A') {
//             data.push({ logo: logoURL });
//           }
//         });

//         return data;
//       });

//       const previousCount = allLogos.length;
//       const uniqueLogos = newLogos.filter(
//         (logo) => !allLogos.some((existing) => existing.logo === logo.logo)
//       );
//       allLogos.push(...uniqueLogos);

//       if (allLogos.length === previousCount) {
//         attempts++;
//         console.log(`No new logos found. Attempt ${attempts} of ${maxAttempts}.`);
//         if (attempts >= maxAttempts) break;
//       } else {
//         attempts = 0; // Reset attempts
//         console.log(`Extracted ${uniqueLogos.length} new logos. Total: ${allLogos.length}`);
//       }

//       // Save data in batches of 10
//       if (allLogos.length % batchSize === 0 || allLogos.length >= totalColleges) {
//         await csvWriter.writeRecords(allLogos);
//         console.log(`Saved ${allLogos.length} logos to CSV.`);
//       }

//       // Move to the next page
//       pageNum++;

//       // Wait before scraping the next page
//       await delay(2000); // Adjust delay if necessary
//     }

//     console.log('Scraping complete. Saving final data...');
//     await csvWriter.writeRecords(allLogos);
//     console.log(`Total logos saved: ${allLogos.length}`);
//   } catch (error) {
//     console.error('Error during scraping:', error);
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//     console.log('Browser closed.');
//   }
// }

// scrapeCollegeLogos();
