import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from './components/SignOutButton';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Overview</h2>
          <p className="text-gray-600">
            This is a protected admin area. Only authenticated users can access this page.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-indigo-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-indigo-900">Vehicles</h3>
              <p className="mt-2 text-3xl font-bold text-indigo-600">0</p>
              <p className="mt-1 text-sm text-indigo-500">Total vehicles in database</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-900">Junkyards</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">0</p>
              <p className="mt-1 text-sm text-green-500">Active junkyards</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-purple-900">Parts</h3>
              <p className="mt-2 text-3xl font-bold text-purple-600">0</p>
              <p className="mt-1 text-sm text-purple-500">Parts cataloged</p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                Add Vehicle
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                Add Junkyard
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Manage Parts
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                View Reports
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
