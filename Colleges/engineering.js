import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeEngineeringColleges() {
  console.log('Starting browser...');
  let browser;
  let allColleges = [];
  let csvWriter;

  try {
    // Initialize CSV writer early
    csvWriter = createObjectCsvWriter({
      path: 'engineering_colleges.csv',
      header: [
        {id: 'cdRank', title: 'CD Rank'},
        {id: 'name', title: 'College Name'}
      ]
    });

    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Set a more realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    page.setDefaultTimeout(60000); // Reduce timeout to 1 minute

    console.log('Navigating to collegedunia.com engineering colleges page...');
    
    // Add initial delay before first request
    await delay(3000);
    
    await page.goto('https://collegedunia.com/engineering-colleges', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Waiting for content to load...');
    
    // Wait for table to be visible
    await page.waitForSelector('table', { timeout: 60000 });
    
    // Additional delay after page load
    await delay(2000);

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 1000;
    const targetColleges = 6242;
    let noNewCollegesCount = 0;
    const maxNoNewCollegesAttempts = 10;

    async function loadMoreContent() {
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(2000); // Add consistent delay between scrolls
      const newHeight = await page.evaluate('document.body.scrollHeight');
      return newHeight > previousHeight;
    }

    console.log('Extracting college data...');
    while (scrollAttempts < maxScrollAttempts && allColleges.length < targetColleges) {
      try {
        const newColleges = await page.evaluate(() => {
          const colleges = [];
          // Updated selector to match the table structure
          document.querySelectorAll('tr').forEach((row) => {
            const rankElement = row.querySelector('td:first-child');
            const nameElement = row.querySelector('td a');
            
            if (nameElement && rankElement) {
              colleges.push({
                cdRank: rankElement.textContent.trim().replace('#', ''),
                name: nameElement.textContent.trim()
              });
            }
          });
          return colleges;
        });

        console.log(`Found ${newColleges.length} colleges on current page`);

        const uniqueNewColleges = newColleges.filter(college => 
          !allColleges.some(existingCollege => existingCollege.name === college.name)
        );

        if (uniqueNewColleges.length > 0) {
          allColleges.push(...uniqueNewColleges);
          // Write to CSV after each successful scrape
          await csvWriter.writeRecords(uniqueNewColleges).catch(console.error);
          console.log(`Total colleges scraped: ${allColleges.length}`);
          noNewCollegesCount = 0;
        } else {
          noNewCollegesCount++;
          console.log(`No new colleges found. Attempt ${noNewCollegesCount} of ${maxNoNewCollegesAttempts}`);
          if (noNewCollegesCount >= maxNoNewCollegesAttempts) {
            console.log('No new colleges found after multiple attempts. Ending scraping.');
            break;
          }
        }

        const hasMoreContent = await loadMoreContent();
        if (!hasMoreContent) {
          console.log('Reached end of page content.');
          break;
        }

        scrollAttempts++;
        // Add random delay between iterations
        await delay(Math.random() * 1000 + 1000);
      } catch (error) {
        console.error('Error during scraping iteration:', error);
        // Save current progress on error
        if (allColleges.length > 0) {
          await csvWriter.writeRecords(allColleges).catch(console.error);
        }
        await delay(5000);
        scrollAttempts++;
      }
    }

    console.log('--- Scraping Summary ---');
    console.log(`Total engineering colleges scraped: ${allColleges.length}`);
    if (allColleges.length > 0) {
      console.log('First 5 colleges:');
      console.log(JSON.stringify(allColleges.slice(0, 5), null, 2));
    }

  } catch (error) {
    console.error('Error during scraping:', error);
    // Attempt to save any collected data even if there's an error
    if (allColleges.length > 0 && csvWriter) {
      await csvWriter.writeRecords(allColleges).catch(console.error);
      console.log('Saved collected data before error');
    }
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
    console.log('Browser closed.');
  }
}

// Wrap the main function call in a try-catch block
(async () => {
  try {
    await scrapeEngineeringColleges();
  } catch (error) {
    console.error('Runtime error:', error);
  }
})();

