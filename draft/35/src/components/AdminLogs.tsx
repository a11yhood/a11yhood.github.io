/**
 * AdminLogs - Authorization and scraping logs page
 * 
 * Features:
 * - OAuth authorization management for Ravelry and Thingiverse
 * - OAuth diagnostics and flow logs
 * - Scraping activity logs with success/error tracking
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrapingLog, Product } from '@/lib/types'
import { APIService } from '@/lib/api'
import { formatSourceLabel } from '@/lib/utils'
import { Package, CheckCircle, WarningCircle, CircleNotch, CaretDown, CaretRight } from '@phosphor-icons/react'
import { RavelrySettings } from '@/components/RavelrySettings'
import { RavelryOAuthDiagnostics } from '@/components/RavelryOAuthDiagnostics'
import { ThingiverseSettings } from '@/components/ThingiverseSettings'

type AdminLogsProps = {
  products: Product[]
  onProductsUpdate: (products: Product[]) => void
  ravelryAuthTimestamp: number
}

export function AdminLogs({ products, onProductsUpdate, ravelryAuthTimestamp }: AdminLogsProps) {
  const navigate = useNavigate()
  const [scrapingLogs, setScrapingLogs] = useState<ScrapingLog[]>([])
  const [loading, setLoading] = useState(true)
  // Collapsible sections handled by CollapsibleCard

  useEffect(() => {
    loadScrapingLogs()
  }, [])

  const loadScrapingLogs = async () => {
    setLoading(true)
    try {
      const logs = await APIService.getScrapingLogs(50)
      setScrapingLogs(logs)
    } catch (error) {
      // Silently handle 404 for scraping logs endpoint (not yet implemented)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to load scraping logs:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-2">
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">Authorization & Logs</h1>
          <p className="text-muted-foreground mt-1">
            Manage scraper authorizations and view scraping activity logs
          </p>
        </div>
      </div>

      {/* Authorization Settings */}
      <CollapsibleCard
        title="Authorization Settings"
        description="Manage Ravelry and Thingiverse OAuth credentials"
        defaultOpen
      >
        <div className="space-y-6">
          <RavelrySettings 
            products={products}
            onProductsUpdate={onProductsUpdate}
            onAuthComplete={() => loadScrapingLogs()}
            ravelryAuthTimestamp={ravelryAuthTimestamp}
            key={ravelryAuthTimestamp}
          />
          <ThingiverseSettings 
            products={products}
            onProductsUpdate={onProductsUpdate}
            onAuthComplete={() => loadScrapingLogs()}
          />
        </div>
      </CollapsibleCard>

      {/* OAuth Diagnostics */}
      <CollapsibleCard title="OAuth Diagnostics" defaultOpen>
        <RavelryOAuthDiagnostics />
      </CollapsibleCard>

      {/* Scraping Logs */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Scraping Logs</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CircleNotch size={48} className="animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading scraping logs...</p>
            </div>
          </div>
        ) : (
          <CollapsibleCard
            title="Scraping Activity"
            description="View history of automated product scraping sessions"
            defaultOpen
          >
              {scrapingLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No scraping logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scrapingLogs.map((log) => (
                    <Card key={log.id} className="border">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {log.status === 'success' ? (
                                <CheckCircle size={24} className="text-green-600" />
                              ) : (
                                <WarningCircle size={24} className="text-amber-600" />
                              )}
                              <div>
                                <div className="font-medium">
                                  {new Date(log.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Completed in {log.duration}ms
                                </div>
                              </div>
                            </div>
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.status === 'success' ? 'Success' : 'Error'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{log.totalProductsScraped}</div>
                              <div className="text-xs text-muted-foreground">Total Scraped</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{log.productsAdded}</div>
                              <div className="text-xs text-muted-foreground">Added</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{log.productsUpdated}</div>
                              <div className="text-xs text-muted-foreground">Updated</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{Object.keys(log.productsPerSource).length}</div>
                              <div className="text-xs text-muted-foreground">Sources</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Breakdown by Source:</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(log.productsPerSource).map(([source, count]) => (
                                <div key={source} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                  <span>{formatSourceLabel(source)}</span>
                                  <Badge variant="outline">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          {log.errors.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="text-sm font-medium text-amber-700">Errors:</div>
                              <ul className="text-sm text-amber-700 space-y-1 bg-amber-50 p-3 rounded">
                                {log.errors.map((error, idx) => (
                                  <li key={idx}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CollapsibleCard>
        )}
      </div>
    </div>
  )
}
