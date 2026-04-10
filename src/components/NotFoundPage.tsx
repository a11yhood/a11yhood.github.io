import { Link } from 'react-router-dom'

/**
 * NotFoundPage renders when no route matches.
 * The <h1> helps satisfy axe's page-has-heading-one rule
 * for any unrecognized URL path (e.g. /draft/211/).
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="font-medium underline underline-offset-2 text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        Return to home
      </Link>
    </div>
  )
}
