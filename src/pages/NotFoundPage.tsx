import { Link } from 'react-router-dom'

export function NotFoundPage() {
    return (
        <div className="text-center py-16">
            <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
            <p className="text-muted-foreground mb-8">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link to="/" className="underline text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                Return to home
            </Link>
        </div>
    )
}