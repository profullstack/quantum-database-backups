import supabaseProvider from './supabase.js';
import mongodbProvider from './mongodb.js';
import mysqlProvider from './mysql.js';
import postgresProvider from './postgres.js';

/**
 * Registry of all available database providers
 */
const providers = new Map();

// Register providers
providers.set('supabase', supabaseProvider);
providers.set('mongodb', mongodbProvider);
providers.set('mysql', mysqlProvider);
providers.set('postgres', postgresProvider);
providers.set('postgresql', postgresProvider); // Alias for postgres

/**
 * Get a provider by name
 * @param {string} name - Provider name (e.g., 'supabase', 'mongodb', 'mysql', 'postgres')
 * @returns {Object} Provider instance
 * @throws {Error} If provider not found
 */
export function getProvider(name) {
  const provider = providers.get(name.toLowerCase());
  if (!provider) {
    const available = Array.from(providers.keys()).join(', ');
    throw new Error(
      `Provider '${name}' not found. Available providers: ${available}`
    );
  }
  return provider;
}

/**
 * Get all registered providers
 * @returns {Array} Array of provider instances
 */
export function getAllProviders() {
  return Array.from(providers.values());
}

/**
 * Get names of all registered providers
 * @returns {Array<string>} Array of provider names
 */
export function getProviderNames() {
  return Array.from(providers.keys());
}

/**
 * Check if a provider is registered
 * @param {string} name - Provider name
 * @returns {boolean} True if provider exists
 */
export function hasProvider(name) {
  return providers.has(name.toLowerCase());
}

/**
 * Register a new provider
 * @param {string} name - Provider name
 * @param {Object} provider - Provider instance
 */
export function registerProvider(name, provider) {
  providers.set(name.toLowerCase(), provider);
}

// Export default provider (supabase for now)
export const defaultProvider = supabaseProvider;