export function getProductsPathForTag(tag: string): string {
  return `/products?tag=${encodeURIComponent(tag)}`
}
