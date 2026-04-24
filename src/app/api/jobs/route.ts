import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy creation of Supabase client to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    console.log('[JOBS API] Received request with command:', command);

    if (!command) {
      return NextResponse.json(
        { error: 'Missing required field: command' },
        { status: 400 }
      );
    }

    // Insert the job into Supabase
    const supabase = getSupabaseClient();
    console.log('[JOBS API] Inserting job with command:', command);

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        command,
        status: 'pending'
      })
      .select()
      .single();

    console.log('[JOBS API] Insert result:', error || 'Success', data?.id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create job', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: data
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Function to extract search term from command
// Command format: node /path/to/scraper YEAR MAKE MODEL "PART"
function extractSearchTerm(command: string): string | null {
  const match = command.match(/node\s+\S+\s+(\d{4})\s+(\w+)\s+(\w+)\s+"([^"]+)"/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return null;
}

// GET endpoint to list recent jobs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = getSupabaseClient();

    // Fetch jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.error('Supabase error:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: jobsError.message },
        { status: 500 }
      );
    }

    // Fetch all PartInfo records to match against jobs
    const { data: partInfoData, error: partInfoError } = await supabase
      .from('PartInfo')
      .select('name, num_results, expected_results, volume, sell_through_rate, created_at')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Fetch more to allow for matching

    if (partInfoError) {
      console.error('PartInfo fetch error:', partInfoError);
      // Continue without PartInfo data
    }

    // Create a map of search term to PartInfo data
    const partInfoMap = new Map<string, { num_results: number; expected_results?: number | null; volume?: number | null; sell_through_rate?: number | null }>();
    if (partInfoData) {
      for (const part of partInfoData) {
        if (part.name) {
          partInfoMap.set(part.name.trim().toLowerCase(), {
            num_results: part.num_results,
            expected_results: part.expected_results,
            volume: part.volume,
            sell_through_rate: part.sell_through_rate,
          });
        }
      }
    }

    // Match jobs with PartInfo data
    const jobsWithResults = jobs.map(job => {
      const searchTerm = extractSearchTerm(job.command);
      const partInfo = searchTerm ? partInfoMap.get(searchTerm.toLowerCase()) : null;
      return {
        ...job,
        num_results: partInfo?.num_results,
        expected_results: partInfo?.expected_results,
        volume: partInfo?.volume,
        sell_through_rate: partInfo?.sell_through_rate,
      };
    });

    return NextResponse.json({
      success: true,
      jobs: jobsWithResults
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
