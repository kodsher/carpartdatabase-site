'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import Header from '@/components/layout/Header';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  notes?: string;
  yard?: string;
  source_url?: string;
  created_at: string;
  date_available?: string;
  junkyard_id?: string;
}

export default function VehiclesPage() {
  const [results, setResults] = useState<Vehicle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debug logging
  console.log('Vehicles page mounted, fetchVehicles will be called');
  const [searchTerm, setSearchTerm] = useState('');
  const [yardFilter, setYardFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [uniqueYards, setUniqueYards] = useState<string[]>([]);
  const pageLimit = 100;

  // Inventory state - track which vehicle IDs are in user's inventory
  const [inventoryVehicleIds, setInventoryVehicleIds] = useState<Set<string>>(new Set());
  const [addingToInventory, setAddingToInventory] = useState<Set<string>>(new Set());

  // Auth state
  const { user, session, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const fetchVehicles = async (page: number = 1) => {
    console.log('fetchVehicles called with page:', page);
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageLimit.toString(),
      });

      if (sortColumn) {
        params.append('sortBy', sortColumn);
        params.append('sortDirection', sortDirection);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (yardFilter && yardFilter !== 'All') {
        params.append('yard', yardFilter);
      }

      const response = await fetch(`/api/junkyard-scrape?${params.toString()}`);
      console.log('fetch response status:', response.status);
      const data = await response.json();
      console.log('fetch response data:', data);

      if (data.success) {
        setResults(data.vehicles);
        setTotalPages(data.totalPages);
        setTotalResults(data.total);
        setCurrentPage(data.page);
        console.log('State updated with vehicles:', data.vehicles.length);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
      console.log('fetchVehicles completed, loading set to false');
    }
  };

  // Fetch unique yards for the dropdown
  const fetchUniqueYards = async () => {
    try {
      const response = await fetch('/api/junkyard-scrape?page=1&limit=10000');
      const data = await response.json();
      if (data.success && data.vehicles) {
        const yards = Array.from(new Set(data.vehicles.map((v: Vehicle) => v.yard).filter(Boolean))) as string[];
        setUniqueYards(yards.sort());
      }
    } catch (err) {
      console.error('Failed to fetch unique yards:', err);
    }
  };

  // Fetch user's inventory vehicle IDs
  const fetchInventoryIds = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/user-inventory', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        const ids = new Set(data.inventory.map((item: any) => item.vehicleId)) as Set<string>;
        setInventoryVehicleIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  useEffect(() => {
    fetchVehicles(1);
    fetchUniqueYards();
    if (session) {
      fetchInventoryIds();
    }
  }, [session]);

  // Refetch when sort, search, or yard filter changes
  useEffect(() => {
    setCurrentPage(1);
    fetchVehicles(1);
  }, [sortColumn, sortDirection, searchTerm, yardFilter]);

  // Add vehicle to inventory
  const addToInventory = async (vehicleId: string) => {
    if (!user) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    if (!session) return;

    setAddingToInventory(prev => new Set(prev).add(vehicleId));

    try {
      const response = await fetch('/api/user-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ vehicleId }),
      });

      const data = await response.json();

      if (data.success) {
        setInventoryVehicleIds(prev => new Set(prev).add(vehicleId));
      } else {
        alert(data.error || 'Failed to add to inventory');
      }
    } catch (err) {
      console.error('Failed to add to inventory:', err);
      alert('Failed to add to inventory');
    } finally {
      setAddingToInventory(prev => {
        const newSet = new Set(prev);
        newSet.delete(vehicleId);
        return newSet;
      });
    }
  };

  // Remove vehicle from inventory
  const removeFromInventory = async (vehicleId: string) => {
    if (!session) return;

    if (!confirm('Remove this vehicle from your inventory?')) {
      return;
    }

    // Find the inventory item ID for this vehicle
    try {
      const response = await fetch('/api/user-inventory', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        const item = data.inventory.find((i: any) => i.vehicleId === vehicleId);
        if (item) {
          const deleteResponse = await fetch(`/api/user-inventory/${item.inventoryId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (deleteResponse.ok) {
            setInventoryVehicleIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(vehicleId);
              return newSet;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to remove from inventory:', err);
      alert('Failed to remove from inventory');
    }
  };

  // Helper function to extract stock number from notes
  const extractStockNumber = (notes?: string): string => {
    if (!notes) return '-';
    const stockMatch = notes.match(/Stock:\s*(\S+)/i);
    return stockMatch ? stockMatch[1] : '-';
  };

  // Handle sorting
  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  // Handle search (debounced)
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle yard filter
  const handleYardFilter = (yard: string) => {
    setYardFilter(yard === 'All' ? '' : yard);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchVehicles(page);
  };

  // Helper function to format available date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          Vehicles {loading ? '(Loading...)' : `(${totalResults} total)`}
        </h2>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search vehicles by year, make, model, VIN, or stock #..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={yardFilter || 'All'}
            onChange={(e) => handleYardFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Yards</option>
            {uniqueYards.map(yard => (
              <option key={yard} value={yard}>{yard}</option>
            ))}
          </select>
        </div>

        {results.length > 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('year')}
                  >
                    Year {sortColumn === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('make')}
                  >
                    Make {sortColumn === 'make' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('model')}
                  >
                    Model {sortColumn === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('date')}
                  >
                    Available Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('yard')}
                  >
                    Yard {sortColumn === 'yard' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('vin')}
                  >
                    VIN {sortColumn === 'vin' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('stock')}
                  >
                    Stock # {sortColumn === 'stock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  {user && (
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">
                      Inventory
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((vehicle, index) => (
                  <tr
                    key={vehicle.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      index % 2 === 0 ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <td className="p-4 text-white">{vehicle.year}</td>
                    <td className="p-4 text-white">{vehicle.make}</td>
                    <td className="p-4 text-white">{vehicle.model}</td>
                    <td className="p-4 text-slate-400">{formatDate(vehicle.date_available)}</td>
                    <td className="p-4 text-slate-300">{vehicle.yard || '-'}</td>
                    <td className="p-4 text-slate-400">{vehicle.vin || '-'}</td>
                    <td className="p-4 text-white font-mono">{extractStockNumber(vehicle.notes)}</td>
                    {user && (
                      <td className="p-4">
                        {inventoryVehicleIds.has(vehicle.id) ? (
                          <button
                            onClick={() => removeFromInventory(vehicle.id)}
                            className="px-3 py-1.5 text-sm bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                          >
                            ✓ Added
                          </button>
                        ) : (
                          <button
                            onClick={() => addToInventory(vehicle.id)}
                            disabled={addingToInventory.has(vehicle.id)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {addingToInventory.has(vehicle.id) ? 'Adding...' : 'Add +'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-600">
                <div className="text-sm text-slate-400">
                  Showing {results.length > 0 ? `${results.length} of ${totalResults}` : '0'} vehicles
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            {loading ? (
              <p className="text-slate-400">Loading vehicles...</p>
            ) : (
              <p className="text-slate-400">No vehicles found in inventory.</p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>© 2025 Car Part Database. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
