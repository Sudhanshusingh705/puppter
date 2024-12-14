import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs/promises';

puppeteer.use(StealthPlugin());

const csvWriter = createObjectCsvWriter({
  path: 'form_submissions.csv',
  header: [
    { id: 'timestamp', title: 'TIMESTAMP' },
    { id: 'name', title: 'FULL_NAME' },
    { id: 'email', title: 'EMAIL' },
    { id: 'mobile', title: 'MOBILE' },
    { id: 'city', title: 'CITY' },
    { id: 'course', title: 'COURSE' }
  ]
});

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function monitorForm() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-extensions'
    ]
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Monitor network requests
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Monitor XHR responses
  page.on('response', async response => {
    const request = response.request();
    if (request.method() === 'POST' && request.url().includes('register')) {
      try {
        const responseBody = await response.json();
        console.log('Form submission detected:', responseBody);
        const record = {
          timestamp: new Date().toISOString(),
          name: responseBody.fullName || '',
          email: responseBody.email || '',
          mobile: responseBody.mobile || '',
          city: responseBody.city || '',
          course: responseBody.course || ''
        };
        await csvWriter.writeRecords([record]);
        console.log('Saved form submission:', record);
      } catch (error) {
        console.error('Error processing form submission:', error);
      }
    }
  });

  try {
    console.log('Navigating to collegedunia.com...');
    await page.goto('https://collegedunia.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting for page to load completely...');
    await delay(5000);

    console.log('Attempting to find and interact with registration elements...');
    
    // Scroll the page
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Try multiple selectors and interactions
    const interactionAttempts = [
      { selector: 'input[name="fullName"]', action: null },
      { selector: 'button[data-modal-target="registerModal"]', action: 'click' },
      { selector: 'a[href*="register"]', action: 'click' },
      { selector: 'button:contains("Register")', action: 'click' },
      { selector: 'a:contains("Sign Up")', action: 'click' }
    ];

    for (const attempt of interactionAttempts) {
      try {
        await page.waitForSelector(attempt.selector, { timeout: 5000, visible: true });
        console.log(`Found element with selector: ${attempt.selector}`);
        if (attempt.action === 'click') {
          await page.click(attempt.selector);
          await delay(2000);
        }
        break;
      } catch (error) {
        console.log(`Selector ${attempt.selector} not found or interaction failed, trying next...`);
      }
    }

    // Set up a mutation observer to detect dynamically added form elements
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
          if (mutation.type === 'childList') {
            const addedNodes = mutation.addedNodes;
            for (let node of addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.querySelector('input[name="fullName"]')) {
                  console.log('Registration form detected!');
                  observer.disconnect();
                  break;
                }
              }
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

    console.log('Form monitor is now active and watching for submissions...');
    
    // Keep the script running
    await new Promise(() => {});

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
}

async function initializeCSV() {
  try {
    await fs.access('form_submissions.csv');
    console.log('CSV file exists, continuing...');
  } catch {
    console.log('Creating new CSV file...');
    await csvWriter.writeRecords([]);
  }
}

console.log('Starting advanced form submission monitor...');
await initializeCSV();
await monitorForm();








// import puppeteer from 'puppeteer';
// import { createObjectCsvWriter } from 'csv-writer';
// import fs from 'fs/promises';

// const csvWriter = createObjectCsvWriter({
//   path: 'form_submissions.csv',
//   header: [
//     { id: 'timestamp', title: 'TIMESTAMP' },
//     { id: 'name', title: 'FULL_NAME' },
//     { id: 'email', title: 'EMAIL' },
//     { id: 'mobile', title: 'MOBILE' },
//     { id: 'city', title: 'CITY' },
//     { id: 'course', title: 'COURSE' }
//   ]
// });

// async function delay(time) {
//   return new Promise(function(resolve) { 
//     setTimeout(resolve, time)
//   });
// }

// async function monitorForm() {
//   const browser = await puppeteer.launch({
//     headless: false,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });

//   const page = await browser.newPage();

//   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

//   await page.setRequestInterception(true);

//   page.on('request', async request => {
//     if (request.method() === 'POST' && request.url().includes('register')) {
//       try {
//         const postData = request.postData();
//         if (postData) {
//           const formData = JSON.parse(postData);
//           const record = {
//             timestamp: new Date().toISOString(),
//             name: formData.fullName || '',
//             email: formData.email || '',
//             mobile: formData.mobile || '',
//             city: formData.city || '',
//             course: formData.course || ''
//           };
//           await csvWriter.writeRecords([record]);
//           console.log('Saved form submission:', record);
//         }
//       } catch (error) {
//         console.error('Error processing form submission:', error);
//       }
//     }
//     request.continue();
//   });

//   try {
//     console.log('Navigating to collegedunia.com...');
//     await page.goto('https://collegedunia.com/', {
//       waitUntil: 'networkidle0',
//       timeout: 60000
//     });

//     console.log('Waiting for page to load completely...');
//     await delay(5000);

//     console.log('Checking for registration popup...');
//     const popupSelector = 'input[name="fullName"], button[data-modal-target="registerModal"]';
//     await page.waitForSelector(popupSelector, {
//       timeout: 30000,
//       visible: true
//     });

//     if (await page.$('button[data-modal-target="registerModal"]')) {
//       console.log('Clicking register button to open popup...');
//       await page.click('button[data-modal-target="registerModal"]');
//       await page.waitForSelector('input[name="fullName"]', { timeout: 5000 });
//     }

//     console.log('Form monitor is now active and watching for submissions...');
    
//     // Keep the script running
//     await new Promise(() => {});

//   } catch (error) {
//     console.error('An error occurred:', error);
//     await browser.close();
//   }
// }

// async function initializeCSV() {
//   try {
//     await fs.access('form_submissions.csv');
//     console.log('CSV file exists, continuing...');
//   } catch {
//     console.log('Creating new CSV file...');
//     await csvWriter.writeRecords([]);
//   }
// }

// console.log('Starting form submission monitor...');
// await initializeCSV();
// await monitorForm();













// // import puppeteer from 'puppeteer';
// // import { createObjectCsvWriter } from 'csv-writer';
// // import fs from 'fs/promises';

// // const csvWriter = createObjectCsvWriter({
// //   path: 'form_submissions.csv',
// //   header: [
// //     { id: 'timestamp', title: 'TIMESTAMP' },
// //     { id: 'name', title: 'FULL_NAME' },
// //     { id: 'email', title: 'EMAIL' },
// //     { id: 'mobile', title: 'MOBILE' },
// //     { id: 'city', title: 'CITY' },
// //     { id: 'course', title: 'COURSE' }
// //   ]
// // });

// // async function monitorForm() {
// //   const browser = await puppeteer.launch({
// //     headless: false,
// //     args: ['--no-sandbox', '--disable-setuid-sandbox']
// //   });

// //   const page = await browser.newPage();

// //   // Set a custom user agent
// //   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

// //   await page.setRequestInterception(true);

// //   page.on('request', async request => {
// //     if (request.method() === 'POST' && request.url().includes('register')) {
// //       try {
// //         const postData = request.postData();
// //         if (postData) {
// //           const formData = JSON.parse(postData);
// //           const record = {
// //             timestamp: new Date().toISOString(),
// //             name: formData.fullName || '',
// //             email: formData.email || '',
// //             mobile: formData.mobile || '',
// //             city: formData.city || '',
// //             course: formData.course || ''
// //           };
// //           await csvWriter.writeRecords([record]);
// //           console.log('Saved form submission:', record);
// //         }
// //       } catch (error) {
// //         console.error('Error processing form submission:', error);
// //       }
// //     }
// //     request.continue();
// //   });

// //   try {
// //     console.log('Navigating to collegedunia.com...');
// //     await page.goto('https://collegedunia.com/', {
// //       waitUntil: 'networkidle0',
// //       timeout: 60000
// //     });

// //     console.log('Waiting for page to load completely...');
// //     await page.waitForTimeout(5000);

// //     console.log('Checking for registration popup...');
// //     const popupSelector = 'input[name="fullName"], button[data-modal-target="registerModal"]';
// //     await page.waitForSelector(popupSelector, {
// //       timeout: 30000,
// //       visible: true
// //     });

// //     if (await page.$('button[data-modal-target="registerModal"]')) {
// //       console.log('Clicking register button to open popup...');
// //       await page.click('button[data-modal-target="registerModal"]');
// //       await page.waitForSelector('input[name="fullName"]', { timeout: 5000 });
// //     }

// //     console.log('Form monitor is now active and watching for submissions...');
    
// //     // Keep the script running
// //     await new Promise(() => {});

// //   } catch (error) {
// //     console.error('An error occurred:', error);
// //     await browser.close();
// //   }
// // }

// // async function initializeCSV() {
// //   try {
// //     await fs.access('form_submissions.csv');
// //     console.log('CSV file exists, continuing...');
// //   } catch {
// //     console.log('Creating new CSV file...');
// //     await csvWriter.writeRecords([]);
// //   }
// // }

// // console.log('Starting form submission monitor...');
// // await initializeCSV();
// // await monitorForm();













// // // import puppeteer from 'puppeteer';
// // // import { createObjectCsvWriter } from 'csv-writer';
// // // import fs from 'fs/promises';

// // // // Setup CSV writer
// // // const csvWriter = createObjectCsvWriter({
// // //   path: 'form_submissions.csv',
// // //   header: [
// // //     { id: 'timestamp', title: 'TIMESTAMP' },
// // //     { id: 'name', title: 'FULL_NAME' },
// // //     { id: 'email', title: 'EMAIL' },
// // //     { id: 'mobile', title: 'MOBILE' },
// // //     { id: 'city', title: 'CITY' },
// // //     { id: 'course', title: 'COURSE' }
// // //   ]
// // // });

// // // async function monitorForm() {
// // //   const browser = await puppeteer.launch({
// // //     headless: 'new',
// // //     args: ['--no-sandbox']
// // //   });

// // //   const page = await browser.newPage();

// // //   // Enable request interception
// // //   await page.setRequestInterception(true);

// // //   // Listen for form submissions
// // //   page.on('request', async request => {
// // //     if (request.method() === 'POST' && request.url().includes('register')) {
// // //       try {
// // //         const postData = request.postData();
// // //         if (postData) {
// // //           const formData = JSON.parse(postData);
          
// // //           // Create record with timestamp
// // //           const record = {
// // //             timestamp: new Date().toISOString(),
// // //             name: formData.fullName || '',
// // //             email: formData.email || '',
// // //             mobile: formData.mobile || '',
// // //             city: formData.city || '',
// // //             course: formData.course || ''
// // //           };

// // //           // Write to CSV
// // //           await csvWriter.writeRecords([record]);
// // //           console.log('Saved form submission:', record);
// // //         }
// // //       } catch (error) {
// // //         console.error('Error processing form submission:', error);
// // //       }
// // //     }
// // //     request.continue();
// // //   });

// // //   try {
// // //     console.log('Navigating to collegedunia.com...');
// // //     await page.goto('https://collegedunia.com/', {
// // //       waitUntil: 'networkidle0',
// // //       timeout: 60000
// // //     });

// // //     // Wait for and detect popup
// // //     console.log('Waiting for registration popup...');
// // //     await page.waitForSelector('input[name="fullName"]', {
// // //       timeout: 30000
// // //     });

// // //     console.log('Form monitor is now active and watching for submissions...');
    
// // //     // Keep the script running
// // //     await new Promise(() => {});

// // //   } catch (error) {
// // //     console.error('An error occurred:', error);
// // //     await browser.close();
// // //   }
// // // }

// // // // Create CSV file if it doesn't exist
// // // async function initializeCSV() {
// // //   try {
// // //     await fs.access('form_submissions.csv');
// // //     console.log('CSV file exists, continuing...');
// // //   } catch {
// // //     console.log('Creating new CSV file...');
// // //     await csvWriter.writeRecords([]);
// // //   }
// // // }

// // // // Run the monitor
// // // console.log('Starting form submission monitor...');
// // // await initializeCSV();
// // // await monitorForm();














// // // // import puppeteer from 'puppeteer';

// // // // async function crawlAndFillForm(url) {
// // // //   const browser = await puppeteer.launch();
// // // //   const page = await browser.newPage();

// // // //   try {
// // // //     await page.goto(url);

// // // //     // Wait for and click on a button that might open the registration form
// // // //     await page.waitForSelector('#register-button');
// // // //     await page.click('#register-button');

// // // //     // Wait for the form to appear
// // // //     await page.waitForSelector('#registration-form');

// // // //     // Fill out the form
// // // //     await page.type('#name', 'John Doe');
// // // //     await page.type('#email', 'johndoe@example.com');
// // // //     await page.type('#password', 'securepassword123');

// // // //     // Submit the form
// // // //     await page.click('#submit-button');

// // // //     // Wait for the confirmation or inquiry data
// // // //     await page.waitForSelector('#confirmation-message');
// // // //     const confirmationText = await page.$eval('#confirmation-message', el => el.textContent);

// // // //     console.log('Confirmation:', confirmationText);

// // // //     // Here you would typically save this data to a database

// // // //   } catch (error) {
// // // //     console.error('An error occurred:', error);
// // // //   } finally {
// // // //     await browser.close();
// // // //   }
// // // // }

// // // // // Usage
// // // // crawlAndFillForm('https://example.com');
