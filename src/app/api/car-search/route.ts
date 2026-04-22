import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';

export async function GET(request: NextRequest) {
  let browser = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const part = searchParams.get('part');

    if (!year || !make || !model || !part) {
      return NextResponse.json(
        { error: 'Missing required parameters: year, make, model, part' },
        { status: 400 }
      );
    }

    // Build the search query
    const searchQuery = `${year} ${make} ${model} ${part}`.replace(/\s+/g, '+');
    const url = `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}&_sacat=0&LH_ItemCondition=3000&_ipg=200`;

    // Launch browser
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium-browser' ||
      '/usr/bin/google-chrome' ||
      '/usr/bin/chromium' ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Go to the page and wait for it to load
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait a bit for any redirects
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute all the extraction in one go to avoid context issues
    const result = await page.evaluate(async () => {
      // Helper to wait
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Function to scroll down and trigger lazy loading
      const scrollToLoadMore = async () => {
        const distance = 500;
        const maxScrolls = 40;
        let totalHeight = 0;

        for (let i = 0; i < maxScrolls; i++) {
          const scrollHeight = document.documentElement.scrollHeight;

          // Scroll down
          window.scrollBy(0, distance);
          totalHeight += distance;

          // Wait for content to load
          await wait(600);

          // Check if we've reached the bottom
          if (window.scrollY + window.innerHeight >= scrollHeight - 100) {
            break;
          }
        }

        // Scroll back to top
        window.scrollTo(0, 0);
        await wait(500);
      };

      // Scroll to load more content
      await scrollToLoadMore();

      // Get result count
      let resultCount = 0;
      const countElement = document.querySelector('.srp-controls__count-heading .BOLD');
      if (countElement) {
        const match = countElement.textContent?.match(/[\d,]+/);
        resultCount = match ? parseInt(match[0].replace(/,/g, '')) : 0;
      }

      // Get search term
      let searchTerm = '';
      const countElements = document.querySelectorAll('.srp-controls__count-heading .BOLD');
      if (countElements.length > 1) {
        searchTerm = countElements[1].textContent?.trim() || '';
      }

      // Extract all titles
      const titles: string[] = [];
      const seen = new Set<string>();

      const selectors = [
        '.s-card__title .su-styled-text',
        '.s-item__title',
        '.s-item__title span',
        '[role="heading"][aria-level="3"] span',
        '.s-card__title span',
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          const title = element.textContent?.trim() || '';
          if (title &&
              !title.includes('Opens in a new window') &&
              !title.includes('Shop on eBay') &&
              !title.includes('Shop on') &&
              title.length > 10) {
            if (!seen.has(title)) {
              seen.add(title);
              titles.push(title);
            }
          }
        });
      });

      return {
        resultCount,
        searchTerm,
        titles,
        titlesFetched: titles.length
      };
    });

    await browser.close();

    return NextResponse.json({
      success: true,
      searchQuery: `${year} ${make} ${model} ${part}`,
      resultCount: result.resultCount,
      searchTerm: result.searchTerm,
      ebayUrl: url,
      titles: result.titles,
      titlesFetched: result.titlesFetched,
    });
  } catch (error) {
    if (browser) {
      await browser.close().catch(console.error);
    }
    console.error('Car search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
