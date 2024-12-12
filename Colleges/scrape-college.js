const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeColleges() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: false,  // Changed to false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    console.log('Navigating to collegedunia.com...');
    await page.goto('https://collegedunia.com/india-colleges', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('table', { timeout: 60000 });

    const logoFolder = 'college_logos';
    await fs.mkdir(logoFolder, { recursive: true });

    const csvWriter = createObjectCsvWriter({
      path: 'college_details.csv',
      header: [
        {id: 'serial', title: 'Serial'},
        {id: 'name', title: 'Name'},
        {id: 'location', title: 'Location'},
        {id: 'logoPath', title: 'Logo Path'}
      ]
    });

    let allColleges = [];
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 200;

    async function saveLogoAndAddCollege(logoUrl, name, location, serial) {
      if (logoUrl) {
        const logoFileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_logo.png`;
        const logoPath = path.join(logoFolder, logoFileName);
        try {
          const response = await page.goto(logoUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          if (response.ok()) {
            const buffer = await response.buffer();
            await fs.writeFile(logoPath, buffer);
            allColleges.push({
              serial,
              name,
              location,
              logoPath
            });
            console.log(`Saved logo for ${name} (${serial})`);
          } else {
            console.error(`Failed to download logo for ${name}: HTTP ${response.status()}`);
          }
        } catch (error) {
          console.error(`Error saving logo for ${name}:`, error.message);
        }
        await page.goBack({ waitUntil: 'networkidle0' });
      }
    }

    console.log('Extracting and saving college data...');
    while (scrollAttempts < maxScrollAttempts) {
      const newColleges = await page.evaluate(() => {
        const items = [];
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach(row => {
          const college = {
            name: row.querySelector('td:nth-child(2) a')?.textContent?.trim(),
            location: row.querySelector('td:nth-child(2) .text-gray-600')?.textContent?.trim(),
            logoUrl: row.querySelector('td:nth-child(1) img')?.src
          };
          if (college.name && college.location && college.logoUrl) {
            items.push(college);
          }
        });
        return items;
      });

      console.log(`Found ${newColleges.length} new colleges on this scroll`);

      for (const college of newColleges) {
        if (!allColleges.some(existingCollege => existingCollege.name === college.name)) {
          await saveLogoAndAddCollege(college.logoUrl, college.name, college.location, allColleges.length + 1);
        }
      }

      console.log(`Total colleges found: ${allColleges.length}`);

      const currentHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(3000);  // Increased delay to 3 seconds

      if (currentHeight === previousHeight) {
        scrollAttempts++;
        console.log(`No new content loaded. Attempt ${scrollAttempts} of ${maxScrollAttempts}`);
      } else {
        scrollAttempts = 0;
      }

      previousHeight = currentHeight;

      if (allColleges.length >= 500) {
        console.log('Reached maximum number of colleges (500)');
        break;
      }
    }

    await csvWriter.writeRecords(allColleges);

    console.log('Scraped Colleges:');
    console.log(JSON.stringify(allColleges.slice(0, 5), null, 2));
    console.log(`Total colleges found: ${allColleges.length}`);
    console.log('College details saved to college_details.csv');
    console.log('College logos saved in college_logos folder');

    // Automation display logic
    console.log('--- Automation Summary ---');
    console.log(`Successfully saved ${allColleges.length} colleges.`);
    allColleges.slice(0, 10).forEach(college => {
      console.log(`${college.serial}. ${college.name} - ${college.location}`);
    });

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

scrapeColleges();





























// const puppeteer = require('puppeteer');
// const fs = require('fs').promises;
// const path = require('path');
// const { createObjectCsvWriter } = require('csv-writer');

// async function delay(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// async function scrapeColleges() {
//   console.log('Starting browser...');
//   const browser = await puppeteer.launch({
//     headless: "new",
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });

//   try {
//     const page = await browser.newPage();
    
//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
//     page.setDefaultTimeout(60000);

//     console.log('Navigating to collegedunia.com...');
//     const startTime = Date.now();
//     await page.goto('https://collegedunia.com/india-colleges', {
//       waitUntil: 'networkidle0',
//       timeout: 60000
//     });
//     const endTime = Date.now();
//     const responseTime = endTime - startTime;
//     console.log(`Initial page load time: ${responseTime}ms`);

//     console.log('Waiting for content to load...');
//     await page.waitForSelector('table', { timeout: 60000 });

//     const logoFolder = 'college_logos';
//     await fs.mkdir(logoFolder, { recursive: true });
    
//     const csvWriter = createObjectCsvWriter({
//       path: 'college_details.csv',
//       header: [
//         {id: 'name', title: 'Name'},
//         {id: 'location', title: 'Location'},
//         {id: 'courseFees', title: 'Course Fees'},
//         {id: 'placement', title: 'Placement'},
//         {id: 'rating', title: 'Rating'},
//         {id: 'logoPath', title: 'Logo Path'}
//       ]
//     });

//     let allColleges = [];
//     let previousHeight = 0;
//     let scrollAttempts = 0;
//     const maxScrollAttempts = 200;
//     let baseDelay = responseTime + 150; // 150ms added to the initial response time

//     while (scrollAttempts < maxScrollAttempts) {
//       const scrollStartTime = Date.now();
      
//       const newColleges = await page.evaluate(() => {
//         const items = [];
//         const rows = document.querySelectorAll('tbody tr');
        
//         rows.forEach(row => {
//           const college = {
//             name: row.querySelector('td:nth-child(2)')?.textContent?.trim(),
//             location: row.querySelector('td:nth-child(2) .text-gray-600')?.textContent?.trim(),
//             courseFees: row.querySelector('td:nth-child(3)')?.textContent?.trim(),
//             placement: row.querySelector('td:nth-child(4)')?.textContent?.trim(),
//             rating: row.querySelector('td:nth-child(5) .text-primary')?.textContent?.trim(),
//             logoUrl: row.querySelector('td:nth-child(1) img')?.src
//           };
//           items.push(college);
//         });

//         return items;
//       });

//       const uniqueNewColleges = newColleges.filter(college => 
//         !allColleges.some(existingCollege => existingCollege.name === college.name)
//       );

//       allColleges = allColleges.concat(uniqueNewColleges);

//       console.log(`Total colleges found: ${allColleges.length}`);

//       const currentHeight = await page.evaluate('document.body.scrollHeight');
//       await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      
//       const scrollEndTime = Date.now();
//       const scrollTime = scrollEndTime - scrollStartTime;
//       const delayTime = Math.max(baseDelay - scrollTime, 0);
//       console.log(`Scrolling took ${scrollTime}ms, waiting additional ${delayTime}ms`);
//       await delay(delayTime);

//       if (currentHeight === previousHeight) {
//         scrollAttempts++;
//         console.log(`No new content loaded. Attempt ${scrollAttempts} of ${maxScrollAttempts}`);
//       } else {
//         scrollAttempts = 0;
//         console.log('New content loaded, continuing to scroll...');
//       }

//       previousHeight = currentHeight;

//       if (allColleges.length >= 20000) {
//         console.log('Reached maximum number of colleges (20,000)');
//         break;
//       }
//     }

//     console.log('Downloading logos and preparing CSV data...');
//     for (let i = 0; i < allColleges.length; i++) {
//       const college = allColleges[i];
//       if (college.logoUrl) {
//         const logoFileName = `${college.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_logo.png`;
//         const logoPath = path.join(logoFolder, logoFileName);
//         try {
//           const logoPage = await browser.newPage();
//           const logoStartTime = Date.now();
//           const response = await logoPage.goto(college.logoUrl, { waitUntil: 'networkidle0', timeout: 30000 });
//           if (response.ok()) {
//             const buffer = await response.buffer();
//             await fs.writeFile(logoPath, buffer);
//             college.logoPath = logoPath;
//             console.log(`Saved logo for ${college.name} (${i + 1}/${allColleges.length})`);
//           } else {
//             console.error(`Failed to download logo for ${college.name}: HTTP ${response.status()}`);
//           }
//           await logoPage.close();
//           const logoEndTime = Date.now();
//           const logoResponseTime = logoEndTime - logoStartTime;
//           const logoDelayTime = Math.max(baseDelay - logoResponseTime, 0);
//           console.log(`Logo download took ${logoResponseTime}ms, waiting additional ${logoDelayTime}ms`);
//           await delay(logoDelayTime);
//         } catch (error) {
//           console.error(`Error saving logo for ${college.name}:`, error.message);
//         }
//       }
//     }

//     await csvWriter.writeRecords(allColleges);

//     console.log('Scraped Colleges:');
//     console.log(JSON.stringify(allColleges.slice(0, 5), null, 2));
//     console.log(`Total colleges found: ${allColleges.length}`);
//     console.log('College details saved to college_details.csv');
//     console.log('College logos saved in college_logos folder');

//   } catch (error) {
//     console.error('Error during scraping:', error);
//   } finally {
//     await browser.close();
//     console.log('Browser closed.');
//   }
// }

// scrapeColleges();