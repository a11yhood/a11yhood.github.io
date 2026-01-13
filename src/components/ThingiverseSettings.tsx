import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Info, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ThingiverseOAuthManager } from '@/lib/scrapers/thingiverse'
import { APIService } from '@/lib/api'

type ThingiverseSettingsProps = {
  onAuthComplete?: () => void
  products?: any[]
  onProductsUpdate?: (products: any[]) => void
}

export function ThingiverseSettings({ onAuthComplete, products = [], onProductsUpdate }: ThingiverseSettingsProps) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [appName, setAppName] = useState<string>('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isScrapingAfterAuth, setIsScrapingAfterAuth] = useState(false)
  
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [appNameInput, setAppNameInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      try {
        const config = await ThingiverseOAuthManager.getConfig()
        console.log('[ThingiverseSettings] Auth check - config exists:', !!config)
        console.log('[ThingiverseSettings] Auth check - has accessToken:', !!config?.accessToken)
        
        const authorized = await ThingiverseOAuthManager.isAuthorized()
        setIsAuthorized(authorized)
        
        if (authorized && config?.appName) {
          setAppName(config.appName)
        }
      } catch (error) {
        console.error('[ThingiverseSettings] Failed to check authorization:', error)
        // Gracefully handle missing config - show "Not connected" state
        setIsAuthorized(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleRunThingiverseScraper = async () => {
    setIsScrapingAfterAuth(true)
    try {
      toast.info('Starting Thingiverse scraper...', { duration: 2000 })
      
      // Call backend API to trigger scraper
      await APIService.triggerScraper('thingiverse', false)
      
      // Wait a bit for scraping to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Fetch updated products
      const allProducts = await APIService.getAllProducts()
      const thingiverseProducts = allProducts.filter(p =>
        typeof p.source === 'string' && p.source.toLowerCase().includes('thingiverse')
      )
      
      if (thingiverseProducts.length === 0) {
        toast.info('No models found')
        return
      }

      toast.success(`Scraper started! Found ${thingiverseProducts.length} Thingiverse models`)
      
      // Update product list if callback provided
      if (onProductsUpdate) {
        onProductsUpdate(allProducts)
      }
      
      console.log('[ThingiverseSettings] Thingiverse models count:', thingiverseProducts.length)
      
      if (onAuthComplete) {
        onAuthComplete()
      }
    } catch (error) {
      console.error('[ThingiverseSettings] Scraper error:', error)
      toast.error('Failed to run Thingiverse scraper')
    } finally {
      setIsScrapingAfterAuth(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter your Personal Access Token')
      return
    }

    setIsSaving(true)
    try {
      console.log('[Thingiverse] ========== SAVING CREDENTIALS ==========')
      console.log('[Thingiverse] → Access Token length:', accessToken.trim().length)
      console.log('[Thingiverse] → App Name:', appNameInput.trim() || '(not provided)')
      
      const config = {
        accessToken: accessToken.trim(),
        appName: appNameInput.trim() || 'a11yhood',
      }
      
      console.log('[Thingiverse] → Calling ThingiverseOAuthManager.saveConfig...')
      await ThingiverseOAuthManager.saveConfig(config)
      console.log('[Thingiverse] → saveConfig returned successfully')
      
      console.log('[Thingiverse] → Verifying save by retrieving config...')
      const savedConfig = await ThingiverseOAuthManager.getConfig()
      console.log('[Thingiverse] → Retrieved config exists:', !!savedConfig)
      
      if (savedConfig) {
        console.log('[Thingiverse] → Has accessToken:', !!savedConfig.accessToken)
        console.log('[Thingiverse] → Token match:', savedConfig.accessToken === accessToken.trim())
      }
      
      if (!savedConfig?.accessToken) {
        console.error('[Thingiverse] ✗ Verification failed - no accessToken in retrieved config!')
        throw new Error('Failed to verify saved credentials')
      }
      
      console.log('[Thingiverse] ✓ Credentials saved and verified successfully!')
      setIsAuthorized(true)
      setAppName(config.appName)
      setShowSetupForm(false)
      setAccessToken('')
      setAppNameInput('')
      toast.success('Personal Access Token saved successfully!', { duration: 5000 })
    } catch (error) {
      console.error('[Thingiverse] ✗ Save credentials error:', error)
      if (error instanceof Error) {
        console.error('[Thingiverse] Error message:', error.message)
        console.error('[Thingiverse] Error stack:', error.stack)
      }
      toast.error('Failed to save credentials. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await ThingiverseOAuthManager.clearConfig()
      setIsAuthorized(false)
      setAppName('')
      toast.success('Thingiverse disconnected successfully')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect Thingiverse')
    }
  }

  if (isCheckingAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thingiverse Personal Access Token Configuration</CardTitle>
          <CardDescription>Loading authorization status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Thingiverse Personal Access Token Configuration
          {isAuthorized && <CheckCircle size={20} className="text-green-600" weight="fill" />}
          {!isAuthorized && <XCircle size={20} className="text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Configure Personal Access Token to enable Thingiverse model scraping
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
                    href="https://www.thingiverse.com/apps/create" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium"
                  >
                    Thingiverse Apps
                  </a>
                  {' '}and create a new app (or use an existing one)
                </li>
                <li>Fill in the required app details (name, description, etc.)</li>
                <li>After creating the app, go to the app's details page</li>
                <li>Generate a <strong>Personal Access Token</strong></li>
                <li>Copy the token and paste it below</li>
                <li>Click "Save Token" to store your credentials securely</li>
                <li>Click "Run Scraper" to import accessibility-related 3D models</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Personal Access Tokens provide API access without the complexity of full OAuth2 flows. 
                Your token is stored securely in the application's key-value store and never exposed in the UI.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {isAuthorized ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-600" weight="fill" />
                <div>
                  <p className="font-medium text-green-900">Connected to Thingiverse</p>
                  {appName && <p className="text-sm text-green-700">App: {appName}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRunThingiverseScraper}
                  disabled={isScrapingAfterAuth}
                  variant="default"
                >
                  {isScrapingAfterAuth && <CircleNotch size={16} className="mr-2 animate-spin" />}
                  {isScrapingAfterAuth ? 'Running Scraper...' : 'Run Scraper'}
                </Button>
                <Button onClick={handleDisconnect} variant="outline">
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {showSetupForm ? (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="thingiverse-app-name">App Name (optional)</Label>
                  <Input
                    id="thingiverse-app-name"
                    type="text"
                    placeholder="e.g., a11yhood-scraper"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The name of your Thingiverse app (for reference only)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thingiverse-token">Personal Access Token *</Label>
                  <Input
                    id="thingiverse-token"
                    type="password"
                    placeholder="Paste your Personal Access Token here"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your token will be stored securely and never shown after saving
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveCredentials}
                    disabled={isSaving || !accessToken.trim()}
                  >
                    {isSaving && <CircleNotch size={16} className="mr-2 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Token'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowSetupForm(false)
                      setAccessToken('')
                      setAppNameInput('')
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle size={24} className="text-muted-foreground" />
                  <p className="text-muted-foreground">Not connected to Thingiverse</p>
                </div>
                <Button onClick={() => setShowSetupForm(true)}>
                  Add Personal Access Token
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
