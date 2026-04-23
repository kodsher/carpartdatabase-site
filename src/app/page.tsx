'use client';

import { useState, useEffect } from 'react';

export interface EbayItem {
  title: string;
  price: number;
  condition: string;
  url: string;
  image: string;
  seller?: string;
  shipping?: string;
  location?: string;
}

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
  source_url?: string;
  scraped_at?: string;
  created_at: string;
  date_available?: string;
  junkyard_id?: string;
}

export interface CarSearchResult {
  success: boolean;
  searchQuery: string;
  resultCount: number;
  searchTerm: string;
  ebayUrl: string;
  titles: string[];
  titlesFetched?: number;
  totalPages?: number;
}

export default function Home() {
  const [searchType, setSearchType] = useState<'database' | 'ebay' | 'junkyard' | 'car'>('car');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<EbayItem[] | Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [vehiclesStored, setVehiclesStored] = useState(0);

  // Pagination state for junkyard inventory
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageLimit] = useState(50);

  // Car search specific state
  const [carYear, setCarYear] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPart, setCarPart] = useState('');
  const [carSearchResult, setCarSearchResult] = useState<CarSearchResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchType === 'car') {
      if (!carYear || !carMake || !carModel || !carPart) {
        setError('Please fill in all fields: Year, Make, Model, and Part');
        return;
      }

      setLoading(true);
      setError(null);
      setCarSearchResult(null);

      try {
        const params = new URLSearchParams({
          year: carYear,
          make: carMake,
          model: carModel,
          part: carPart,
        });

        const response = await fetch(`/api/car-search?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setCarSearchResult(data);
        } else {
          setError(data.error || 'Search failed');
        }
      } catch (err) {
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (searchType === 'ebay') {
      if (!query.trim()) return;

      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const response = await fetch(`/api/ebay-search?q=${encodeURIComponent(query)}&limit=20`);
        const data = await response.json();

        if (data.success) {
          setResults(data.items);
          setTotalResults(data.total);
        } else {
          setError(data.error || 'Search failed');
        }
      } catch (err) {
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (searchType === 'junkyard') {
      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const response = await fetch('/api/junkyard-scrape');
        const data = await response.json();

        if (data.success) {
          setVehiclesStored(data.vehiclesStored);
          await fetchVehicles();
        } else {
          setError(data.error || 'Scraping failed');
        }
      } catch (err) {
        setError('Failed to scrape. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Database search coming soon. Try another search option.');
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setError(null);
    setVehiclesStored(0);

    try {
      const response = await fetch('/api/junkyard-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'anonymous' }),
      });
      const data = await response.json();

      if (data.success) {
        setVehiclesStored(data.vehiclesStored);
        // Fetch vehicles after scraping
        await fetchVehicles();
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      setError('Failed to scrape. Please try again.');
    } finally {
      setScraping(false);
    }
  };

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
    if (searchType === 'junkyard') {
      setCurrentPage(1);
      fetchVehicles(1);
    }
  }, [searchType]);

  // Helper function to extract stock number from notes
  const extractStockNumber = (notes?: string): string => {
    if (!notes) return '-';
    const stockMatch = notes.match(/Stock:\s*(\S+)/i);
    return stockMatch ? stockMatch[1] : '-';
  };

  // Helper function to extract yard from notes
  const extractYard = (notes?: string): string => {
    if (!notes) return '-';
    const yardMatch = notes.match(/Location:\s*([^\,]+)/i);
    return yardMatch ? yardMatch[1].trim() : '-';
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
          <h1 className="text-xl font-bold text-white">Car Part Database</h1>
          <div className="flex gap-4">
            <button className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Login</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Sign Up</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Parts From Junkyards & eBay
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Search scraped inventory from junkyards and eBay. Save time finding the parts you need.
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-12">
          <div className="flex gap-4 mb-6 justify-center flex-wrap">
            <button
              onClick={() => setSearchType('car')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'car'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Car Search
            </button>
            <button
              onClick={() => setSearchType('ebay')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'ebay'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Search eBay
            </button>
            <button
              onClick={() => setSearchType('junkyard')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'junkyard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Junkyard Inventory
            </button>
            <button
              onClick={() => setSearchType('database')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'database'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Search Database
            </button>
          </div>

          {searchType === 'car' ? (
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Year</label>
                  <input
                    type="text"
                    value={carYear}
                    onChange={(e) => setCarYear(e.target.value)}
                    placeholder="2011"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Make</label>
                  <input
                    type="text"
                    value={carMake}
                    onChange={(e) => setCarMake(e.target.value)}
                    placeholder="Honda"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Model</label>
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    placeholder="Civic"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Part</label>
                  <input
                    type="text"
                    value={carPart}
                    onChange={(e) => setCarPart(e.target.value)}
                    placeholder="Center Console"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Search eBay'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchType === 'ebay'
                    ? 'Search eBay for parts...'
                    : 'Search our database...'
                }
                className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-center">
              {error}
            </div>
          )}

          {/* Car Search Result */}
          {searchType === 'car' && carSearchResult && (
            <div className="mt-6 p-6 bg-slate-700/50 border border-slate-600 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">Search Results</h3>
              <p className="text-3xl font-bold text-blue-400 mb-2">
                {carSearchResult.resultCount.toLocaleString()}
              </p>
              <p className="text-slate-400 mb-4">results found on eBay for:</p>
              <p className="text-white font-medium mb-4">
                "{carSearchResult.searchTerm}"
              </p>
              <a
                href={carSearchResult.ebayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-6"
              >
                View on eBay
              </a>

              {/* Listing Titles */}
              {carSearchResult.titles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-1">Listing Titles</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Showing {carSearchResult.titles.length} of {carSearchResult.resultCount} results
                    {carSearchResult.totalPages && ` (fetched ${carSearchResult.totalPages} pages)`}
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {carSearchResult.titles.map((title, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-800/50 rounded-lg text-slate-300 text-sm hover:bg-slate-700/50 transition-colors"
                      >
                        {title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-6">
              {searchType === 'ebay' ? `Found ${totalResults} results` : `Vehicles (${totalResults})`}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchType === 'ebay' ? (
                (results as EbayItem[]).map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition-colors group"
                  >
                    {item.image && (
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-2 line-clamp-2">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-green-400">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.condition === 'new' ? 'bg-green-100 text-green-800' :
                          item.condition === 'refurbished' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.condition}
                        </span>
                      </div>
                      {item.seller && (
                        <p className="text-sm text-slate-400">Seller: {item.seller}</p>
                      )}
                      {item.shipping && (
                        <p className="text-sm text-slate-400">Shipping: {item.shipping}</p>
                      )}
                      {item.location && (
                        <p className="text-sm text-slate-400">Location: {item.location}</p>
                      )}
                    </div>
                  </a>
                ))
              ) : (
                <div className="col-span-full">
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
                        {(results as Vehicle[]).map((vehicle, index) => (
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
                            <td className="p-4 text-slate-300">{extractYard(vehicle.notes)}</td>
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Grid */}
        {results.length === 0 && !carSearchResult && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Search Inventory</h3>
              <p className="text-slate-400">Search across multiple junkyards to find the parts you need.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Verified Data</h3>
              <p className="text-slate-400">Scraped directly from junkyard websites for accuracy.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast Results</h3>
              <p className="text-slate-400">Get instant results from our database of parts.</p>
            </div>
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
