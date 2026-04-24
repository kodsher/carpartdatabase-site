'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

interface HeaderProps {
  showVehiclesLink?: boolean;
  onAuthClick?: (mode: 'signin' | 'signup') => void;
}

export default function Header({ showVehiclesLink = false, onAuthClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
            Car Part Database
          </Link>
          {showVehiclesLink && (
            <Link href="/vehicles" className="text-slate-300 hover:text-white transition-colors">
              Vehicles
            </Link>
          )}
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
              {onAuthClick ? (
                <>
                  <button
                    onClick={() => onAuthClick('signin')}
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => onAuthClick('signup')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
