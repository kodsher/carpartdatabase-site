/**
 * eBay Scraper
 *
 * Scrapes part data from eBay search results using Cheerio
 */

import * as cheerio from 'cheerio';

export interface EbayItem {
  title: string;
  price: number;
  condition: string;
  url: string;
  image: string;
  seller?: string;
  shipping?: string;
  location?: string;
}

export interface EbaySearchResult {
  success: boolean;
  items: EbayItem[];
  total: number;
  query: string;
  error?: string;
}

export async function searchEbay(query: string, options: {
  category?: string;
  condition?: string;
  maxPrice?: number;
  minPrice?: number;
  limit?: number;
} = {}): Promise<EbaySearchResult> {
  try {
    const searchUrl = buildEbaySearchUrl(query, options);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch eBay: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const items: EbayItem[] = [];

    $('.s-item').each((_, element) => {
      const $item = $(element);

      if ($item.find('.s-item__subtitle').text().includes('SPONSORED')) {
        return;
      }

      const title = $item.find('.s-item__title').first().text().trim();
      const priceText = $item.find('.s-item__price').first().text().trim();
      const condition = $item.find('.SECONDARY_INFO').first().text().trim() ||
                       $item.find('.s-item__subtitle').first().text().trim();
      const url = $item.find('.s-item__link').first().attr('href') || '';
      const image = $item.find('.s-item__image-img').first().attr('src') ||
                    $item.find('.s-item__image-img').first().attr('data-src') || '';

      const price = parsePrice(priceText);
      const seller = $item.find('.s-item__seller-info-text').first().text().trim();
      const shipping = $item.find('.s-item__shipping').first().text().trim();
      const location = $item.find('.s-item__itemLocation').first().text().trim();

      if (!title || !price) {
        return;
      }

      items.push({
        title,
        price,
        condition: extractCondition(condition),
        url,
        image,
        seller: seller || undefined,
        shipping: shipping || undefined,
        location: location || undefined,
      });

      if (options.limit && items.length >= options.limit) {
        return false;
      }
    });

    let total = items.length;
    const countText = $('.srp-controls__count-heading').first().text().trim();
    const countMatch = countText.match(/[\d,]+/);
    if (countMatch) {
      total = parseInt(countMatch[0].replace(/,/g, ''));
    }

    return {
      success: true,
      items,
      total,
      query,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      total: 0,
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildEbaySearchUrl(query: string, options: {
  category?: string;
  condition?: string;
  maxPrice?: number;
  minPrice?: number;
}): string {
  const baseUrl = 'https://www.ebay.com/sch/i.html';

  const params = new URLSearchParams({
    _nkw: query,
    _sacat: '0',
    _sop: '12',
    _dmd: '1',
  });

  if (options.category) {
    params.set('_sacat', options.category);
  }

  if (options.condition) {
    const conditionMap: Record<string, string> = {
      new: '1000',
      used: '3000',
      refurbished: '1500',
      'seller refurbished': '2000',
      'manufacturer refurbished': '1000',
    };
    params.set('LH_ItemCondition', conditionMap[options.condition.toLowerCase()] || '0');
  }

  if (options.maxPrice) {
    params.set('_udhi', options.maxPrice.toString());
  }

  if (options.minPrice) {
    params.set('_udlo', options.minPrice.toString());
  }

  return `${baseUrl}?${params.toString()}`;
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[$,]/g, '').replace(/,/g, '').trim();
  const match = cleaned.match(/^[\d.]+/);
  if (!match) return 0;
  return parseFloat(match[0]);
}

function extractCondition(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('new') && !lower.includes('refurbished')) return 'new';
  if (lower.includes('refurbished')) return 'refurbished';
  if (lower.includes('used')) return 'used';
  if (lower.includes('for parts')) return 'for parts';

  return 'unknown';
}
