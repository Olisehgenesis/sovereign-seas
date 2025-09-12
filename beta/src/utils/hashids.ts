import Hashids from 'hashids';

// Initialize hashids with a secret salt and minimum length of 6 characters
const hashids = new Hashids('sovereign-seas-salt-2024', 6);

/**
 * Hashids utility for encoding/decoding numeric IDs in URLs
 * Provides backward compatibility with existing numeric URLs
 */

/**
 * Encodes a numeric ID to a hashid string
 * @param id - The numeric ID to encode
 * @returns The encoded hashid string
 */
export function encodeId(id: number | bigint): string {
  const numericId = typeof id === 'bigint' ? Number(id) : id;
  return hashids.encode(numericId);
}

/**
 * Decodes a hashid string back to a numeric ID
 * @param hashid - The hashid string to decode
 * @returns The decoded numeric ID, or null if invalid
 */
export function decodeId(hashid: string): number | null {
  try {
    const decoded = hashids.decode(hashid);
    return decoded.length > 0 ? Number(decoded[0]) : null;
  } catch (error) {
    console.warn('Failed to decode hashid:', hashid, error);
    return null;
  }
}

/**
 * Parses a URL parameter that could be either a numeric ID or a hashid
 * This ensures backward compatibility with existing numeric URLs
 * @param param - The URL parameter (could be "123" or "xmu52x")
 * @returns The numeric ID
 */
export function parseIdParam(param: string | undefined): number | null {
  if (!param) return null;
  
  // First, try to parse as a direct number (backward compatibility)
  const directNumber = parseInt(param, 10);
  if (!isNaN(directNumber) && directNumber.toString() === param) {
    return directNumber;
  }
  
  // If not a direct number, try to decode as hashid
  return decodeId(param);
}

/**
 * Generates a URL-friendly ID that could be either numeric or hashid
 * For new URLs, use hashids. For existing compatibility, can return numeric
 * @param id - The numeric ID
 * @param useHashid - Whether to use hashid encoding (default: true for new URLs)
 * @returns The URL-friendly ID string
 */
export function generateUrlId(id: number | bigint, useHashid: boolean = true): string {
  if (useHashid) {
    return encodeId(id);
  }
  return id.toString();
}

/**
 * Checks if a string is a valid numeric ID (for backward compatibility)
 * @param str - The string to check
 * @returns True if it's a valid numeric ID
 */
export function isNumericId(str: string): boolean {
  const num = parseInt(str, 10);
  return !isNaN(num) && num.toString() === str;
}

/**
 * Checks if a string is a valid hashid
 * @param str - The string to check
 * @returns True if it's a valid hashid
 */
export function isHashid(str: string): boolean {
  return decodeId(str) !== null;
}

/**
 * Gets the appropriate route path for a project
 * @param projectId - The project ID
 * @param useHashid - Whether to use hashid encoding
 * @returns The route path
 */
export function getProjectRoute(projectId: number | bigint, useHashid: boolean = true): string {
  const id = generateUrlId(projectId, useHashid);
  return `/explorer/project/${id}`;
}

/**
 * Gets the appropriate route path for a campaign
 * @param campaignId - The campaign ID
 * @param useHashid - Whether to use hashid encoding
 * @returns The route path
 */
export function getCampaignRoute(campaignId: number | bigint, useHashid: boolean = true): string {
  const id = generateUrlId(campaignId, useHashid);
  console.log('getCampaignRoute called with:', { campaignId, useHashid, id, route: `/explorer/campaign/${id}` });
  return `/explorer/campaign/${id}`;
}
