'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import Header from '@/components/layout/Header';

export interface InventoryVehicle {
  id: string;
  inventoryId: string;
  vehicleId: string;
  notes?: string | null;
  addedAt: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    yard?: string;
    date_available?: string;
    notes?: string;
  };
}

export default function InventoryPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [inventory, setInventory] = useState<InventoryVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  // Fetch inventory
  const fetchInventory = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user-inventory', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchInventory();
    }
  }, [session]);

  // Add vehicle to inventory (called from vehicles page)
  const addToInventory = async (vehicleId: string) => {
    if (!session) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

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
        await fetchInventory();
        return true;
      } else {
        alert(data.error || 'Failed to add to inventory');
        return false;
      }
    } catch (err) {
      console.error('Failed to add to inventory:', err);
      alert('Failed to add to inventory');
      return false;
    }
  };

  // Remove vehicle from inventory
  const removeFromInventory = async (inventoryId: string) => {
    if (!confirm('Are you sure you want to remove this vehicle from your inventory?')) {
      return;
    }

    if (!session) return;

    try {
      const response = await fetch(`/api/user-inventory/${inventoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setInventory(prev => prev.filter(item => item.inventoryId !== inventoryId));
      } else {
        alert(data.error || 'Failed to remove from inventory');
      }
    } catch (err) {
      console.error('Failed to remove from inventory:', err);
      alert('Failed to remove from inventory');
    }
  };

  // Update notes
  const updateNotes = async (inventoryId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/user-inventory/${inventoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ notes: notesValue }),
      });

      const data = await response.json();

      if (data.success) {
        setInventory(prev =>
          prev.map(item =>
            item.inventoryId === inventoryId
              ? { ...item, notes: notesValue || null }
              : item
          )
        );
        setEditingNotes(null);
        setNotesValue('');
      } else {
        alert(data.error || 'Failed to update notes');
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
      alert('Failed to update notes');
    }
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

  // Helper function to format added date
  const formatAddedDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper function to extract stock number from notes
  const extractStockNumber = (notes?: string): string => {
    if (!notes) return '-';
    const stockMatch = notes.match(/Stock:\s*(\S+)/i);
    return stockMatch ? stockMatch[1] : '-';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            My Inventory {user && !loading && `(${inventory.length} vehicles)`}
          </h2>
        </div>

        {!user ? (
          <div className="text-center py-16">
            <p className="text-slate-400 mb-4">Sign in to view and manage your inventory.</p>
            <button
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <p className="text-slate-400">Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 mb-4">Your inventory is empty.</p>
            <p className="text-slate-500 text-sm">
              Browse the <a href="/vehicles" className="text-blue-400 hover:underline">vehicles page</a> to add vehicles to your inventory.
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Year</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Make</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Model</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Yard</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Available</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">VIN</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Stock #</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Added</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Notes</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, index) => (
                  <tr
                    key={item.inventoryId}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      index % 2 === 0 ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <td className="p-4 text-white">{item.vehicle.year}</td>
                    <td className="p-4 text-white">{item.vehicle.make}</td>
                    <td className="p-4 text-white">{item.vehicle.model}</td>
                    <td className="p-4 text-slate-300">{item.vehicle.yard || '-'}</td>
                    <td className="p-4 text-slate-400">{formatDate(item.vehicle.date_available)}</td>
                    <td className="p-4 text-slate-400 font-mono text-sm">{item.vehicle.vin || '-'}</td>
                    <td className="p-4 text-white font-mono">{extractStockNumber(item.vehicle.notes)}</td>
                    <td className="p-4 text-slate-500 text-sm">{formatAddedDate(item.addedAt)}</td>
                    <td className="p-4">
                      {editingNotes === item.inventoryId ? (
                        <input
                          type="text"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          onBlur={() => updateNotes(item.inventoryId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateNotes(item.inventoryId);
                            if (e.key === 'Escape') {
                              setEditingNotes(null);
                              setNotesValue('');
                            }
                          }}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNotes(item.inventoryId);
                            setNotesValue(item.notes || '');
                          }}
                          className="text-slate-400 hover:text-white text-sm hover:underline"
                        >
                          {item.notes || 'Add note...'}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => removeFromInventory(item.inventoryId)}
                        className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-700/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>© 2025 Car Part Database. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
