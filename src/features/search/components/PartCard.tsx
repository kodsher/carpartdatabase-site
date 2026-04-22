/**
 * PartCard Component
 *
 * Displays a single part in search results
 */

import { Part } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PartCardProps {
  part: Part;
  onClick?: () => void;
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function PartCard({ part, onClick }: PartCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{part.name}</h3>
            {part.brand && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {part.brand}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Part #: {part.part_number}
            {part.oem_number && ` • OEM: ${part.oem_number}`}
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              part.condition === 'new' ? 'bg-green-100 text-green-800' :
              part.condition === 'used' ? 'bg-yellow-100 text-yellow-800' :
              part.condition === 'refurbished' ? 'bg-blue-100 text-blue-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {part.condition}
            </span>
            <span className="text-gray-600">{formatCategory(part.category)}</span>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(part.price)}</p>
          <p className={`text-sm ${part.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {part.stock > 0 ? `${part.stock} in stock` : 'Out of stock'}
          </p>
        </div>
      </div>
    </button>
  );
}
