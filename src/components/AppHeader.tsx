import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { UserCircle, SignOut, ChartBar, Users, FileText, MagnifyingGlass } from '@phosphor-icons/react'
import { ProductSubmission, ProductSubmissionRef } from '@/components/ProductSubmission'
import { RequestSourceDialog } from '@/components/RequestSourceDialog'
import { UserData, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { toast } from 'sonner'
import logoImage from '@/assets/images/ahood-small.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faNewspaper } from '@fortawesome/free-solid-svg-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * AppHeader – Global navigation header for the application.
 *
 * Renders the site logo, primary navigation (Collections, Blog), and a user menu.
 * The user menu exposes account/profile links and, for admins/moderators, admin routes.
 * Also includes product submission for authenticated users.
 *
 * @param user - Authenticated GitHub user data or null when signed out
 * @param userAccount - Application user account with role/username metadata or null
 * @param pendingRequestsCount - Count of pending moderation requests to display as a badge
 * @param onLogin - Handler to trigger login flow
 * @param onLogout - Handler to sign the user out
 * @param onProductCreated - Optional callback invoked after a successful product submission
 */
export function AppHeader({ user, userAccount, pendingRequestsCount, onLogin, onLogout, onProductCreated }: {
  user: UserData | null
  userAccount: UserAccount | null
  pendingRequestsCount: number
  onLogin: () => void
  onLogout: () => void
  onProductCreated?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const devMode = import.meta.env.VITE_DEV_MODE === 'true'
  const canAccessAdmin = (userAccount?.role === 'admin' || userAccount?.role === 'moderator')
  const [requestSource, setRequestSource] = useState<{ domain: string; url?: string } | null>(null)
  const productSubmissionRef = useRef<ProductSubmissionRef>(null)

  // Listen for unsupported domain events from ProductSubmission
  useEffect(() => {
    const handleUnsupportedDomain = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { domain, url } = customEvent.detail || {}
      
      // Check if user already has a pending request for this domain
      if (user?.id) {
        try {
          const pendingRequests = await APIService.getMyRequests('pending', 'source-domain')
          const existingRequest = pendingRequests.find(req => 
            req.reason?.toLowerCase().includes(domain.toLowerCase())
          )
          
          if (existingRequest) {
            toast.info(
              `You already have a pending request for "${domain}". A moderator will review it soon.`,
              { duration: 5000 }
            )
            return
          }
        } catch (error) {
          console.error('Error checking existing requests:', error)
          // Continue to show dialog if check fails
        }
      }
      
      // Keep submission dialog open so users see the inline error before requesting a new source
      setRequestSource({ domain, url })
      toast.info(
        `The domain "${domain}" is not yet in our allowed sources. Would you like to request it?`,
        { duration: 5000 }
      )
    }

    window.addEventListener('unsupported-domain', handleUnsupportedDomain)
    return () => window.removeEventListener('unsupported-domain', handleUnsupportedDomain)
  }, [user?.id])

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm h-[60px]">
      <nav aria-label="Primary navigation" className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex items-center justify-between gap-4 h-full bg-(--color-bg)">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded flex items-center flex-shrink-0"
              title="a11yhood Home"
            >
              <img src={logoImage} alt="a11yhood" className="h-[18px] w-auto flex-shrink-0" />
            </button>
            <Link
              to="/about"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname.startsWith('/about') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <FileText size={18} />
              <span className="hidden sm:inline">About</span>
            </Link>
            <Link
              to="/blog"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname.startsWith('/blog') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faNewspaper} className="w-[18px] h-[18px]" />
              <span className="hidden sm:inline">News</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {devMode && (
              <span
                className="hidden sm:inline px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-900 border border-amber-300"
              >
                Dev Mode
              </span>
            )}
            <Link
              to="/collections"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname.startsWith('/collections') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="w-[18px] h-[18px]" />
              <span className="hidden sm:inline">Collections</span>
            </Link>
            <Link
              to="/products"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname.startsWith('/products') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              aria-label="Search products"
            >
              <MagnifyingGlass size={18} />
              <span className="hidden sm:inline">Search</span>
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <ProductSubmission ref={productSubmissionRef} user={user} onSubmit={async (productData) => {
                  try {
                    const newProduct = await APIService.createProduct({
                      ...productData,
                      submittedBy: user.id,
                      source: 'user-submitted',
                    })
                    APIService.logUserActivity({
                      userId: user.id,
                      type: 'product_submit',
                      productId: newProduct.id,
                      timestamp: Date.now(),
                    })
                    toast.success('Product submitted successfully! You are now an editor of this product.')
                    onProductCreated?.()
                    navigate('/')
                  } catch (error) {
                    // Check if this is an unsupported domain error
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    if (errorMessage.includes('URL domain is not supported')) {
                      // Extract the domain from the URL
                      const url = productData.sourceUrl
                      if (url) {
                        try {
                          const domain = new URL(url).hostname
                          setRequestSourceDomain(domain)
                          toast.info(
                            `The domain "${domain}" is not yet in our allowed sources. Would you like to request it?`,
                            { duration: 5000 }
                          )
                        } catch {
                          toast.error('Invalid URL format')
                        }
                      }
                    } else {
                      toast.error(errorMessage || 'Failed to submit product')
                    }
                  }
                }} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      aria-label="User menu"
                    >
                      <UserCircle size={18} />
                      <span className="hidden sm:inline">{userAccount?.username || user.login}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Signed in as {userAccount?.username || user.login}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate(`/account/${userAccount?.username || user.email}`)}>
                      <UserCircle size={16} className="mr-2" />
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/profile/${userAccount?.username || user.email}`)}>
                      <UserCircle size={16} className="mr-2" />
                      Public Profile
                    </DropdownMenuItem>
                    {canAccessAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => navigate('/admin')} className="flex items-center">
                          <ChartBar size={16} className="mr-2" />
                          {userAccount?.role === 'admin' ? 'Admin Panel' : 'Moderate'}
                          {pendingRequestsCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-2 py-[2px]">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </DropdownMenuItem>
                        {userAccount?.role === 'admin' && (
                          <>
                            <DropdownMenuItem onSelect={() => navigate('/admin/users')}>
                              <Users size={16} className="mr-2" />
                              Users & Stats
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate('/admin/logs')}>
                              <FileText size={16} className="mr-2" />
                              Logs
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
                      <SignOut size={16} className="mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={onLogin} size="sm">
                <UserCircle size={20} className="mr-2" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </nav>

      {requestSource && (
        <RequestSourceDialog
          open={!!requestSource}
          onOpenChange={(open) => {
            if (!open) {
              setRequestSource(null)
              // Also close ProductSubmission dialog when RequestSourceDialog closes
              productSubmissionRef.current?.close()
            }
          }}
          domain={requestSource.domain}
          url={requestSource.url}
          userId={user?.id}
          userName={userAccount?.username || user?.login}
          userAvatarUrl={userAccount?.avatarUrl || user?.avatarUrl}
        />
      )}
    </header>
  )
}
