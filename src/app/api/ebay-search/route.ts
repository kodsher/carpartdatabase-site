import { NextRequest, NextResponse } from 'next/server';
import { searchEbay } from '@/features/scraping/services/ebayScraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const options = {
      category: searchParams.get('category') || undefined,
      condition: searchParams.get('condition') || undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const result = await searchEbay(query, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('eBay search error:', error);
    return NextResponse.json(
      {
        success: false,
        items: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
