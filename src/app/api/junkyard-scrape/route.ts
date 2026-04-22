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

    const vehicles = await getStoredVehicles(junkyardId);

    return NextResponse.json({
      success: true,
      vehicles,
      total: vehicles?.length || 0,
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json(
      {
        success: false,
        vehicles: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
