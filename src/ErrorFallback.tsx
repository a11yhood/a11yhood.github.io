import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

export const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // When encountering an error in the development mode, rethrow it and don't display the boundary.
  // The parent UI will take care of showing a more helpful dialog.
  // Skip the rethrow in Vitest so the fallback UI can be tested directly.
  if (import.meta.env.DEV && !import.meta.env.VITEST) throw error;

  return (
    <main className="min-h-screen bg-(--color-bg) flex items-center justify-center p-4" aria-label="Error">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Application Error</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>We have encountered a runtime error</AlertTitle>
          <AlertDescription>
            Something unexpected happened while running the application. The error details are shown below. Contact the spark author and let them know about this issue.
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-sm text-muted-foreground mb-2">Error Details:</h2>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
        </div>
        
        <Button 
          onClick={resetErrorBoundary} 
          className="w-full"
          variant="outline"
        >
          <RefreshCwIcon />
          Try Again
        </Button>
      </div>
    </main>
  );
}
