import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Info, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { GOATOAuthManager } from '@/lib/scrapers/goat'
import { APIService } from '@/lib/api'

type GOATSettingsProps = {
  onAuthComplete?: () => void
  products?: any[]
  onProductsUpdate?: (products: any[]) => void
}

export function GOATSettings({ onAuthComplete, products = [], onProductsUpdate }: GOATSettingsProps) {
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
        const config = await GOATOAuthManager.getConfig()
        console.log('[GOATSettings] Auth check - config exists:', !!config)
        console.log('[GOATSettings] Auth check - has accessToken:', !!config?.accessToken)
        
        const authorized = await GOATOAuthManager.isAuthorized()
        setIsAuthorized(authorized)
        
        if (authorized && config?.appName) {
          setAppName(config.appName)
        }
      } catch (error) {
        console.error('[GOATSettings] Failed to check authorization:', error)
        setIsAuthorized(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleRunGOATScraper = async () => {
    setIsScrapingAfterAuth(true)
    try {
      toast.info('Starting GOAT scraper...', { duration: 2000 })
      
      await APIService.triggerScraper('goat', false)
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const allProducts = await APIService.getAllProducts()
      const goatProducts = allProducts.filter(p =>
        typeof p.source === 'string' && p.source.toLowerCase().includes('goat')
      )
      
      if (goatProducts.length === 0) {
        toast.info('No products found')
        return
      }

      toast.success(`Scraper started! Found ${goatProducts.length} GOAT products`)
      
      if (onProductsUpdate) {
        onProductsUpdate(allProducts)
      }
      
      console.log('[GOATSettings] GOAT products count:', goatProducts.length)
      
      if (onAuthComplete) {
        onAuthComplete()
      }
    } catch (error) {
      console.error('[GOATSettings] Scraper error:', error)
      toast.error('Failed to run GOAT scraper')
    } finally {
      setIsScrapingAfterAuth(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter your GOAT Access Token')
      return
    }

    setIsSaving(true)
    try {
      console.log('[GOAT] ========== SAVING CREDENTIALS ==========')
      console.log('[GOAT] → Access Token length:', accessToken.trim().length)
      console.log('[GOAT] → App Name:', appNameInput.trim() || '(not provided)')
      
      const config = {
        accessToken: accessToken.trim(),
        appName: appNameInput.trim() || 'a11yhood',
      }
      
      console.log('[GOAT] → Calling GOATOAuthManager.saveConfig...')
      await GOATOAuthManager.saveConfig(config)
      console.log('[GOAT] → saveConfig returned successfully')
      
      console.log('[GOAT] → Verifying save by retrieving config...')
      const savedConfig = await GOATOAuthManager.getConfig()
      console.log('[GOAT] → Retrieved config exists:', !!savedConfig)
      
      if (savedConfig) {
        console.log('[GOAT] → Has accessToken:', !!savedConfig.accessToken)
        console.log('[GOAT] → Token match:', savedConfig.accessToken === accessToken.trim())
      }
      
      if (!savedConfig?.accessToken) {
        console.error('[GOAT] ✗ Verification failed - no accessToken in retrieved config!')
        throw new Error('Failed to verify saved credentials')
      }
      
      console.log('[GOAT] ✓ Credentials saved and verified successfully!')
      setIsAuthorized(true)
      setAppName(config.appName)
      setShowSetupForm(false)
      setAccessToken('')
      setAppNameInput('')
      toast.success('Access Token saved successfully!', { duration: 5000 })
    } catch (error) {
      console.error('[GOAT] ✗ Save credentials error:', error)
      if (error instanceof Error) {
        console.error('[GOAT] Error message:', error.message)
        console.error('[GOAT] Error stack:', error.stack)
      }
      toast.error('Failed to save credentials. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await GOATOAuthManager.clearConfig()
      setIsAuthorized(false)
      setAppName('')
      toast.success('GOAT disconnected successfully')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect GOAT')
    }
  }

  if (isCheckingAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GOAT Access Token Configuration</CardTitle>
          <CardDescription>Loading authorization status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          GOAT Access Token Configuration
          {isAuthorized && <CheckCircle size={20} className="text-green-600" weight="fill" />}
          {!isAuthorized && <XCircle size={20} className="text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Configure Access Token to enable GOAT product scraping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info size={16} className="mt-0.5" />
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-semibold">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Contact GOAT support to obtain an API access token for your application</li>
                <li>Copy the access token and paste it below</li>
                <li>(Optional) Provide a custom app name for identification</li>
                <li>Click "Save Token" to store your credentials securely</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {isAuthorized ? (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-green-600" weight="fill" />
                <span className="font-medium">Connected to GOAT</span>
              </div>
              {appName && (
                <p className="text-sm text-muted-foreground">App Name: {appName}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRunGOATScraper}
                disabled={isScrapingAfterAuth}
                className="flex-1"
              >
                {isScrapingAfterAuth ? (
                  <>
                    <CircleNotch size={18} className="mr-2 animate-spin" />
                    Running Scraper...
                  </>
                ) : (
                  'Run GOAT Scraper'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!showSetupForm ? (
              <Button onClick={() => setShowSetupForm(true)} className="w-full">
                Configure GOAT Access Token
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goat-token">Access Token *</Label>
                  <Input
                    id="goat-token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter your GOAT access token"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="goat-app-name">App Name (Optional)</Label>
                  <Input
                    id="goat-app-name"
                    type="text"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="a11yhood"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to identify this application in logs
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveCredentials}
                    disabled={isSaving || !accessToken.trim()}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <CircleNotch size={18} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Token'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetupForm(false)
                      setAccessToken('')
                      setAppNameInput('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
