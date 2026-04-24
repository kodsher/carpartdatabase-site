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
  trim?: string;
  engine?: string;
  transmission?: string;
  color?: string;
  mileage?: number;
  notes?: string;
  yard?: string;
  source_url?: string;
  scraped_at?: string;
  created_at: string;
  date_available?: string;
  junkyard_id?: string;
}

export default function VehiclesPage() {
  const [results, setResults] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debug logging
  console.log('Vehicles page mounted, fetchVehicles will be called');
  const [searchTerm, setSearchTerm] = useState('');
  const [yardFilter, setYardFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageLimit = 100;

  // Auth state
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const fetchVehicles = async (page: number = 1) => {
    console.log('fetchVehicles called with page:', page);
    setLoading(true);
    try {
      const response = await fetch(`/api/junkyard-scrape?page=${page}&limit=${pageLimit}`);
      console.log('fetch response status:', response.status);
      const data = await response.json();
      console.log('fetch response data:', data);

      if (data.success) {
        setAllVehicles(data.vehicles);
        setResults(data.vehicles);
        setTotalResults(data.total);
        setTotalPages(data.totalPages);
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

  useEffect(() => {
    fetchVehicles(1);
  }, []);

  // Get unique yards from all vehicles
  const uniqueYards = Array.from(new Set(allVehicles.map(v => v.yard).filter(Boolean))).sort();

  // Apply filters and sorting to display
  useEffect(() => {
    let filtered = [...results]; // Work on current page results only

    // Apply yard filter
    if (yardFilter) {
      filtered = filtered.filter(v => v.yard === yardFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle => {
        const searchFields = [
          vehicle.year.toString(),
          vehicle.make || '',
          vehicle.model || '',
          vehicle.vin || '',
          extractStockNumber(vehicle.notes),
          vehicle.yard || '',
        ].join(' ').toLowerCase();
        return searchFields.includes(term);
      });
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        switch (sortColumn) {
          case 'year':
            aVal = a.year;
            bVal = b.year;
            break;
          case 'make':
            aVal = a.make?.toLowerCase() || '';
            bVal = b.make?.toLowerCase() || '';
            break;
          case 'model':
            aVal = a.model?.toLowerCase() || '';
            bVal = b.model?.toLowerCase() || '';
            break;
          case 'vin':
            aVal = a.vin?.toLowerCase() || '';
            bVal = b.vin?.toLowerCase() || '';
            break;
          case 'stock':
            aVal = extractStockNumber(a.notes);
            bVal = extractStockNumber(b.notes);
            break;
          case 'date':
            aVal = a.date_available || '';
            bVal = b.date_available || '';
            break;
          case 'yard':
            aVal = a.yard?.toLowerCase() || '';
            bVal = b.yard?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    setResults(filtered);
    setTotalResults(filtered.length);
  }, [results, currentPage]);

  // Handle sorting
  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle yard filter
  const handleYardFilter = (yard: string) => {
    setYardFilter(yard === 'All' ? '' : yard);
  };

  // Helper function to extract stock number from notes
  const extractStockNumber = (notes?: string): string => {
    if (!notes) return '-';
    const stockMatch = notes.match(/Stock:\s*(\S+)/i);
    return stockMatch ? stockMatch[1] : '-';
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
          Vehicles {loading ? '(Loading...)' : `(${totalResults})`}
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
                    onClick={() => fetchVehicles(currentPage - 1)}
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
                        onClick={() => fetchVehicles(pageNum)}
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
                    onClick={() => fetchVehicles(currentPage + 1)}
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
