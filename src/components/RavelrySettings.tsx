import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Info, Copy, Play, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'
import { APIService } from '@/lib/api'

type RavelrySettingsProps = {
  onAuthComplete?: () => void
  products?: any[]
  onProductsUpdate?: (products: any[]) => void
  ravelryAuthTimestamp?: number
}

export function RavelrySettings({ onAuthComplete, products = [], onProductsUpdate, ravelryAuthTimestamp }: RavelrySettingsProps) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [username, setUsername] = useState<string>('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isScrapingAfterAuth, setIsScrapingAfterAuth] = useState(false)
  
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [oauthFlowLog, setOauthFlowLog] = useState<any>(null)
  const [saveLog, setSaveLog] = useState<any>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const getRedirectUri = () => {
    return `${window.location.origin}/admin`
  }

  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      try {
        const config = await RavelryOAuthManager.getConfig()
        console.log('[Ravelry] Auth check - config exists:', !!config)
        console.log('[Ravelry] Auth check - has clientId:', !!config?.clientId)
        console.log('[Ravelry] Auth check - has accessToken:', !!config?.accessToken)
        
        setHasCredentials(!!(config?.clientId && config?.clientSecret))
        
        const authorized = await RavelryOAuthManager.isAuthorized()
        setIsAuthorized(authorized)
        
        if (authorized) {
          if (config?.username) {
            setUsername(config.username)
          }
        }
        
        const flowLogStr = localStorage.getItem('ravelry-oauth-flow-log')
        setOauthFlowLog(flowLogStr ? JSON.parse(flowLogStr) : null)
        
        const saveLogStr = localStorage.getItem('ravelry-oauth-save-log')
        setSaveLog(saveLogStr ? JSON.parse(saveLogStr) : null)
      } catch (error) {
        console.error('Failed to check authorization:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [ravelryAuthTimestamp])

  const handleRunRavelryScraper = async () => {
    setIsScrapingAfterAuth(true)
    try {
      toast.info('Starting Ravelry scraper...', { duration: 2000 })
      
      // Call backend API to trigger scraper
      await APIService.triggerScraper('ravelry', false)
      
      // Wait a bit for scraping to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Fetch updated products
      const allProducts = await APIService.getAllProducts()
      const ravelryProducts = allProducts.filter(p =>
        typeof p.source === 'string' && p.source.toLowerCase().includes('ravelry')
      )
      
      if (ravelryProducts.length === 0) {
        toast.info('No patterns found')
        return
      }

      toast.success(`Scraper started! Found ${ravelryProducts.length} Ravelry patterns`)
      
      // Update product list if callback provided
      if (onProductsUpdate) {
        onProductsUpdate(allProducts)
      }
      
      console.log('[RavelrySettings] Ravelry products count:', ravelryProducts.length)
      
      if (onAuthComplete) {
        onAuthComplete()
      }
    } catch (error) {
      console.error('[RavelrySettings] Scraper error:', error)
      toast.error('Failed to run Ravelry scraper')
    } finally {
      setIsScrapingAfterAuth(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Please enter both Client ID and Client Secret')
      return
    }

    setIsSaving(true)
    try {
      console.log('[Ravelry] ========== SAVING CREDENTIALS ==========')
      console.log('[Ravelry] → Client ID length:', clientId.trim().length)
      console.log('[Ravelry] → Client Secret length:', clientSecret.trim().length)
      
      // Merge with existing config to preserve any existing token
      const existingConfig = await RavelryOAuthManager.getConfig()
      console.log('[Ravelry] → Existing config has token:', !!existingConfig?.accessToken)
      
      const config = {
        ...existingConfig,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      }
      
      console.log('[Ravelry] → Calling RavelryOAuthManager.saveConfig...')
      await RavelryOAuthManager.saveConfig(config)
      console.log('[Ravelry] → saveConfig returned successfully')
      
      console.log('[Ravelry] → Verifying save by retrieving config...')
      const savedConfig = await RavelryOAuthManager.getConfig()
      console.log('[Ravelry] → Retrieved config exists:', !!savedConfig)
      
      if (savedConfig) {
        console.log('[Ravelry] → Has clientId:', !!savedConfig.clientId)
        console.log('[Ravelry] → Has clientSecret:', !!savedConfig.clientSecret)
        console.log('[Ravelry] → ClientId match:', savedConfig.clientId === clientId.trim())
      }
      
      if (!savedConfig?.clientId) {
        console.error('[Ravelry] ✗ Verification failed - no clientId in retrieved config!')
        throw new Error('Failed to verify saved credentials')
      }
      
      console.log('[Ravelry] ✓ Credentials saved and verified successfully!')
      setHasCredentials(true)
      setShowSetupForm(false)
      setClientId('')
      setClientSecret('')
      toast.success('Credentials saved! Now click "Authorize with Ravelry" to complete setup.', { duration: 5000 })
    } catch (error) {
      console.error('[Ravelry] ✗ Save credentials error:', error)
      if (error instanceof Error) {
        console.error('[Ravelry] Error message:', error.message)
        console.error('[Ravelry] Error stack:', error.stack)
      }
      toast.error('Failed to save credentials. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAuthorize = async () => {
    console.log('[Ravelry] ========== AUTHORIZATION FLOW START ==========')
    console.log('[Ravelry] → Retrieving saved credentials...')
    
    const config = await RavelryOAuthManager.getConfig()
    console.log('[Ravelry] → Config retrieved:', config ? 'YES' : 'NO')
    
    if (config?.clientId) {
      console.log('[Ravelry] → Client ID exists:', config.clientId.substring(0, 10) + '...')
    }
    
    if (!config?.clientId) {
      console.error('[Ravelry] ✗ No Client ID found!')
      toast.error('Please save your Client ID and Secret first')
      setShowSetupForm(true)
      return
    }

    try {
      const redirectUri = getRedirectUri()
      console.log('[Ravelry] → Redirect URI:', redirectUri)
      
      const authUrl = await RavelryOAuthManager.getAuthorizationUrl(redirectUri)
      console.log('[Ravelry] → Authorization URL generated successfully')
      console.log('[Ravelry] → Full URL:', authUrl)
      console.log('[Ravelry] → URL length:', authUrl.length, 'characters')
      
      console.log('[Ravelry] ========== REDIRECTING TO RAVELRY ==========')
      console.log('[Ravelry] → Target URL:', authUrl)
      console.log('[Ravelry] → Using same-window redirect for better OAuth callback handling')
      
      toast.info('Redirecting to Ravelry for authorization...', { duration: 3000 })
      
      setTimeout(() => {
        window.location.href = authUrl
      }, 500)
    } catch (error) {
      console.error('[Ravelry] ✗ Authorization error:', error)
      toast.error('Failed to generate authorization URL. Please check your credentials.')
    }
  }

  const handleDisconnect = async () => {
    try {
      await RavelryOAuthManager.clearConfig()
      setUsername('')
      toast.success('Ravelry disconnected successfully')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect Ravelry')
    }
  }

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(getRedirectUri())
    toast.success('Redirect URI copied to clipboard!')
  }

  if (isCheckingAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ravelry OAuth2 Configuration</CardTitle>
          <CardDescription>Loading authorization status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Ravelry OAuth2 Configuration
          {isAuthorized && <CheckCircle size={20} className="text-green-600" weight="fill" />}
          {!isAuthorized && <XCircle size={20} className="text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Configure OAuth2 to enable Ravelry pattern scraping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info size={16} className="mt-0.5" />
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-semibold">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>
                  Go to{' '}
                  <a 
                    href="https://www.ravelry.com/pro/developer" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium"
                  >
                    Ravelry Developer Settings
                  </a>
                </li>
                <li>Create a new OAuth2 application (or use an existing one)</li>
                <li>Set the <strong>Redirect URI</strong> to: <code className="bg-muted px-1 py-0.5 rounded text-xs">{getRedirectUri()}</code></li>
                <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>Paste them below and click "Save Credentials"</li>
                <li>Then click "Authorize with Ravelry" to complete the OAuth flow</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Redirect URI</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyRedirectUri}
              className="h-8 gap-2"
            >
              <Copy size={14} />
              Copy
            </Button>
          </div>
          <code className="block text-xs bg-muted p-2 rounded break-all">
            {getRedirectUri()}
          </code>
          <p className="text-xs text-muted-foreground">
            Use this exact URL in your Ravelry OAuth2 application settings
          </p>
        </div>

        {!isAuthorized || showSetupForm ? (
          <div className="space-y-4">
            {hasCredentials && !showSetupForm && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold text-blue-900">Credentials Saved!</p>
                  <p className="text-blue-700">Click "Authorize with Ravelry" below to complete the setup.</p>
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">Ravelry Client ID</Label>
                <Input
                  id="client-id"
                  type="text"
                  placeholder="Your Ravelry OAuth2 Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret">Ravelry Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  placeholder="Your Ravelry OAuth2 Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                These credentials are stored locally for setup and saved to the backend only after you complete OAuth.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving || !clientId.trim() || !clientSecret.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save Credentials'}
                </Button>
                {showSetupForm && isAuthorized && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetupForm(false)
                      setClientId('')
                      setClientSecret('')
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {username ? `Connected as ${username}` : 'Connected to Ravelry'}
                  </p>
                </div>
                <CheckCircle size={24} className="text-green-600" weight="fill" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleRunRavelryScraper}
                disabled={isScrapingAfterAuth}
                className="flex items-center gap-2"
              >
                {isScrapingAfterAuth ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    Importing Patterns...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Import Patterns Now
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
              >
                Disconnect
              </Button>
              <Button
                onClick={() => setShowSetupForm(true)}
                variant="outline"
              >
                Update Credentials
              </Button>
            </div>
          </div>
        )}

        {!isAuthorized && hasCredentials && (
          <Button
            onClick={handleAuthorize}
            className="w-full"
            size="lg"
          >
            Authorize with Ravelry
          </Button>
        )}

        <Alert>
          <Info size={16} className="mt-0.5" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold">🔒 Security & Privacy:</p>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>Your Client ID and Secret are stored encrypted in Spark KV storage</li>
              <li>Only you (the app owner) can access them</li>
              <li>They never appear in your repository or code</li>
              <li>You can revoke access anytime from Ravelry's developer settings</li>
              <li>OAuth2 tokens are automatically refreshed when they expire</li>
            </ul>
          </AlertDescription>
        </Alert>

        {oauthFlowLog && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">OAuth Flow Diagnostics</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="h-8"
              >
                {showDiagnostics ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showDiagnostics && (
              <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Last Flow Step:</p>
                  <code className="block text-xs bg-(--color-bg) p-2 rounded">
                    {oauthFlowLog.step}
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Timestamp:</p>
                  <code className="block text-xs bg-(--color-bg) p-2 rounded">
                    {new Date(oauthFlowLog.timestamp).toLocaleString()}
                  </code>
                </div>
                {oauthFlowLog.authUrl && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Auth URL Generated:</p>
                    <code className="block text-xs bg-(--color-bg) p-2 rounded break-all">
                      {oauthFlowLog.authUrl}
                    </code>
                  </div>
                )}
                {oauthFlowLog.error && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Flow Error:</p>
                    <code className="block text-xs bg-(--color-bg) p-2 rounded text-destructive">
                      {oauthFlowLog.error}
                    </code>
                  </div>
                )}
                {saveLog && (
                  <>
                    <hr className="my-2" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Token Save Status:</p>
                      <code className={`block text-xs bg-(--color-bg) p-2 rounded ${saveLog.success ? 'text-green-600' : 'text-destructive'}`}>
                        {saveLog.success ? '✓ Saved' : '✗ Failed'}
                      </code>
                    </div>
                    {saveLog.message && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Message:</p>
                        <code className="block text-xs bg-(--color-bg) p-2 rounded">
                          {saveLog.message}
                        </code>
                      </div>
                    )}
                    {saveLog.status && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">HTTP Status:</p>
                        <code className="block text-xs bg-(--color-bg) p-2 rounded">
                          {saveLog.status}
                        </code>
                      </div>
                    )}
                    {saveLog.error && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-destructive">Save Error:</p>
                        <code className="block text-xs bg-(--color-bg) p-2 rounded text-destructive whitespace-pre-wrap">
                          {saveLog.error}
                        </code>
                      </div>
                    )}
                    {saveLog.data && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Backend Response:</p>
                        <code className="block text-xs bg-(--color-bg) p-2 rounded whitespace-pre-wrap overflow-auto max-h-48">
                          {JSON.stringify(saveLog.data, null, 2)}
                        </code>
                      </div>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setOauthFlowLog(null)
                    setSaveLog(null)
                    localStorage.removeItem('ravelry-oauth-flow-log')
                    localStorage.removeItem('ravelry-oauth-save-log')
                    toast.success('Diagnostics cleared')
                  }}
                  className="w-full"
                >
                  Clear Diagnostics
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
