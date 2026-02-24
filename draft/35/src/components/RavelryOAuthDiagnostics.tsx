import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Warning, Info, ArrowRight, Copy } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'

export function RavelryOAuthDiagnostics() {
  const [flowLog, setFlowLog] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [allLogs, setAllLogs] = useState<Array<{ key: string; value: unknown }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  const loadDiagnostics = async () => {
    setIsLoading(true)
    try {
      const logStr = localStorage.getItem('ravelry-oauth-flow-log')
      const log = logStr ? JSON.parse(logStr) : null
      const cfg = await RavelryOAuthManager.getConfig()
      
      setFlowLog(log)
      setConfig(cfg)
      
      // Get all ravelry-related keys from localStorage
      const logs: Array<{ key: string; value: unknown }> = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes('ravelry')) {
          const value = localStorage.getItem(key)
          logs.push({ key, value: value ? JSON.parse(value) : value })
        }
      }
      setAllLogs(logs)
    } catch (error) {
      console.error('Failed to load diagnostics:', error)
      toast.error('Failed to load diagnostics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDiagnostics()
  }, [])

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard!')
  }

  const handleClearAllLogs = async () => {
    try {
      localStorage.removeItem('ravelry-oauth-flow-log')
      toast.success('Flow log cleared')
      loadDiagnostics()
    } catch (error) {
      console.error('Failed to clear logs:', error)
      toast.error('Failed to clear logs')
    }
  }

  const handleResetOAuth = async () => {
    if (!confirm('This will clear ALL Ravelry OAuth data including your access token. Are you sure?')) {
      return
    }
    
    try {
      await RavelryOAuthManager.clearConfig()
      localStorage.removeItem('ravelry-oauth-flow-log')
      toast.success('OAuth configuration reset')
      loadDiagnostics()
    } catch (error) {
      console.error('Failed to reset OAuth:', error)
      toast.error('Failed to reset OAuth')
    }
  }

  const handleTestCallback = async () => {
    try {
      toast.info('Testing OAuth callback detection...', { duration: 2000 })
      
      const testCode = 'test-authorization-code-' + Date.now()
      const testUrl = `${window.location.origin}/admin?code=${testCode}`
      
      console.log('[OAuth Test] Opening test callback URL:', testUrl)
      console.log('[OAuth Test] This simulates Ravelry redirecting back with an auth code')
      console.log('[OAuth Test] Watch the console to see if the callback handler detects it')
      
      localStorage.setItem('ravelry-oauth-flow-log', JSON.stringify({
        step: 'test-callback-initiated',
        timestamp: Date.now(),
        testCode,
        testUrl,
      }))
      
      window.location.href = testUrl
    } catch (error) {
      console.error('Test callback failed:', error)
      toast.error('Failed to initiate test callback')
    }
  }

  const handleRetryTokenExchange = async () => {
    if (!flowLog?.requestDetails) {
      toast.error('No request details available to retry')
      return
    }

    if (!config?.clientId || !config?.clientSecret) {
      toast.error('Client credentials not found')
      return
    }

    const lastCode = localStorage.getItem('ravelry-last-auth-code')
    if (!lastCode) {
      toast.error('No authorization code found. Please restart the OAuth flow.')
      return
    }

    setIsRetrying(true)
    try {
      toast.info('Retrying token exchange...')
      
      const success = await RavelryOAuthManager.exchangeCodeForToken(
        lastCode,
        config.clientId,
        config.clientSecret,
        flowLog.requestDetails.redirectUri
      )

      if (success) {
        toast.success('Token exchange successful!')
        loadDiagnostics()
      } else {
        toast.error('Token exchange failed. Check the error details below.')
        loadDiagnostics()
      }
    } catch (error) {
      console.error('Retry failed:', error)
      toast.error('Retry failed with an exception')
      loadDiagnostics()
    } finally {
      setIsRetrying(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OAuth Flow Diagnostics</CardTitle>
          <CardDescription>Loading diagnostic information...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStepIcon = (step: string) => {
    if (!step) return <Info size={20} className="text-muted-foreground" />
    
    if (step.includes('success') || step.includes('token-saved')) {
      return <CheckCircle size={20} className="text-green-600" weight="fill" />
    }
    if (step.includes('error') || step.includes('failed') || step.includes('exception')) {
      return <XCircle size={20} className="text-red-600" weight="fill" />
    }
    return <Warning size={20} className="text-yellow-600" weight="fill" />
  }

  const flowSteps = [
    { name: 'Credentials Saved', key: 'credentials-saved', check: () => !!(config?.clientId && config?.clientSecret) },
    { name: 'Redirect Initiated', key: 'redirect-initiated', check: () => flowLog?.step === 'redirect-initiated' || (flowLog?.step && flowLog.step !== 'credentials-saved') },
    { name: 'Callback Received', key: 'callback-received', check: () => flowLog?.step === 'callback-received' || (flowLog?.step && ['exchanging-token', 'token-exchange-start', 'token-saved', 'success'].includes(flowLog.step)) },
    { name: 'Token Exchange', key: 'token-exchange', check: () => flowLog?.step === 'exchanging-token' || flowLog?.step === 'token-exchange-start' || (flowLog?.step && ['token-saved', 'success'].includes(flowLog.step)) },
    { name: 'Token Saved', key: 'token-saved', check: () => flowLog?.step === 'token-saved' || flowLog?.step === 'success' || !!(config?.accessToken) },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>OAuth Flow Diagnostics</CardTitle>
              <CardDescription>Review the OAuth authorization flow logs and current state</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadDiagnostics}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAllLogs}>
                Clear Logs
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestCallback}>
                Test Callback
              </Button>
              <Button variant="destructive" size="sm" onClick={handleResetOAuth}>
                Reset OAuth
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Authorization Flow Status</h3>
            <div className="space-y-2">
              {flowSteps.map((step, index) => {
                const isPassed = step.check()
                const isCurrentStep = flowLog?.step === step.key
                
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isPassed 
                        ? 'border-green-600 bg-green-50' 
                        : isCurrentStep
                        ? 'border-yellow-600 bg-yellow-50'
                        : 'border-border bg-muted/50'
                    }`}>
                      {isPassed ? (
                        <CheckCircle size={18} className="text-green-600" weight="fill" />
                      ) : isCurrentStep ? (
                        <Warning size={18} className="text-yellow-600" weight="fill" />
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isPassed ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.name}
                      </p>
                      {isCurrentStep && flowLog?.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(flowLog.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {index < flowSteps.length - 1 && (
                      <ArrowRight size={16} className="text-muted-foreground" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {config && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Current Configuration</h3>
              <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Client ID</span>
                  <span className="text-sm font-mono">
                    {config.clientId ? `${config.clientId.substring(0, 10)}...` : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Client Secret</span>
                  <span className="text-sm font-mono">
                    {config.clientSecret ? '••••••••••' : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Access Token</span>
                  <span className="text-sm font-mono">
                    {config.accessToken ? `${config.accessToken.substring(0, 10)}...` : 'Not set'}
                  </span>
                </div>
                {config.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Token Expires</span>
                    <span className="text-sm">
                      {new Date(config.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {flowLog && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Latest Flow Log Entry</h3>
              <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {getStepIcon(flowLog.step)}
                  <span className="text-sm font-medium">{flowLog.step}</span>
                </div>
                
                {flowLog.timestamp && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded">
                      {new Date(flowLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}

                {flowLog.authUrl && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Authorization URL</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(flowLog.authUrl)}
                        className="h-6 gap-1"
                      >
                        <Copy size={12} />
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded break-all">
                      {flowLog.authUrl}
                    </p>
                  </div>
                )}

                {flowLog.redirectUri && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Redirect URI</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded break-all">
                      {flowLog.redirectUri}
                    </p>
                  </div>
                )}

                {flowLog.codeLength && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Authorization Code Length</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded">
                      {flowLog.codeLength} characters
                    </p>
                  </div>
                )}

                {flowLog.url && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Callback URL</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded break-all">
                      {flowLog.url}
                    </p>
                  </div>
                )}

                {flowLog.status && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">HTTP Status</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded">
                      {flowLog.status} {flowLog.statusText}
                    </p>
                  </div>
                )}

                {flowLog.errorBody && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Error Response</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded text-destructive break-all max-h-32 overflow-y-auto">
                      {flowLog.errorBody}
                    </p>
                  </div>
                )}

                {flowLog.errorJson && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Parsed Error Details</p>
                    <pre className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded text-destructive break-all max-h-32 overflow-y-auto">
                      {JSON.stringify(flowLog.errorJson, null, 2)}
                    </pre>
                  </div>
                )}

                {flowLog.requestDetails && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Request Details</p>
                    <div className="text-xs bg-(--color-bg) px-2 py-1 rounded space-y-1">
                      <p><span className="text-muted-foreground">Token URL:</span> {flowLog.requestDetails.url}</p>
                      <p><span className="text-muted-foreground">Redirect URI:</span> {flowLog.requestDetails.redirectUri}</p>
                      <p><span className="text-muted-foreground">Code Length:</span> {flowLog.requestDetails.codeLength} chars</p>
                      <p><span className="text-muted-foreground">Client ID Length:</span> {flowLog.requestDetails.clientIdLength} chars</p>
                      <p><span className="text-muted-foreground">Client Secret Length:</span> {flowLog.requestDetails.clientSecretLength} chars</p>
                    </div>
                  </div>
                )}

                {flowLog.error && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Error Message</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded text-destructive">
                      {flowLog.error}
                    </p>
                  </div>
                )}

                {flowLog.stack && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Stack Trace</p>
                    <pre className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded text-destructive overflow-x-auto">
                      {flowLog.stack}
                    </pre>
                  </div>
                )}

                {flowLog.expiresAt && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Token Expiration</p>
                    <p className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded">
                      {new Date(flowLog.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!flowLog && !config && (
            <Alert>
              <Info size={16} className="mt-0.5" />
              <AlertDescription>
                No OAuth flow logs or configuration found. Set up your credentials and authorize with Ravelry to see diagnostics here.
              </AlertDescription>
            </Alert>
          )}

          {flowLog?.step === 'token-exchange-failed' && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Troubleshooting Token Exchange Failure</h3>
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 space-y-3">
                <p className="text-sm font-medium text-yellow-900">The token exchange failed. Here are some common causes:</p>
                
                <div className="space-y-2 text-sm text-yellow-800">
                  <div>
                    <p className="font-medium">1. Invalid Credentials</p>
                    <p className="text-xs ml-4">Double-check that your Client ID and Client Secret are correct. Copy them directly from your Ravelry app settings.</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">2. Redirect URI Mismatch</p>
                    <p className="text-xs ml-4">The redirect_uri in the token request must EXACTLY match what's registered in your Ravelry app. It should be: <code className="bg-yellow-100 px-1 py-0.5 rounded">{window.location.origin}/admin</code></p>
                  </div>
                  
                  <div>
                    <p className="font-medium">3. Expired Authorization Code</p>
                    <p className="text-xs ml-4">Authorization codes typically expire within 10 minutes. If too much time has passed since you authorized, start the flow again.</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">4. Network/CORS Issues</p>
                    <p className="text-xs ml-4">Check your browser console (F12 → Console tab) for CORS errors or network failures. The Ravelry API may be blocking cross-origin requests.</p>
                  </div>

                  <div>
                    <p className="font-medium">5. Invalid HTTP Response</p>
                    <p className="text-xs ml-4">If the error response shows HTML instead of JSON, it might indicate a server error on Ravelry's side or incorrect endpoint URL.</p>
                  </div>
                </div>

                {flowLog?.status && (
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-sm font-medium text-yellow-900">HTTP Status: {flowLog.status} {flowLog.statusText}</p>
                    {flowLog.status === 400 && <p className="text-xs text-yellow-800 mt-1">Bad Request - Usually means invalid credentials or malformed request</p>}
                    {flowLog.status === 401 && <p className="text-xs text-yellow-800 mt-1">Unauthorized - Invalid Client ID or Client Secret</p>}
                    {flowLog.status === 403 && <p className="text-xs text-yellow-800 mt-1">Forbidden - Your app may not have the required permissions</p>}
                    {flowLog.status === 404 && <p className="text-xs text-yellow-800 mt-1">Not Found - Incorrect token endpoint URL</p>}
                    {flowLog.status >= 500 && <p className="text-xs text-yellow-800 mt-1">Server Error - Ravelry's server is experiencing issues. Try again later.</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {flowLog?.step?.includes('error') && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle size={16} className="mt-0.5 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900 mb-2">Authorization Error Detected</p>
                <div className="text-sm text-red-800 space-y-1">
                  {flowLog?.isCorsError && (
                    <div className="mb-3 p-3 bg-red-100 rounded border border-red-300">
                      <p className="font-bold text-red-900 mb-2">⚠️ CORS / Network Error</p>
                      <p className="mb-2">
                        The token exchange failed due to a CORS (Cross-Origin Resource Sharing) or network error. 
                        This happens because browsers block direct OAuth token exchanges for security reasons.
                      </p>
                      <p className="font-medium mb-1">This error means:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                        <li>The CORS proxy service (corsproxy.io) may be temporarily unavailable</li>
                        <li>There may be a network connectivity issue</li>
                        <li>Your browser or network may be blocking the proxy</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Solutions to try:</p>
                      <ol className="list-decimal list-inside ml-2 space-y-1 text-xs">
                        <li>Wait a few minutes and try again (proxy may be temporarily down)</li>
                        <li>Check your internet connection</li>
                        <li>Try from a different network or browser</li>
                        <li>Disable any browser extensions that might block proxies</li>
                      </ol>
                    </div>
                  )}
                  <p><strong>Common Issues:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Client ID or Secret is incorrect</li>
                    <li>Redirect URI doesn't match exactly in Ravelry settings</li>
                    <li>Authorization code expired (codes expire quickly)</li>
                    <li>Network connectivity issues or CORS proxy unavailable</li>
                  </ul>
                  <p className="mt-2"><strong>Next Steps:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Verify your credentials in Ravelry Developer Settings</li>
                    <li>Ensure the Redirect URI matches exactly: <code className="bg-red-100 px-1 py-0.5 rounded text-xs">{window.location.origin}/admin</code></li>
                    <li>Click "Reset OAuth" above to start fresh</li>
                    <li>Try the authorization flow again</li>
                  </ol>
                  {flowLog?.step === 'token-exchange-failed' && flowLog?.requestDetails && (
                    <div className="mt-3 pt-3 border-t border-red-300">
                      <p className="font-medium mb-2">Quick Retry Option:</p>
                      <p className="mb-2">If this was a transient network error, you can try the token exchange again:</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryTokenExchange}
                        disabled={isRetrying}
                        className="bg-(--color-bg) hover:bg-accent/10 border-red-300"
                      >
                        {isRetrying ? 'Retrying...' : 'Retry Token Exchange'}
                      </Button>
                      <p className="text-xs mt-2 text-red-700">Note: This only works if the authorization code hasn't expired (usually valid for 10 minutes)</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {config?.accessToken && !flowLog?.step?.includes('error') && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle size={16} className="mt-0.5 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900">Authorization Successful!</p>
                <p className="text-sm text-green-800">
                  You can now import patterns from Ravelry. Click "Import Patterns Now" in the Ravelry Settings section.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!config?.accessToken && flowLog?.step === 'redirect-initiated' && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Warning size={16} className="mt-0.5 text-yellow-600" />
              <AlertDescription>
                <p className="font-semibold text-yellow-900 mb-2">Waiting for OAuth Callback</p>
                <div className="text-sm text-yellow-800 space-y-1">
                  <p><strong>Current Status:</strong></p>
                  <p>The authorization URL was generated and you were redirected to Ravelry, but we haven't received the callback yet.</p>
                  
                  <p className="mt-2"><strong>What Should Happen Next:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>You authorize the app on Ravelry's website</li>
                    <li>Ravelry redirects you back to <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">{window.location.origin}/admin</code></li>
                    <li>The authorization code in the URL is automatically exchanged for an access token</li>
                    <li>The token is saved and you're ready to import patterns</li>
                  </ol>
                  
                  <p className="mt-2"><strong>Possible Issues:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>You haven't clicked "Authorize" on Ravelry's page yet</li>
                    <li>The Redirect URI in your Ravelry app settings doesn't match: <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">{window.location.origin}/admin</code></li>
                    <li>You denied the authorization request</li>
                    <li>There was a network error during the callback</li>
                  </ul>
                  
                  <p className="mt-2"><strong>Next Steps:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>If you're still on this page, try clicking "Authorize with Ravelry" again</li>
                    <li>Verify your Redirect URI in Ravelry's developer settings</li>
                    <li>Make sure you're clicking "Authorize" (not "Deny") on Ravelry's page</li>
                    <li>If the problem persists, click "Reset OAuth" above to start over</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {allLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Ravelry KV Store Entries</CardTitle>
            <CardDescription>Raw data from the KV store for debugging</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allLogs.map((log, index) => (
                <div key={index} className="rounded-lg border border-border p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{log.key}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(JSON.stringify(log.value, null, 2))}
                      className="h-6 gap-1"
                    >
                      <Copy size={12} />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs font-mono bg-(--color-bg) px-2 py-1 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(log.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
