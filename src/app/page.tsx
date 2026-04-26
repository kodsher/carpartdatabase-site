'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import Header from '@/components/layout/Header';
import { supabase, TABLES } from '@/lib/supabase/client';

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

interface PartSearch {
  year: string;
  make: string;
  model: string;
  part: string;
}

export interface Job {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  num_results?: number | null;
  expected_results?: number | null;
  volume?: number | null;
  sell_through_rate?: number | null;
}

export default function Home() {
  const [searchType, setSearchType] = useState<'junkyard' | 'car'>('car');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carSearchResult, setCarSearchResult] = useState<any>(null);

  // Car search specific state
  const [carYear, setCarYear] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPart, setCarPart] = useState('');

  // Jobs state
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Current search tracking state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<'pending' | 'running' | 'processing' | 'completed' | 'error' | null>(null);
  const [currentJobResults, setCurrentJobResults] = useState<{ results?: number; volume?: number; sellThrough?: number } | null>(null);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  // Auth state
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

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

      // Reset current search tracking
      setCurrentJobId(null);
      setCurrentJobStatus(null);
      setCurrentJobResults(null);
      setSearchStartTime(null);

      try {
        const scraperPath = process.env.NEXT_PUBLIC_SCRAPER_PATH || '/Users/admin/Desktop/puppeteer/ebay-scraper-csv.js';
        const command = `node ${scraperPath} ${carYear} ${carMake} ${carModel} "${carPart}"`;

        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command }),
        });

        const data = await response.json();

        if (data.success) {
          const jobId = data.job.id;
          setCurrentJobId(jobId);
          setCurrentJobStatus('pending');
          setSearchStartTime(Date.now());

          setCarSearchResult({
            success: true,
            searchQuery: `${carYear} ${carMake} ${carModel} ${carPart}`,
            resultCount: 0,
            searchTerm: `${carYear} ${carMake} ${carModel} ${carPart}`,
            ebayUrl: `https://www.ebay.com/sch/i.html?_nkw=${carYear}+${carMake}+${carModel}+${carPart.replace(/ /g, '+')}`,
            titles: [],
          });
          await fetchRecentJobs();
        } else {
          setError(data.error || 'Failed to create job');
        }
      } catch (err) {
        setError('Failed to create job. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const extractPartInfo = (command: string): PartSearch | null => {
    // Try to match pattern: node /path/to/scraper YEAR MAKE MODEL "PART"
    const match = command.match(/node\s+\S+\s+(\d{4})\s+(\w+)\s+(\w+)\s+"([^"]+)"/);
    if (match) {
      return {
        year: match[1],
        make: match[2],
        model: match[3],
        part: match[4]
      };
    }
    return null;
  };

  const fetchRecentJobs = async () => {
    setLoadingJobs(true);
    try {
      const response = await fetch('/api/jobs?limit=10');
      const data = await response.json();
      if (data.success) {
        setRecentJobs(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchRecentJobs();

    // Set up Realtime subscriptions
    const subscriptions: any[] = [];

    // Subscribe to jobs table changes (status updates)
    const jobsChannel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'jobs',
        },
        async (payload: any) => {
          console.log('Jobs change detected:', payload);
          await fetchRecentJobs();

          // Check if this is our current job and update status
          if (payload.eventType === 'UPDATE' && currentJobId && payload.new.id === currentJobId) {
            const job = payload.new;
            setCurrentJobStatus(job.status);
            if (job.status === 'completed') {
              // Fetch updated jobs to get results
              await fetchRecentJobs();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Jobs subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to jobs table');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to jobs table');
        }
      });

    subscriptions.push(jobsChannel);

    // Subscribe to PartInfo table changes (results updates)
    const partInfoChannel = supabase
      .channel('partinfo-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // New results available
          schema: 'public',
          table: 'PartInfo',
        },
        async (payload: any) => {
          console.log('PartInfo change detected:', payload);
          await fetchRecentJobs();

          // Check if this PartInfo matches our current job
          if (currentJobId && carSearchResult && payload.new) {
            const searchTerm = extractPartInfo(carSearchResult.searchTerm);
            if (searchTerm && payload.new.name) {
              if (payload.new.name.toLowerCase().includes(`${searchTerm.year} ${searchTerm.make} ${searchTerm.model}`.toLowerCase())) {
                setCurrentJobResults({
                  results: payload.new.num_results,
                  volume: payload.new.volume,
                  sellThrough: payload.new.sell_through_rate,
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('PartInfo subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to PartInfo table');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to PartInfo table');
        }
      });

    subscriptions.push(partInfoChannel);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [currentJobId, carSearchResult]);

  // Sync current job results when recentJobs updates
  useEffect(() => {
    if (currentJobId && currentJobStatus === 'completed') {
      const currentJob = recentJobs.find(job => job.id === currentJobId);
      if (currentJob && currentJob.num_results !== undefined) {
        setCurrentJobResults({
          results: currentJob.num_results ?? undefined,
          volume: currentJob.volume ?? undefined,
          sellThrough: currentJob.sell_through_rate ?? undefined,
        });
      }
    }
  }, [recentJobs, currentJobId, currentJobStatus]);

  // Poll for current job status and update progress based on time elapsed
  useEffect(() => {
    if (!currentJobId || !searchStartTime || currentJobStatus === 'completed') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs`);
        const data = await response.json();

        if (data.success && data.jobs) {
          const currentJob = data.jobs.find((job: Job) => job.id === currentJobId);
          if (currentJob) {
            // Only update status if it changes, and don't override 'completed'
            if (currentJob.status === 'completed') {
              setCurrentJobStatus('completed');
            } else if (currentJob.status === 'running' && currentJobStatus !== 'processing') {
              setCurrentJobStatus('running');
            } else if (currentJob.status === 'running' || currentJob.status === 'pending') {
              const elapsed = Date.now() - searchStartTime;
              // After 10 seconds of running, show "processing" stage
              if (elapsed > 10000 && currentJobStatus !== 'processing') {
                setCurrentJobStatus('processing');
              }
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentJobId, searchStartTime, currentJobStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header onAuthClick={setAuthMode} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

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
              Part Search
            </button>
          </div>

          {searchType === 'car' && (
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
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-center">
              {error}
            </div>
          )}

          {/* Car Search Result */}
          {searchType === 'car' && carSearchResult && (
            <div className="mt-6 p-6 bg-slate-700/50 border border-slate-600 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">
                {currentJobStatus === 'completed' ? 'Search Complete' : 'Search In Progress'}
              </h3>
              <p className="text-slate-400 mb-4">
                {currentJobStatus === 'pending' && 'Your search is being queued...'}
                {currentJobStatus === 'running' && 'Initializing eBay scraper...'}
                {currentJobStatus === 'processing' && 'Scraping listings and analyzing data...'}
                {currentJobStatus === 'completed' && `Found ${currentJobResults?.results || '0'} results!`}
                {!currentJobStatus && 'Your search has been queued:'}
              </p>
              <p className="text-white font-medium mb-4">
                "{carSearchResult.searchTerm}"
              </p>

              {/* Progress Bar */}
              {currentJobStatus && (
                <div className="mb-4">
                  <div className="w-full bg-slate-600 rounded-full h-3 mb-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ease-out ${
                        currentJobStatus === 'pending'
                          ? 'bg-yellow-500 w-1/5'
                          : currentJobStatus === 'running'
                          ? 'bg-blue-500 w-2/5'
                          : currentJobStatus === 'processing'
                          ? 'bg-purple-500 w-4/5'
                          : currentJobStatus === 'completed'
                          ? 'bg-green-500 w-full'
                          : 'bg-red-500 w-full'
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400 mb-1">
                    <span className="flex items-center gap-2">
                      {currentJobStatus === 'pending' && <span>⏳ Queued</span>}
                      {currentJobStatus === 'running' && <span>🚀 Starting</span>}
                      {currentJobStatus === 'processing' && <span>🔍 Scraping</span>}
                      {currentJobStatus === 'completed' && <span>✅ Complete</span>}
                      {currentJobStatus === 'error' && <span>❌ Error</span>}
                    </span>
                    <span>
                      {currentJobStatus === 'pending' && 'Waiting to start...'}
                      {currentJobStatus === 'running' && 'Initializing...'}
                      {currentJobStatus === 'processing' && 'Fetching listings...'}
                      {currentJobStatus === 'completed' && 'Done!'}
                    </span>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex items-center justify-between mt-4 text-xs">
                    <div className={`flex flex-col items-center ${currentJobStatus === 'pending' || ['running', 'processing', 'completed'].includes(currentJobStatus!) ? 'text-white' : 'text-slate-500'}`}>
                      <div className={`w-3 h-3 rounded-full mb-1 ${['pending', 'running', 'processing', 'completed'].includes(currentJobStatus!) ? 'bg-yellow-500' : 'bg-slate-600'}`}></div>
                      <span>Queue</span>
                    </div>
                    <div className={`flex flex-col items-center ${['running', 'processing', 'completed'].includes(currentJobStatus!) ? 'text-white' : 'text-slate-500'}`}>
                      <div className={`w-3 h-3 rounded-full mb-1 ${['running', 'processing', 'completed'].includes(currentJobStatus!) ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
                      <span>Start</span>
                    </div>
                    <div className={`flex flex-col items-center ${['processing', 'completed'].includes(currentJobStatus!) ? 'text-white' : 'text-slate-500'}`}>
                      <div className={`w-3 h-3 rounded-full mb-1 ${['processing', 'completed'].includes(currentJobStatus!) ? 'bg-purple-500' : 'bg-slate-600'}`}></div>
                      <span>Scrape</span>
                    </div>
                    <div className={`flex flex-col items-center ${currentJobStatus === 'completed' ? 'text-white' : 'text-slate-500'}`}>
                      <div className={`w-3 h-3 rounded-full mb-1 ${currentJobStatus === 'completed' ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                      <span>Done</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Summary */}
              {currentJobStatus === 'completed' && currentJobResults && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-600/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {currentJobResults.results?.toLocaleString() || '-'}
                    </div>
                    <div className="text-xs text-slate-400">Results</div>
                  </div>
                  <div className="bg-slate-600/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {currentJobResults.volume?.toLocaleString() || '-'}
                    </div>
                    <div className="text-xs text-slate-400">Volume</div>
                  </div>
                  <div className="bg-slate-600/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {currentJobResults.sellThrough ? `${currentJobResults.sellThrough.toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-xs text-slate-400">Sell Through</div>
                  </div>
                </div>
              )}

              <a
                href={carSearchResult.ebayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View on eBay
              </a>
            </div>
          )}
        </div>

        {/* Recent Searches Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
            <button
              onClick={fetchRecentJobs}
              disabled={loadingJobs}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loadingJobs ? (
            <div className="text-center py-8 text-slate-400">Loading recent searches...</div>
          ) : recentJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Year</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Make</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Model</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Part</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Results</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Volume</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Sell Through</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-300">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => {
                    const partInfo = extractPartInfo(job.command);
                    return (
                      <tr
                        key={job.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="p-3 text-white">{partInfo?.year || '-'}</td>
                        <td className="p-3 text-white">{partInfo?.make || '-'}</td>
                        <td className="p-3 text-white">{partInfo?.model || '-'}</td>
                        <td className="p-3 text-white">{partInfo?.part || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            job.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {job.status === 'completed' && job.num_results !== null && job.num_results !== undefined ? (
                            <span className="text-white font-medium">{job.num_results}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {job.status === 'completed' && job.volume !== null && job.volume !== undefined ? (
                            <span className="text-white">{job.volume.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {job.status === 'completed' && job.sell_through_rate !== null && job.sell_through_rate !== undefined ? (
                            <span className="text-white">{job.sell_through_rate.toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-sm">{formatDate(job.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No recent searches found</div>
          )}
        </div>

        {/* Features Grid */}
        {!carSearchResult && (
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
