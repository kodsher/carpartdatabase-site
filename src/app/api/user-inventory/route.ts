import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// GET - Fetch user's inventory with full vehicle details
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token and get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Fetching inventory for user:', user.id);

    // First, try to fetch just the inventory items (without join)
    const { data: inventory, error } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Inventory fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Inventory items:', inventory);

    // Now fetch vehicles separately
    const vehicleIds = inventory?.map(item => item.vehicle_id) || [];
    let vehiclesMap: Record<string, any> = {};

    if (vehicleIds.length > 0) {
      const { data: vehicles, error: vehicleError } = await supabase
        .from('junkyard_vehicles')
        .select('id, make, model, year, vin, notes, yard, date_available')
        .in('id', vehicleIds);

      if (vehicleError) {
        console.error('Vehicles fetch error:', vehicleError);
      } else {
        vehiclesMap = (vehicles || []).reduce((acc, v) => {
          acc[v.id] = v;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    return NextResponse.json({
      success: true,
      inventory: inventory?.map(item => ({
        id: item.id,
        inventoryId: item.id,
        vehicleId: item.vehicle_id,
        notes: item.notes,
        addedAt: item.added_at,
        vehicle: vehiclesMap[item.vehicle_id] || null,
      })) || [],
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a vehicle to user's inventory
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token and get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, notes } = body;

    console.log('Adding vehicle to inventory:', { userId: user.id, vehicleId, notes });

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Verify the vehicle exists
    const { data: vehicle, error: vehicleError } = await supabase
      .from('junkyard_vehicles')
      .select('id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('Vehicle not found:', vehicleError);
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Add to inventory
    const { data: inventoryItem, error: insertError } = await supabase
      .from('user_inventory')
      .insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        notes: notes || null,
      })
      .select('id, notes, added_at, vehicle_id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Check if it's a unique constraint violation (already in inventory)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Vehicle already in inventory' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Fetch the vehicle details
    const { data: vehicleData } = await supabase
      .from('junkyard_vehicles')
      .select('id, make, model, year, vin, notes, yard, date_available')
      .eq('id', vehicleId)
      .single();

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: inventoryItem.id,
        inventoryId: inventoryItem.id,
        vehicleId: inventoryItem.vehicle_id,
        notes: inventoryItem.notes,
        addedAt: inventoryItem.added_at,
        vehicle: vehicleData,
      },
    });
  } catch (error) {
    console.error('Add to inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
