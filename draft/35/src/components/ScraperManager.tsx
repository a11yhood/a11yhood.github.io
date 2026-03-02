/**
 * ScraperManager - Unified product management interface
 * 
 * Combines scraper controls with product management in a single view:
 * - Scraper controls: Run/stop automated discovery from Thingiverse, Ravelry, GitHub
 * - Manage by Source: Bulk operations (delete all) by platform + user-submitted products
 * - Scraped Products: Table view of all products discovered by scrapers
 * - User-Submitted Products: Table view of community-contributed products
 * 
 * Features product editing, deletion, and tracks last scrape time.
 */
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Product } from '@/lib/types'
import { APIService } from '@/lib/api'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'
import { ThingiverseOAuthManager } from '@/lib/scrapers/thingiverse'
import { Download, CircleNotch, Pencil, Trash, Play, Clock, Check, Bug, CheckCircle, XCircle, HourglassHigh, DownloadSimple, Gear, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { formatSourceLabel } from '@/lib/utils'
import MarkdownText from '@/components/ui/MarkdownText'

type ScraperManagerProps = {
  products: Product[]
  onProductsUpdate: (products: Product[]) => void
  role?: 'user' | 'moderator' | 'admin'
  currentUserId?: string
}

type ScraperDebugInfo = {
  source: string
  status: 'pending' | 'running' | 'success' | 'error'
  productsFound: number
  error?: string
  duration?: number
  startTime?: number
  endTime?: number
  productsData?: any[]
}

export function ScraperManager({ products, onProductsUpdate, role = 'user', currentUserId }: ScraperManagerProps) {
  const [scraping, setScraping] = useState(false)
  const [lastScrape, setLastScrape] = useState<number | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<Partial<Product>>({})
  const [deleteSourceDialog, setDeleteSourceDialog] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<ScraperDebugInfo[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [githubSearchTerms, setGithubSearchTerms] = useState<string[]>([])
  const [thingiverseSearchTerms, setThingiverseSearchTerms] = useState<string[]>([])
  const [ravelrySearchTerms, setRavelrySearchTerms] = useState<string[]>([])
  const [showSearchTermsDialog, setShowSearchTermsDialog] = useState(false)
  const [activePlatform, setActivePlatform] = useState<'github' | 'thingiverse' | 'ravelry'>('github')
  const [newSearchTerm, setNewSearchTerm] = useState('')
  const [loadingSearchTerms, setLoadingSearchTerms] = useState(false)
  const [remoteCounts, setRemoteCounts] = useState<Record<string, number>>({})
  const [knownSources, setKnownSources] = useState<string[]>([])

  // Derived sources and counts (fallback to local data to avoid backend 500s)
  const normalizedProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      source: (p.source || '').replace(/^scraped-/, ''),
    }))
  }, [products])

  const availableSources = useMemo(() => {
    return Array.from(new Set(normalizedProducts.map(p => p.source).filter(Boolean)))
  }, [normalizedProducts])

  // Load known sources from backend
  useEffect(() => {
    const loadSources = async () => {
      try {
        const rawSources = await APIService.getProductSources()
        console.log('[ScraperManager] Loaded sources from backend:', rawSources)
        const names = (rawSources || [])
          .map(src => {
            if (typeof src === 'string') return src
            if (src && typeof src === 'object' && 'name' in src) return String((src as { name?: string }).name || '')
            return ''
          })
          .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        const uniqueNames = Array.from(new Set(names))
        setKnownSources(uniqueNames)
      } catch (error) {
        console.error('[ScraperManager] Failed to load sources:', error)
        // Fall back to empty array; will use available sources only
        setKnownSources([])
      }
    }
    loadSources()
  }, [])

  const allSources = useMemo(() => {
    return Array.from(new Set([...knownSources, ...availableSources]))
  }, [knownSources, availableSources])

  const canBan = role === 'admin' || role === 'moderator'

  // Fetch backend counts per source; fall back to local counts if backend returns 0 or fails
  useEffect(() => {
    let cancelled = false
    const loadCounts = async () => {
      try {
        console.log('[ScraperManager] Loading counts for sources:', allSources)
        const results = await Promise.allSettled(
          allSources.map(src => APIService.getProductCountBySource(src))
        )
        if (cancelled) return
        const next: Record<string, number> = {}
        results.forEach((res, idx) => {
          const key = allSources[idx]
          if (res.status === 'fulfilled') {
            let count = res.value
            // Fall back to local count if backend returns 0 (likely a backend query issue)
            if (count === 0) {
              const localCount = normalizedProducts.filter(p => p.source === key).length
              if (localCount > 0) {
                console.warn(`[ScraperManager] Backend returned 0 for "${key}", using local count: ${localCount}`)
                count = localCount
              }
            }
            next[key] = count
            console.log(`[ScraperManager] Count for "${key}": ${count}`)
          } else {
            console.warn(`[ScraperManager] Failed to get count for "${key}":`, res.reason)
            // Fall back to local count on error
            const localCount = normalizedProducts.filter(p => p.source === key).length
            next[key] = localCount
            console.log(`[ScraperManager] Using fallback local count for "${key}": ${localCount}`)
          }
        })
        setRemoteCounts(next)
        const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
        if (failures.length > 0) {
          console.warn('[ScraperManager] Some source counts failed; showing 0 for those sources', failures.map(f => f.reason))
        }
      } catch (e) {
        console.warn('[ScraperManager] Count fetch aborted:', e)
      }
      if (cancelled) return
    }
    loadCounts()
    return () => { cancelled = true }
  }, [allSources, normalizedProducts])

  const handleRunScraper = async (specificSource?: string, testMode: boolean = false) => {
    setScraping(true)
    setShowDebug(true)
    
    // Determine which sources to scrape - use known sources from backend
    const scrapableSources = knownSources.filter(s => s.toLowerCase() !== 'user-submitted')
    const sourcesToRun = specificSource ? [specificSource] : scrapableSources
    
    const initialDebugInfo: ScraperDebugInfo[] = sourcesToRun.map(source => ({
      source,
      status: 'pending',
      productsFound: 0,
    }))
    
    if (specificSource) {
      setDebugInfo(prev => {
        const filtered = prev.filter(d => d.source !== specificSource)
        return [...filtered, ...initialDebugInfo]
      })
    } else {
      setDebugInfo(initialDebugInfo)
    }
    
    try {
      toast.info(
        testMode 
          ? `Starting test scrape (5 products)${specificSource ? ` from ${specificSource}` : ''}...` 
          : specificSource ? `Starting ${specificSource} scraper...` : 'Starting all scrapers...', 
        { duration: 2000 }
      )
      
      const results = await Promise.all(
        sourcesToRun.map(async (source) => {
          const startTime = Date.now()
          
          setDebugInfo(prev => prev.map((info) => 
            info.source === source ? { ...info, status: 'running', startTime } : info
          ))
          
          try {
            // If running Ravelry, ensure token/config is present and re-saved to backend
            if (source === 'ravelry') {
              console.log('[ScraperManager] Ravelry scraper: ensuring token is saved to backend...')
              const tokenSaved = await RavelryOAuthManager.ensureTokenSaved()
              if (!tokenSaved) {
                throw new Error('Ravelry token not found. Please authorize in admin settings.')
              }
              console.log('[ScraperManager] Ravelry token confirmed and re-synced with backend')
            }

            // If running Thingiverse, ensure token/config exists and heal backend
            if (source === 'thingiverse') {
              console.log('[ScraperManager] Thingiverse scraper: checking token/config...')
              const config = await ThingiverseOAuthManager.getConfig()
              if (!config?.accessToken) {
                throw new Error('Thingiverse token not found. Please authorize in admin settings.')
              }
              try {
                await ThingiverseOAuthManager.saveConfig(config)
                console.log('[ScraperManager] Thingiverse token confirmed and re-synced with backend')
              } catch (err) {
                console.error('[ScraperManager] Thingiverse token re-save failed:', err)
                throw new Error('Thingiverse token could not be saved. Please re-authorize in admin settings.')
              }
            }

            // Call backend API to trigger scraper (backend will get tokens from database)
            await APIService.triggerScraper(source, testMode, testMode ? 5 : undefined)
            
            // Wait a bit for scraping to complete
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Fetch updated products
            const allProducts = await APIService.getAllProducts()
            const sourceProducts = allProducts.filter(p => p.source === source)
            
            const endTime = Date.now()
            const duration = endTime - startTime
            
            setDebugInfo(prev => prev.map((info) => 
              info.source === source ? { 
                ...info, 
                status: 'success', 
                productsFound: sourceProducts.length,
                duration,
                startTime,
                endTime,
                productsData: sourceProducts
              } : info
            ))
            
            return { source, products: sourceProducts, error: null }
          } catch (error) {
            const endTime = Date.now()
            const duration = endTime - startTime
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorStack = error instanceof Error ? error.stack : undefined
            
            setDebugInfo(prev => prev.map((info) => 
              info.source === source ? { 
                ...info, 
                status: 'error', 
                error: `${errorMessage}${errorStack ? '\n\nStack:\n' + errorStack : ''}`,
                duration,
                startTime,
                endTime
              } : info
            ))
            
            return { source, products: [], error: errorMessage }
          }
        })
      )
      
      const allProducts = results.flatMap(r => r.products)
      
      toast.info(`Found ${allProducts.length} products from external sources${testMode ? ' (test mode)' : ''}`)
      
      // Refresh product list to show scraped results
      const refreshedProducts = await APIService.getAllProducts()
      onProductsUpdate(refreshedProducts)
      
      toast.success(`Scraping complete${testMode ? ' (test mode)' : ''}!`)
    } catch (error) {
      console.error('Scraper error:', error)
      toast.error('Failed to run scraper')
    } finally {
      setScraping(false)
    }
  }

  // Halting scraper removed - backend manages scraper lifecycle

  const handleExportDebugLogs = () => {
    if (debugInfo.length === 0) {
      toast.error('No debug information to export')
      return
    }

    const timestamp = new Date().toISOString()
    const logData = {
      exportedAt: timestamp,
      scrapers: debugInfo.map(info => ({
        source: info.source,
        status: info.status,
        productsFound: info.productsFound,
        duration: info.duration,
        startTime: info.startTime ? new Date(info.startTime).toISOString() : null,
        endTime: info.endTime ? new Date(info.endTime).toISOString() : null,
        error: info.error || null,
        products: info.productsData || []
      })),
      summary: {
        totalProducts: debugInfo.reduce((sum, info) => sum + info.productsFound, 0),
        successfulScrapers: debugInfo.filter(info => info.status === 'success').length,
        failedScrapers: debugInfo.filter(info => info.status === 'error').length,
        totalDuration: debugInfo.reduce((sum, info) => sum + (info.duration || 0), 0)
      }
    }

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraper-debug-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Debug logs exported successfully')
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      type: product.type,
      source: product.source,
      sourceUrl: product.sourceUrl,
      description: product.description,
      tags: product.tags,
    })
  }

  /**
   * Handle product edit save
   * Updates product and tracks who made the edit with timestamp
   */
  const handleSaveEdit = () => {
    if (!editingProduct) return
    
    // Update the product with admin metadata
    const updatedProducts = products.map(p => 
      p.id === editingProduct.id 
        ? { 
            ...p, 
            ...editForm,
            lastEditedAt: Date.now(), // Track when edit occurred
            lastEditedBy: 'admin', // Track that admin made the edit
          }
        : p
    )
    
    onProductsUpdate(updatedProducts)
    setEditingProduct(null)
    setEditForm({})
    toast.success('Product updated successfully')
  }

  const handleDeleteProduct = async (productId: string) => {
    console.log('[ScraperManager.handleDeleteProduct] Delete clicked for product:', productId)
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        console.log('[ScraperManager.handleDeleteProduct] Calling APIService.deleteProduct...')
        await APIService.deleteProduct(productId)
        console.log('[ScraperManager.handleDeleteProduct] API call successful, updating local state')
        
        const updatedProducts = products.filter(p => p.id !== productId)
        onProductsUpdate(updatedProducts)
        toast.success('Product deleted')
      } catch (error) {
        console.error('[ScraperManager.handleDeleteProduct] Failed to delete product:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.error(`Failed to delete product: ${errorMessage}`)
      }
    } else {
      console.log('[ScraperManager.handleDeleteProduct] Delete cancelled')
    }
  }

  const handleToggleBan = async (product: Product) => {
    if (!canBan) {
      toast.error('Only moderators or admins can ban products')
      return
    }

    try {
      if (product.banned) {
        const updated = await APIService.unbanProduct(product.id)
        if (updated) {
          onProductsUpdate(products.map(p => (p.id === product.id ? updated : p)))
          toast.success(`Unbanned product: ${product.name}`)
        }
      } else {
        const reason = `Banned by ${role}`
        const updated = await APIService.banProduct(product.id, reason, currentUserId)
        if (updated) {
          onProductsUpdate(products.map(p => (p.id === product.id ? updated : p)))
          toast.success(`Banned product: ${product.name}`)
        }
      }
    } catch (error) {
      console.error('Failed to toggle ban:', error)
      toast.error('Failed to update ban status')
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const loadSearchTerms = async (platform: 'github' | 'thingiverse' | 'ravelry') => {
    setLoadingSearchTerms(true)
    try {
      const response = await APIService.getScraperSearchTerms(platform)
      const terms = (response as any).searchTerms ?? (response as any).search_terms ?? []
      const list = Array.isArray(terms) ? terms : []
      if (platform === 'github') setGithubSearchTerms(list)
      if (platform === 'thingiverse') setThingiverseSearchTerms(list)
      if (platform === 'ravelry') setRavelrySearchTerms(list)
    } catch (error) {
      console.error('Failed to load search terms:', error)
      toast.error('Failed to load search terms')
    } finally {
      setLoadingSearchTerms(false)
    }
  }

  const handleAddSearchTerm = async () => {
    const trimmed = newSearchTerm.trim()
    if (!trimmed) {
      toast.error('Search term cannot be empty')
      return
    }
    const currentList = activePlatform === 'github' ? githubSearchTerms : activePlatform === 'thingiverse' ? thingiverseSearchTerms : ravelrySearchTerms
    if (currentList.includes(trimmed)) {
      toast.error('This search term already exists')
      return
    }
    if (trimmed.length > 100) {
      toast.error('Search term must be 100 characters or less')
      return
    }
    
    try {
      console.debug('[ScraperManager] Adding search term', { platform: activePlatform, term: trimmed })
      await APIService.addScraperSearchTerm(activePlatform, trimmed)
      // Reload from backend to reflect updated list
      await loadSearchTerms(activePlatform)
      setNewSearchTerm('')
      toast.success('Search term added')
    } catch (error) {
      const status = (error as any)?.status
      const detail = (error as any)?.data || (error as any)?.message || error
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
      console.error('Failed to add search term:', { platform: activePlatform, error })
      toast.error(`Failed to add search term${status ? ` (HTTP ${status})` : ''}: ${message}`)
    }
  }

  const handleRemoveSearchTerm = async (term: string) => {
    const currentList = activePlatform === 'github' ? githubSearchTerms : activePlatform === 'thingiverse' ? thingiverseSearchTerms : ravelrySearchTerms
    const updatedTerms = currentList.filter(t => t !== term)
    if (updatedTerms.length === 0) {
      toast.error('Cannot remove all search terms')
      return
    }
    
    try {
      const response = await APIService.updateScraperSearchTerms(activePlatform, updatedTerms)
      const terms = (response as any).searchTerms ?? (response as any).search_terms ?? []
      const list = Array.isArray(terms) ? terms : []
      if (activePlatform === 'github') setGithubSearchTerms(list)
      if (activePlatform === 'thingiverse') setThingiverseSearchTerms(list)
      if (activePlatform === 'ravelry') setRavelrySearchTerms(list)
      toast.success('Search term removed')
    } catch (error) {
      console.error('Failed to remove search term:', error)
      toast.error('Failed to remove search term')
    }
  }

  const handleOpenSearchTermsDialog = (platform: 'github' | 'thingiverse' | 'ravelry') => {
    setActivePlatform(platform)
    setNewSearchTerm('')
    loadSearchTerms(platform)
    setShowSearchTermsDialog(true)
  }

  // Filter products by source without normalization
  const scrapedProducts = products.filter(p => {
    const src = p.source || ''
    return ['Ravelry', 'Thingiverse', 'GitHub'].some(key => src === key || src === `scraped-${key}` || src.includes(key))
  })
  const userProducts = products.filter(p => (p.source || '') === 'User-Submitted')

  const renderSearchTerms = () => {
    const terms = activePlatform === 'github' ? githubSearchTerms : activePlatform === 'thingiverse' ? thingiverseSearchTerms : ravelrySearchTerms
    return (
      <div className="space-y-2">
        {loadingSearchTerms ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <CircleNotch size={16} weight="bold" className="animate-spin" />
            <span>Loading search terms...</span>
          </div>
        ) : terms.length === 0 ? (
          <p className="text-gray-500">No search terms configured.</p>
        ) : (
          terms.map(term => (
            <div key={term} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
              <span>{term}</span>
              <button
                onClick={() => handleRemoveSearchTerm(term)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Remove search term ${term}`}
              >
                <Trash size={16} weight="bold" />
              </button>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderPlatformLabel = () => {
    if (activePlatform === 'github') return 'GitHub'
    if (activePlatform === 'thingiverse') return 'Thingiverse'
    return 'Ravelry'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>External Product Scraper</CardTitle>
          <CardDescription>
            Automatically import accessibility products from Thingiverse, Ravelry, and GitHub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {lastScrape ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={16} />
                    Last scraped: {formatDate(lastScrape)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={16} />
                    {scrapedProducts.length} scraped products in database
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No scraping has been performed yet
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleRunScraper(undefined, true)} 
                disabled={scraping}
                variant="outline"
                className="flex items-center gap-2"
              >
                {scraping ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Test Scrape (5 products)
                  </>
                )}
              </Button>
              <Button 
                onClick={() => handleRunScraper()} 
                disabled={scraping}
                className="flex items-center gap-2"
              >
                {scraping ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Run All Scrapers
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Run Individual Scrapers:</p>
              <div className="flex flex-wrap gap-2">
                {knownSources
                  .filter(source => source.toLowerCase() !== 'user-submitted')
                  .map(source => {
                    const sourceLower = source.toLowerCase()
                    const hasSearchTerms = ['github', 'thingiverse', 'ravelry'].includes(sourceLower)
                    
                    return (
                      <div key={source} className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunScraper(sourceLower)}
                          disabled={scraping}
                          className="flex items-center gap-2"
                        >
                          <Play size={16} />
                          {formatSourceLabel(source)}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunScraper(sourceLower, true)}
                          disabled={scraping}
                          className="flex items-center gap-2 text-xs"
                          title="Test with 5 products"
                        >
                          Test
                        </Button>
                        {hasSearchTerms && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSearchTermsDialog(sourceLower as 'github' | 'thingiverse' | 'ravelry')}
                            className="flex items-center gap-2 text-xs"
                            title="Configure search terms"
                          >
                            <Gear size={16} />
                          </Button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              The scraper runs automatically every 24 hours. When existing products are found, 
              their tags will be merged with newly discovered tags. All scraped products can be 
              edited by admins. Use "Test Scrape" to try the scraper with just 5 products before running a full scrape.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scraper Debug Info</CardTitle>
              <CardDescription>Real-time status for each scraper platform</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportDebugLogs}
                disabled={debugInfo.length === 0}
                className="flex items-center gap-2"
              >
                <DownloadSimple size={18} />
                Export Logs
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
              >
                <Bug size={18} className="mr-2" />
                {showDebug ? 'Hide' : 'Show'} Debug
              </Button>
            </div>
          </div>
        </CardHeader>
        {showDebug && (
          <CardContent>
            {debugInfo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run the scraper to see debug information
              </p>
            ) : (
              <div className="space-y-3">
                {debugInfo.map((info, idx) => (
                  <div 
                    key={info.source} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        {info.status === 'pending' && (
                          <HourglassHigh size={20} className="text-muted-foreground" />
                        )}
                        {info.status === 'running' && (
                          <CircleNotch size={20} className="animate-spin text-primary" />
                        )}
                        {info.status === 'success' && (
                          <CheckCircle size={20} className="text-green-600" weight="fill" />
                        )}
                        {info.status === 'error' && (
                          <XCircle size={20} className="text-destructive" weight="fill" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{info.source}</div>
                          {info.status === 'success' && (
                            <div className="text-sm text-muted-foreground">
                              Found {info.productsFound} product{info.productsFound !== 1 ? 's' : ''} 
                              {info.duration && ` in ${(info.duration / 1000).toFixed(1)}s`}
                            </div>
                          )}
                          {info.status === 'error' && (
                            <div className="text-sm text-destructive whitespace-pre-wrap font-mono text-xs mt-1">
                              {info.error}
                            </div>
                          )}
                          {info.status === 'running' && (
                            <div className="text-sm text-muted-foreground">
                              Scraping...
                            </div>
                          )}
                          {info.status === 'pending' && (
                            <div className="text-sm text-muted-foreground">
                              Waiting...
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={
                          info.status === 'success' ? 'default' : 
                          info.status === 'error' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {info.status}
                      </Badge>
                    </div>
                    
                    {info.status === 'success' && info.productsData && info.productsData.length > 0 && (
                      <div className="border-t bg-muted/30 p-4">
                        <div className="text-sm font-medium mb-3">Sample Scraped Data:</div>
                        <div className="space-y-3">
                          {info.productsData.slice(0, 3).map((product, pIdx) => (
                            <div key={pIdx} className="bg-card p-3 rounded border text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="font-semibold text-muted-foreground">Name:</span>
                                  <div className="font-medium mt-0.5">{product.name}</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">Type:</span>
                                  <div className="font-medium mt-0.5">{product.type}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className="font-semibold text-muted-foreground">ID:</span>
                                  <div className="font-mono mt-0.5">{product.id}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className="font-semibold text-muted-foreground">Description:</span>
                                  <MarkdownText
                                    text={product.description}
                                    className="mt-0.5 line-clamp-2"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <span className="font-semibold text-muted-foreground">Tags:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {product.tags.map((tag: string, tagIdx: number) => (
                                      <Badge key={tagIdx} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                {product.sourceUrl && (
                                  <div className="col-span-2">
                                    <span className="font-semibold text-muted-foreground">Source URL:</span>
                                    <div className="font-mono mt-0.5 truncate text-primary">
                                      {product.sourceUrl}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {info.productsData.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              ... and {info.productsData.length - 3} more product{info.productsData.length - 3 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage by Source</CardTitle>
          <CardDescription>Delete all products from a specific source</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Display dynamic cards for each source with delete capability */}
          <div className="space-y-3">
            {allSources.map((src) => {
              const count = remoteCounts[src] ?? 0
              return (
                <div key={src} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{formatSourceLabel(src)}</div>
                    <div className="text-sm text-muted-foreground">{count} product{count !== 1 ? 's' : ''}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSourceToDelete(src)
                      setDeleteSourceDialog(true)
                    }}
                    disabled={count === 0}
                  >
                    <Trash size={16} className="mr-1" />
                    Delete All
                  </Button>
                </div>
              )
            })}

            {/* User-submitted products section */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">User-Submitted</div>
                <div className="text-sm text-muted-foreground">{userProducts.length} product{userProducts.length !== 1 ? 's' : ''}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSourceToDelete('user-submitted')
                  setDeleteSourceDialog(true)
                }}
                disabled={userProducts.length === 0}
              >
                <Trash size={16} className="mr-1" />
                Delete All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scraped Products ({scrapedProducts.length})</CardTitle>
          <CardDescription>Manage products imported from external sources</CardDescription>
        </CardHeader>
        <CardContent>
          {scrapedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Download size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No scraped products yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Run the scraper to import products from external sources
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[280px]">{product.name}</span>
                          {product.banned && (
                            <Badge variant="destructive" className="text-xs">Banned</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatSourceLabel(product.source)}</Badge>
                      </TableCell>
                      <TableCell>{product.type}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {product.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {product.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Pencil size={16} />
                          </Button>
                          {canBan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBan(product)}
                              title={product.banned ? 'Unban product' : 'Ban product'}
                            >
                              {product.banned ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.slug || product.id)}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User-Submitted Products ({userProducts.length})</CardTitle>
          <CardDescription>Manage products added by community members</CardDescription>
        </CardHeader>
        <CardContent>
          {userProducts.length === 0 ? (
            <div className="text-center py-12">
              <Download size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No user-submitted products yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Community members can submit products through the product submission form
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[280px]">{product.name}</span>
                          {product.banned && (
                            <Badge variant="destructive" className="text-xs">Banned</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.type}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(product.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(product.tags || []).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(product.tags || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Pencil size={16} />
                          </Button>
                          {canBan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBan(product)}
                              title={product.banned ? 'Unban product' : 'Ban product'}
                            >
                              {product.banned ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.slug || product.id)}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog for bulk delete by source */}
      <AlertDialog open={deleteSourceDialog} onOpenChange={setDeleteSourceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(() => {
                const isUser = (sourceToDelete || '') === 'User-Submitted'
                const label = isUser ? 'User-Submitted' : formatSourceLabel(sourceToDelete || '')
                return <>Delete all products from {label}?</>
              })()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const isUser = (sourceToDelete || '') === 'User-Submitted'
                if (isUser) {
                  return (
                    <>This will permanently delete all user-submitted products. This action cannot be undone.</>
                  )
                }
                const matchName = (sourceToDelete || '').replace(/^scraped-/, '')
                return (
                  <>This will permanently delete all {formatSourceLabel(sourceToDelete || '')} products. This action cannot be undone.</>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!sourceToDelete) {
                  console.error('No source specified for deletion')
                  toast.error('No source specified')
                  return
                }
                
                try {
                  if (sourceToDelete === 'User-Submitted') {
                    const productsToDelete = products.filter(p => p.submittedBy !== 'system')
                    
                    await Promise.all(
                      productsToDelete.map(p => APIService.deleteProduct(p.slug || p.id))
                    )
                    
                    const updatedProducts = products.filter(p => p.submittedBy === 'system')
                    onProductsUpdate(updatedProducts)
                    toast.success('Deleted products from selected source')
                  } else {
                    const matchName = (sourceToDelete || '').replace(/^scraped-/, '')
                    const productsToDelete = products.filter(p => typeof p.source === 'string' && p.source === matchName)
                    const count = productsToDelete.length
                    
                    if (count === 0) {
                      toast.info('No products found for selected source')
                      setDeleteSourceDialog(false)
                      setSourceToDelete(null)
                      return
                    }
                    
                    console.log(`[ScraperManager] Deleting ${count} products from source: ${sourceToDelete}`)
                    
                    try {
                      const result = await APIService.deleteProductsBySource(sourceToDelete)
                      console.log(`[ScraperManager] ✅ Bulk delete SUCCESS - Backend deleted ${result.deletedCount} products, reloading all products...`)
                      
                      // Reload ALL products from backend to reflect the deletion
                      // The backend deleted everything, but we only had a paginated subset
                      try {
                        const allProducts = await APIService.getAllProducts({ includeBanned: true })
                        onProductsUpdate(allProducts)
                        toast.success('Deleted products from selected source')
                      } catch (reloadError) {
                        console.warn('[ScraperManager] Failed to reload products, using local filter:', reloadError)
                        // Fallback: filter locally if reload fails
                        const updatedProducts = products.filter(p => !(typeof p.source === 'string' && p.source === matchName))
                        onProductsUpdate(updatedProducts)
                        toast.success('Deleted products from selected source')
                      }
                    } catch (apiError) {
                      console.error('❌ [ScraperManager] API deleteProductsBySource FAILED, falling back to individual deletes')
                      console.error('Error details:', apiError)
                      console.error('Error message:', apiError instanceof Error ? apiError.message : String(apiError))
                      console.error('Full error object:', JSON.stringify(apiError, null, 2))
                      
                      await Promise.all(
                        productsToDelete.map(p => APIService.deleteProduct(p.slug || p.id))
                      )
                      
                      const updatedProducts = products.filter(p => !(typeof p.source === 'string' && p.source === matchName))
                      onProductsUpdate(updatedProducts)
                      toast.success('Deleted products from selected source')
                    }
                  }
                  setDeleteSourceDialog(false)
                  setSourceToDelete(null)
                } catch (error) {
                  console.error('Error deleting products:', error)
                  toast.error('Failed to delete products. Please try again.')
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information and tags
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Input
                id="edit-type"
                value={editForm.type || ''}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source">Source</Label>
              <Input
                id="edit-source"
                value={editForm.source || ''}
                onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-url">Source URL</Label>
              <Input
                id="edit-url"
                value={editForm.sourceUrl || ''}
                onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editForm.tags?.join(', ') || ''}
                onChange={(e) => 
                  setEditForm({ 
                    ...editForm, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Terms Dialog */}
      <Dialog open={showSearchTermsDialog} onOpenChange={setShowSearchTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{renderPlatformLabel()} Search Terms</DialogTitle>
            <DialogDescription>
              Manage the search terms used to discover accessibility projects on {renderPlatformLabel()}. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {loadingSearchTerms ? (
              <div className="flex items-center justify-center py-8">
                <CircleNotch size={24} className="animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>
                    Current Search Terms (
                    {activePlatform === 'github'
                      ? githubSearchTerms.length
                      : activePlatform === 'thingiverse'
                        ? thingiverseSearchTerms.length
                        : ravelrySearchTerms.length
                    }
                    )
                  </Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
                    {renderSearchTerms()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-search-term">Add New Search Term</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-search-term"
                      value={newSearchTerm}
                      onChange={(e) => setNewSearchTerm(e.target.value)}
                      placeholder="e.g., assistive technology"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSearchTerm()
                        }
                      }}
                    />
                    <Button onClick={handleAddSearchTerm} size="sm">
                      <Plus size={16} className="mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchTermsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
