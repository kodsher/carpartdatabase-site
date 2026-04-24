import { NextRequest, NextResponse } from 'next/server';

// Playwright scraper service on Hetzner
const PLAYWRIGHT_API_URL = process.env.PLAYWRIGHT_API_URL || 'http://178.156.215.195/scrape';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, make, model, part } = body;

    if (!year || !make || !model || !part) {
      return NextResponse.json(
        { error: 'Missing required parameters: year, make, model, part' },
        { status: 400 }
      );
    }

    const jobId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Call the Playwright scraper service
    const response = await fetch(PLAYWRIGHT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year,
        make,
        model,
        part,
        jobId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Playwright scraper error:', errorText);
      throw new Error(`Scraper service error: ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to match the expected format
    const transformedItems = data.results?.map((item: any) => ({
      title: item.title,
      price: parsePrice(item.price),
      condition: item.condition || 'unknown',
      url: item.url,
      image: item.imageUrl || '',
      seller: item.seller,
      shipping: undefined,
      location: undefined,
    })) || [];

    return NextResponse.json({
      success: true,
      items: transformedItems,
      total: data.total || transformedItems.length,
      query: `${year} ${make} ${model} ${part}`,
    });
  } catch (error) {
    console.error('eBay search error:', error);
    return NextResponse.json(
      {
        success: false,
        items: [],
        total: 0,
        query: '',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET requests are not supported by the Playwright service
  return NextResponse.json(
    { error: 'Use POST method with body: { year, make, model, part }' },
    { status: 405 }
  );
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[$,]/g, '').replace(/,/g, '').trim();
  const match = cleaned.match(/^[\d.]+/);
  if (!match) return 0;
  // Convert dollars to cents
  return Math.round(parseFloat(match[0]) * 100);
}
