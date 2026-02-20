import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChatCircle } from '@phosphor-icons/react'
import { LoginPrompt } from './LoginPrompt'
import { Discussion, UserAccount, UserData } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Label } from '@/components/ui/label'

type DiscussionSectionProps = {
  discussions: Discussion[]
  user: UserData | null
  userAccount?: UserAccount | null
  onDiscuss: (content: string, parentId?: string) => void
  onEditDiscussion?: (id: string, content: string) => void
  onDeleteDiscussion?: (id: string) => void
  onToggleBlockDiscussion?: (id: string, block: boolean) => void
}

type DiscussionItemProps = {
  discussion: Discussion
  replies: Discussion[]
  replyingTo: string | null
  user: UserData | null
  userAccount?: UserAccount | null
  onToggleReply: (id: string | null) => void
  onChangeReply: (id: string, value: string) => void
  getReplyValue: (id: string) => string
  onSubmitReply: (id: string) => void
  isSubmitting: boolean
  setReplyRef: (id: string, el: HTMLTextAreaElement | null) => void
  getReplies: (id: string) => Discussion[]
  onDeleteDiscussion?: (id: string) => void
  onToggleBlockDiscussion?: (id: string, block: boolean) => void
  onEditDiscussion?: (id: string, content: string) => Promise<void> | void
}

function DiscussionItem({
  discussion,
  replies,
  replyingTo,
  user,
  userAccount,
  onToggleReply,
  onChangeReply,
  getReplyValue,
  onSubmitReply,
  isSubmitting,
  setReplyRef,
  getReplies,
  onDeleteDiscussion,
  onToggleBlockDiscussion,
  onEditDiscussion,
}: DiscussionItemProps) {
  const isReplying = replyingTo === discussion.id
  const canModerate = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
  const isOwner = user?.id ? discussion.userId === user.id : false
  const isDeleted = discussion.content === '[deleted]'
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const displayName = discussion.username || 'Unknown User'
  const avatarFallback = discussion.username && discussion.username.length >= 2
    ? discussion.username.slice(0, 2).toUpperCase()
    : 'UU'

  const showBlocked = discussion.blocked && (isOwner || canModerate)
  return (
    <li className="space-y-3">
      <Card className={`p-6${showBlocked ? ' bg-red-100 border-red-400' : ''}`}>
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={`https://github.com/${discussion.username}.png`} />
            <AvatarFallback>
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{displayName}</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(discussion.createdAt, { addSuffix: true })}
              </span>
            </div>
            {isEditing ? (
              <div className="space-y-2 mb-3">
                <label className="sr-only">
                  Edit post
                  <Textarea
                    id={`edit-${discussion.id}`}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (!onEditDiscussion) {
                        setIsEditing(false)
                        return
                      }
                        const trimmed = editDraft.trim()
                        if (!trimmed) {
                          setEditError('Post cannot be empty')
                          return
                        }
                      try {
                        setIsSavingEdit(true)
                          setEditError(null)
                        await onEditDiscussion(discussion.id, trimmed)
                        setIsEditing(false)
                      } catch (err: any) {
                        setEditError(err?.message || 'Failed to save. Please try again.')
                      } finally {
                        setIsSavingEdit(false)
                      }
                    }}
                    disabled={!editDraft.trim() || isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false)
                      setEditDraft(discussion.content)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {editError && (
                  <p className="text-sm text-destructive">{editError}</p>
                )}
              </div>
            ) : (
              <p className="text-base leading-relaxed whitespace-pre-wrap mb-3">
                {discussion.content}
              </p>
            )}
            {showBlocked && (
              <span className="inline-block text-xs text-destructive font-medium mb-2">
                This post is blocked{discussion.blockedReason ? `: ${discussion.blockedReason}` : ''}
              </span>
            )}
            {user && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleReply(isReplying ? null : discussion.id)}
                className="text-sm"
              >
                <ChatCircle size={16} className="mr-1" />
                Reply
              </Button>
            )}
            <div className="mt-2 flex gap-2">
              {isOwner && !isDeleted && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Edit message"
                    onClick={() => {
                      setIsEditing(true)
                      setEditDraft(discussion.content)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeleteDiscussion && onDeleteDiscussion(discussion.id)}
                    aria-label="Delete message"
                  >
                    Delete
                  </Button>
                </>
              )}
              {canModerate && (
                <Button
                  type="button"
                  size="sm"
                  variant={discussion.blocked ? 'secondary' : 'outline'}
                  onClick={() => onToggleBlockDiscussion && onToggleBlockDiscussion(discussion.id, !discussion.blocked)}
                  aria-label={discussion.blocked ? 'Unblock post' : 'Block post'}
                >
                  {discussion.blocked ? 'Unblock' : 'Block'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {isReplying && (
        <div className="ml-12 mt-2">
          <Card className="p-4">
            <label className="sr-only">
              Reply content
              <Textarea
                id={`reply-${discussion.id}`}
                placeholder="Write your reply..."
                value={getReplyValue(discussion.id)}
                onChange={(e) => onChangeReply(discussion.id, e.target.value)}
                ref={(el) => setReplyRef(discussion.id, el)}
                autoFocus
              rows={3}
              className="resize-none mb-2"
              aria-label="Reply content"
            />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onSubmitReply(discussion.id)}
                disabled={!getReplyValue(discussion.id).trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onToggleReply(null)
                  onChangeReply(discussion.id, '')
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {replies.length > 0 && (
        <ul className="ml-12 mt-4 space-y-4" role="group">
          {replies.map((reply) => (
            <DiscussionItem
              key={reply.id}
              discussion={reply}
              replies={getReplies(reply.id)}
              replyingTo={replyingTo}
              user={user}
              userAccount={userAccount}
              onToggleReply={onToggleReply}
              onChangeReply={onChangeReply}
              getReplyValue={getReplyValue}
              onSubmitReply={onSubmitReply}
              isSubmitting={isSubmitting}
              setReplyRef={setReplyRef}
              getReplies={getReplies}
              onDeleteDiscussion={onDeleteDiscussion}
              onToggleBlockDiscussion={onToggleBlockDiscussion}
              onEditDiscussion={onEditDiscussion}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function DiscussionSection({
  discussions,
  user,
  userAccount,
  onDiscuss,
  onEditDiscussion,
  onDeleteDiscussion,
  onToggleBlockDiscussion,
}: DiscussionSectionProps) {
  const [messageContent, setMessageContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const replyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const [replyContent, setReplyContent] = useState<Record<string, string>>({})

  useEffect(() => {
    if (replyingTo) {
      const el = replyRefs.current[replyingTo]
      if (!el) return
      if (document.activeElement !== el) {
        // Ensure focus when opening the reply box
        el.focus()
        // Place caret at the end of existing text
        try {
          const end = el.value.length
          el.setSelectionRange(end, end)
        } catch {
          // noop: some browsers may not support setSelectionRange on certain inputs
        }
      }
    }
  }, [replyingTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() || !user) return

    setIsSubmitting(true)
    await onDiscuss(messageContent.trim(), undefined)
    setMessageContent('')
    setIsSubmitting(false)
  }

  const handleReply = async (parentId: string) => {
    const content = (replyContent[parentId] || '').trim()
    if (!content || !user) return

    setIsSubmitting(true)
    await onDiscuss(content, parentId)
    setReplyContent((prev) => ({ ...prev, [parentId]: '' }))
    setReplyingTo(null)
    setIsSubmitting(false)
  }

  const topLevelDiscussions = discussions.filter((d) => !d.parentId)
  const canModerate = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
  const isOwnerOf = (d: Discussion) => (user?.id ? d.userId === user.id : false)
  const canSee = (d: Discussion) => !d.blocked || isOwnerOf(d) || !!canModerate
  const getReplies = (parentId: string) =>
    discussions.filter((d) => d.parentId === parentId).filter((d) => canSee(d))
  const visibleDiscussions = discussions.filter((d) => canSee(d))

  // stable helpers for child component props
  const onToggleReply = (id: string | null) => setReplyingTo(id)
  const onChangeReply = (id: string, value: string) => {
    setReplyContent((prev) => ({ ...prev, [id]: value }))
  }
  const getReplyValue = (id: string) => replyContent[id] || ''
  const setReplyRef = (id: string, el: HTMLTextAreaElement | null) => {
    replyRefs.current[id] = el
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Discussion
        </h2>
        <span className="text-sm text-muted-foreground">{visibleDiscussions.length} messages</span>
      </div>

      {!user ? (
        <LoginPrompt context="discuss" />
      ) : (
        <Card className="p-6" aria-labelledby="start-discussion-heading">
          <h3 id="start-discussion-heading" className="text-lg font-semibold mb-4">
            Start a New Thread
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              id="discussion-content"
              aria-label="Start a new thread"
              placeholder="Ask a question or share your thoughts..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {messageContent.length} characters
              </span>
              {(() => {
                const submitLabel = isSubmitting ? 'Posting...' : 'Post'
                return (
                  <Button
                    type="submit"
                    aria-label={submitLabel}
                    disabled={!messageContent.trim() || isSubmitting}
                  >
                    {submitLabel}
                  </Button>
                )
              })()}
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {topLevelDiscussions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No discussions yet. Start the conversation!
            </p>
          </Card>
        ) : (
          <ul className="space-y-6">
            {topLevelDiscussions
              .filter((d) => canSee(d))
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((discussion) => (
                <DiscussionItem
                  key={discussion.id}
                  discussion={discussion}
                  replies={getReplies(discussion.id)}
                  replyingTo={replyingTo}
                  user={user}
                  userAccount={userAccount}
                  onToggleReply={onToggleReply}
                  onChangeReply={onChangeReply}
                  getReplyValue={getReplyValue}
                  onSubmitReply={handleReply}
                  isSubmitting={isSubmitting}
                  setReplyRef={setReplyRef}
                  getReplies={getReplies}
                  onDeleteDiscussion={onDeleteDiscussion}
                  onToggleBlockDiscussion={onToggleBlockDiscussion}
                  onEditDiscussion={onEditDiscussion}
                />
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
