/**
 * Test data constants for frontend integration tests.
 * 
 * These constants mirror the backend test_data.py to ensure
 * frontend integration tests create products with valid types and sources.
 * 
 * Import these when creating test products via the API.
 */

export const PRODUCT_SOURCES = {
  github: 'GitHub',
  ravelry: 'Ravelry',
  thingiverse: 'Thingiverse',
  'user-submitted': 'User Submitted',
} as const;

export const PRODUCT_TYPES_BY_SOURCE: Record<string, string[]> = {
  github: ['Software', 'Tool', 'Library'],
  ravelry: ['Knitting', 'Crochet', 'Weaving'],
  thingiverse: ['3D Print', 'Fabrication', 'Model'],
  'user-submitted': ['Software', 'Pattern', 'Tool', '3D Print', 'Other'],
};

export const PRODUCT_CATEGORIES = [
  'Software',
  'Patterns',
  '3D Prints',
  'Tools',
  'Other',
];

export const DEFAULT_PRODUCT_TYPE_BY_SOURCE: Record<string, string> = {
  github: 'Software',
  ravelry: 'Knitting',
  thingiverse: '3D Print',
  'user-submitted': 'Other',
};

/** Get default product type for a source */
export function getValidProductType(source: string): string {
  return DEFAULT_PRODUCT_TYPE_BY_SOURCE[source] || 'Other';
}

/** Get first valid source */
export function getValidSource(): string {
  return Object.keys(PRODUCT_SOURCES)[0];
}

/** Validate if product type is valid for source */
export function validateProductType(source: string, productType: string): boolean {
  const validTypes = PRODUCT_TYPES_BY_SOURCE[source] || [];
  return validTypes.includes(productType);
}
