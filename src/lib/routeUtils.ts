export const routeNeedsFullProductList = (pathname: string) => (
  pathname === '/products' ||
  pathname === '/submit' ||
  pathname.startsWith('/admin')
)
