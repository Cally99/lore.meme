/**
 * Directus Asset Utilities
 * Provides functions for handling Directus file assets and generating URLs
 */

/**
 * Represents a Directus file asset with its core properties
 */
export interface DirectusFile {
  id: string;
  storage?: string;
  filename_disk?: string;
  filename_download?: string;
  title?: string;
  type?: string;
  folder?: string | null;
  uploaded_by?: string;
  uploaded_on?: string;
  modified_by?: string | null;
  modified_on?: string;
  filesize?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  description?: string | null;
  location?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Asset URL options for customizing the returned asset URL
 */
export interface AssetUrlOptions {
  /**
   * Predefined asset transformation key from Directus settings
   */
  key?: string;
  
  /**
   * Width for image transformations
   */
  width?: number;
  
  /**
   * Height for image transformations
   */
  height?: number;
  
  /**
   * Quality for image transformations (1-100)
   */
  quality?: number;
  
  /**
   * Fit mode for image transformations
   */
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
  
  /**
   * Image format to convert to
   */
  format?: 'jpg' | 'png' | 'webp' | 'tiff' | 'avif';
  
  /**
   * Whether the file should be downloaded instead of viewed
   */
  download?: boolean;
}

/**
 * Type for accepted file inputs to getDirectusAssetURL function
 */
export type FileInput = string | DirectusFile | null | undefined;

/**
 * Function signature for getDirectusAssetURL
 */
export type GetDirectusAssetURL = (
  fileOrString: FileInput, 
  options?: AssetUrlOptions
) => string;

/**
 * Utility type for extracting file IDs from various sources
 */
export type FileIdentifier = string | { id: string } | null | undefined;

/**
 * Represents a file upload response from Directus
 */
export interface FileUploadResponse {
  data: {
    id: string;
    [key: string]: any;
  }
}

/**
 * Interface for file upload options
 */
export interface FileUploadOptions {
  folder?: string;
  title?: string;
  filename_download?: string;
}

/**
 * Generates a URL for a Directus asset with optional transformations
 * @param fileOrString - File object, file ID string, or null/undefined
 * @param options - Optional transformation parameters
 * @returns Asset URL string or empty string if no file provided
 */
export function getDirectusAssetURL(
  fileOrString: FileInput, 
  options: AssetUrlOptions = {}
): string {
  // Return empty string for null/undefined inputs
  if (!fileOrString) return '';
  
  // Extract file ID from string or object
  const fileId = typeof fileOrString === 'string' 
    ? fileOrString 
    : fileOrString.id;
    
  if (!fileId) return '';
  
  // Get Directus base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
  const url = `${baseUrl}/assets/${fileId}`;
  
  // Build query parameters for transformations
  const params = new URLSearchParams();
  
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.quality) params.append('quality', options.quality.toString());
  if (options.fit) params.append('fit', options.fit);
  if (options.format) params.append('format', options.format);
  if (options.download) params.append('download', '');
  if (options.key) params.append('key', options.key);
  
  const queryString = params.toString();

  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Helper function to extract file ID from various input types
 * @param input - File identifier input
 * @returns File ID string or null
 */
export function extractFileId(input: FileIdentifier): string | null {
  if (!input) return null;
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && 'id' in input) return input.id;

  return null;
}

/**
 * Validates if a file ID is a valid UUID format
 * @param fileId - File ID to validate
 * @returns Boolean indicating if the ID is valid
 */
export function isValidFileId(fileId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(fileId);
}

/**
 * Creates a placeholder image URL for missing or invalid files
 * @param width - Placeholder width
 * @param height - Placeholder height
 * @param text - Optional text to display
 * @returns Placeholder image URL
 */
export function getPlaceholderImageUrl(
  width: number = 400, 
  height: number = 300, 
  text: string = 'No Image'
): string {
  return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(text)}`;
}

/**
 * Gets a Directus asset URL with fallback to placeholder
 * @param fileOrString - File object, file ID string, or null/undefined
 * @param options - Optional transformation parameters
 * @param fallbackOptions - Fallback placeholder options
 * @returns Asset URL or placeholder URL
 */
export function getDirectusAssetURLWithFallback(
  fileOrString: FileInput,
  options: AssetUrlOptions = {},
  fallbackOptions: { width?: number; height?: number; text?: string } = {}
): string {
  const assetUrl = getDirectusAssetURL(fileOrString, options);
  
  if (assetUrl) return assetUrl;
  
  return getPlaceholderImageUrl(
    fallbackOptions.width || options.width || 400,
    fallbackOptions.height || options.height || 300,
    fallbackOptions.text
  );
}
