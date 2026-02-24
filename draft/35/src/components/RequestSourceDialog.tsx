import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { APIService } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type RequestSourceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  domain: string
  url?: string
  userId?: string
  userName?: string
  userAvatarUrl?: string
}

/**
 * RequestSourceDialog - Dialog for users to request a new source domain be added.
 * 
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param domain - The domain being requested
 */
export function RequestSourceDialog({ open, onOpenChange, domain, url, userId, userName, userAvatarUrl }: RequestSourceDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { getAccessToken } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for requesting this domain')
      return
    }

    // Get token from auth context
    const token = await getAccessToken()
    if (!token) {
      toast.error('Please sign in to submit a request')
      return
    }

    setSubmitting(true)
    try {
      // Submit minimal payload; backend derives user from Authorization
      const requestBody = {
        type: 'source-domain' as const,
        // Structured message for backend storage/display
        reason: [
          `Domain: ${domain}`,
          url ? `URL: ${url}` : null,
          '',
          `Reason: ${reason.trim()}`,
        ].filter(Boolean).join('\n')
      }

      await APIService.createUserRequest(requestBody as any)

      // Also copy to clipboard as a convenience fallback for sharing
      try {
        const requestMessage = (
          [
            `Domain Request: ${domain}`,
            url ? `URL: ${url}` : null,
            '',
            `Reason: ${reason.trim()}`,
            '',
            '---',
            'Submitted via a11yhood: Please consider adding this domain to supported sources.'
          ].filter(Boolean).join('\n')
        )
        await navigator.clipboard.writeText(requestMessage)
      } catch {}

      toast.success('Request submitted for review. Moderators will see it shortly.')

      setReason('')
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Provide clearer guidance for different error types
      if (message.includes('No authorization header') || message.toLowerCase().includes('unauthorized')) {
        toast.error('Authorization missing. Please sign in and try again.')
      } else if (message.includes('not supported') || message.includes('Unsupported domain')) {
        toast.error(`The domain ${domain} is not currently supported. Your request has been submitted for review.`)
      } else if (message.includes('Internal server error') || message.includes('500')) {
        toast.error('Server error. Your request may not have been submitted. Please try again.')
      } else {
        toast.error('Failed to process request. Please try again.')
      }
      console.error('RequestSourceDialog submit error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request New Source Domain</DialogTitle>
          <DialogDescription>
            Help us support more sources by requesting that <code className="bg-muted px-2 py-1 rounded text-xs">{domain}</code> be added to our allowed sources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain-display" className="text-sm">
              Domain
            </Label>
            <Input
              id="domain-display"
              type="text"
              value={domain}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              Why would you like to submit products from this domain? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Tell us why this domain should be supported. For example: It's a popular platform for accessible products, or I frequently need to submit content from here."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24 resize-none"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
