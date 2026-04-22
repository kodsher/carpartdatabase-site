/**
 * Junkyard Scraper
 *
 * Scrapes vehicle data from WrenchAPart API and stores in database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface WrenchApartVehicle {
  id?: number;
  makeId?: number;
  make?: any; // Can be string or object {id, name}
  modelId?: number;
  model?: any; // Can be string or object {id, makeId, name}
  year?: number;
  vin?: string;
  stockNumber?: string;
  arrivalDate?: string;
  color?: string;
  mileage?: number;
  engine?: string;
  transmission?: string;
  driveTrain?: string;
  bodyStyle?: string;
  doors?: number;
  fuelType?: string;
  location?: string;
  price?: number;
  sold?: boolean;
  imageUrl?: string;
  partsUrl?: string;
  [key: string]: any;
}

export interface ScrapingResult {
  success: boolean;
  vehiclesStored: number;
  error?: string;
  data?: any;
}

// Helper to extract make name from API response
function extractMake(make: any): string {
  if (typeof make === 'string') return make;
  if (make && typeof make === 'object' && make.name) return make.name;
  return '';
}

// Helper to extract model name from API response
function extractModel(model: any): string {
  if (typeof model === 'string') return model;
  if (model && typeof model === 'object' && model.name) return model.name;
  return '';
}

// Helper to extract year from API response
function extractYear(year: any): number {
  const yearNum = parseInt(year);
  return isNaN(yearNum) ? 0 : yearNum;
}

export async function scrapeAndStoreWrenchApart(userId: string): Promise<ScrapingResult> {
  try {
    const response = await fetch('https://api.wrenchapart.com/v1/vehicles?makeId=0', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch WrenchAPart: ${response.status}`);
    }

    const data = await response.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let vehiclesStored = 0;

    if (Array.isArray(data)) {
      for (const vehicle of data) {
        const { error: insertError } = await supabase
          .from('junkyard_vehicles')
          .insert({
            junkyard_id: '00000000-0000-0000-0000-000000000001', // WrenchAPart junkyard ID
            make: extractMake(vehicle.make),
            model: extractModel(vehicle.model),
            year: extractYear(vehicle.year),
            vin: vehicle.vin,
            trim: vehicle.bodyStyle,
            engine: vehicle.engine,
            transmission: vehicle.transmission,
            color: vehicle.color,
            mileage: vehicle.mileage,
            notes: `Stock: ${vehicle.stockNumber || 'N/A'}, Location: ${vehicle.location || 'N/A'}`,
            source_url: vehicle.partsUrl || 'https://api.wrenchapart.com/v1/vehicles?makeId=0',
            scraped_at: new Date().toISOString(),
          });

        if (!insertError) {
          vehiclesStored++;
        }
      }
    }

    return {
      success: true,
      vehiclesStored,
      data,
    };
  } catch (error) {
    return {
      success: false,
      vehiclesStored: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getStoredVehicles(junkyardId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let query = supabase
    .from('junkyard_vehicles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (junkyardId) {
    query = query.eq('junkyard_id', junkyardId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
}
