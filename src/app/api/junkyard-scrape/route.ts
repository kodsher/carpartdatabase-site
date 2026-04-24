import { NextRequest, NextResponse } from 'next/server';
import { scrapeAndStoreWrenchApart, getStoredVehicles } from '@/features/scraping/services/junkyardScraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || 'anonymous';

    const result = await scrapeAndStoreWrenchApart(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Junkyard scrape error:', error);
    return NextResponse.json(
      {
        success: false,
        vehiclesStored: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const junkyardId = searchParams.get('junkyardId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc';
    const searchTerm = searchParams.get('search') || undefined;
    const yardFilter = searchParams.get('yard') || undefined;

    const result = await getStoredVehicles(junkyardId, page, limit, sortBy, sortDirection, searchTerm, yardFilter);

    return NextResponse.json({
      success: true,
      vehicles: result.vehicles,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json(
      {
        success: false,
        vehicles: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
