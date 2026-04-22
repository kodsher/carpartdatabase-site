/**
 * Shared TypeScript Types for Car Part Database
 *
 * This file contains all shared type definitions.
 * Feature-specific types should be defined in their respective modules.
 */

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = 'admin' | 'user' | 'guest';
export type OAuthProvider = 'google' | 'github' | 'microsoft';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  oauth_provider?: OAuthProvider;
  oauth_provider_id?: string;
  tokens: number;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

// ============================================================================
// PART TYPES
// ============================================================================

export type PartCondition = 'new' | 'used' | 'refurbished' | 'oem';
export type PartCategory = 'engine' | 'transmission' | 'brakes' | 'suspension' | 'electrical' | 'body' | 'interior' | 'other';

export interface Part {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  category: PartCategory;
  condition: PartCondition;
  price: number;
  stock: number;
  brand?: string;
  oem_number?: string;
  images: string[];
  compatibility: Compatibility[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VEHICLE TYPES
// ============================================================================

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
}

export interface Compatibility {
  make: string;
  model: string;
  year_start: number;
  year_end?: number; // undefined means current year
  notes?: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchFilters {
  query?: string;
  category?: PartCategory;
  condition?: PartCondition;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  junkyard_id?: string;
}

export interface SearchResult {
  parts: Part[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// JUNKYARD TYPES
// ============================================================================

export interface Junkyard {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  scrap_url?: string; // URL for scraping inventory
  ebay_search_query?: string; // For eBay search integration
  created_by: string; // user_id
  created_at: string;
  updated_at: string;
}

export interface JunkyardVehicle {
  id: string;
  junkyard_id: string;
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
  source_url?: string; // Where this data was scraped from
  scraped_at?: string;
  created_at: string;
  updated_at: string;
}

export type VehiclePartSource = 'junkyard' | 'ebay' | 'analysis';

export interface VehiclePart {
  id: string;
  junkyard_vehicle_id?: string;
  junkyard_id: string;
  name: string;
  part_number?: string;
  category: PartCategory;
  condition: PartCondition;
  price?: number;
  available: boolean;
  notes?: string;
  images?: string[];
  source: VehiclePartSource;
  source_url?: string;
  scraped_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TOKEN TYPES
// ============================================================================

export type TokenType = 'free' | 'purchased';

export interface TokenTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  operation_type?: 'scrape_junkyard' | 'search_ebay' | 'run_analysis' | 'purchase';
  created_at: string;
}

export type TokenOperation = {
  type: 'scrape_junkyard' | 'search_ebay' | 'run_analysis' | 'add_junkyard';
  cost: number;
  description: string;
};

export const TOKEN_COSTS: Record<TokenOperation['type'], number> = {
  scrape_junkyard: 10,
  search_ebay: 5,
  run_analysis: 20,
  add_junkyard: 2,
};

// ============================================================================
// SCRAPING TYPES (For future implementation)
// ============================================================================

export interface ScrapingConfig {
  junkyard_id: string;
  url: string;
  selector_rules: Record<string, string>; // CSS selectors for data extraction
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface ScrapingJob {
  id: string;
  junkyard_id: string;
  type: 'junkyard' | 'ebay';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  vehicles_found?: number;
  parts_found?: number;
  error_message?: string;
  created_at: string;
}

// ============================================================================
// ANALYSIS TYPES (For future Python integration)
// ============================================================================

export interface AnalysisRequest {
  id: string;
  user_id: string;
  part_id?: string;
  vehicle_id?: string;
  analysis_type: 'market_price' | 'compatibility' | 'availability';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any; // JSON result from Python service
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
