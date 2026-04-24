'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';

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

export default function Home() {
  const [results, setResults] = useState<Vehicle[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageLimit] = useState(50);

  // Auth state
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const fetchVehicles = async (page: number = currentPage) => {
    try {
      const response = await fetch(`/api/junkyard-scrape?page=${page}&limit=${pageLimit}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.vehicles);
        setTotalResults(data.total);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  };

  useEffect(() => {
    fetchVehicles(1);
  }, []);

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
      <header className="border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">Car Part Database</h1>
            <span className="text-slate-400">Vehicles</span>
          </div>
          <div className="flex gap-4">
            {user ? (
              <>
                <span className="px-4 py-2 text-slate-300">{user.email}</span>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Vehicles ({totalResults})</h2>

        {results.length > 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Year</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Make</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Model</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">VIN</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Stock #</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Available Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Yard</th>
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
                    <td className="p-4 text-slate-400">{vehicle.vin || '-'}</td>
                    <td className="p-4 text-white font-mono">{extractStockNumber(vehicle.notes)}</td>
                    <td className="p-4 text-slate-400">{formatDate(vehicle.date_available)}</td>
                    <td className="p-4 text-slate-300">{vehicle.yard || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-600">
                <div className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * pageLimit + 1} to{' '}
                  {Math.min(currentPage * pageLimit, totalResults)} of {totalResults} vehicles
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
            <p className="text-slate-400">No vehicles found in inventory.</p>
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
