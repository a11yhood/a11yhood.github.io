import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext'
import { AlertBanner } from '@/components/AlertBanner'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import * as DialogPrimitive from '@radix-ui/react-dialog'

function Buttons() {
  const { notify } = useNotifications()
  return (
    <>
      <button onClick={() => notify.error('Boom: something failed')}>fail</button>
      <button onClick={() => notify.success('Saved it')}>ok</button>
    </>
  )
}

function App({ initiallyOpen }: { initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <NotificationProvider>
      <AlertBanner />
      <Buttons />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Modal</DialogTitle>
          <DialogDescription>desc</DialogDescription>
          <Buttons />
          <button onClick={() => setOpen(false)}>close</button>
        </DialogContent>
      </Dialog>
    </NotificationProvider>
  )
}

const press = (container: HTMLElement | Document, name: string) =>
  act(() => {
    within(container as HTMLElement).getAllByRole('button', { name, hidden: true })[0].click()
  })

describe('dialog-scoped notifications', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders notifications raised in a dialog inside that dialog, not the page banner', () => {
    render(<App initiallyOpen />)
    const dialog = screen.getByRole('dialog')
    press(dialog, 'fail')

    const alert = within(dialog).getByRole('alert')
    expect(alert).toHaveTextContent('Boom: something failed')
    // Global banner stays empty while the dialog is open
    expect(document.querySelectorAll('section[aria-label="Notifications"]').length).toBe(0)
    // Focus moves to the new error so screen readers read it
    expect(alert.firstElementChild).toHaveFocus()
  })

  it('does not auto-dismiss dialog notifications, even non-errors', () => {
    render(<App initiallyOpen />)
    const dialog = screen.getByRole('dialog')
    press(dialog, 'ok')
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(within(dialog).getByRole('status')).toHaveTextContent('Saved it')
  })

  it('can be dismissed, and is cleared when the dialog closes', () => {
    render(<App initiallyOpen />)
    const dialog = screen.getByRole('dialog')
    press(dialog, 'fail')
    press(dialog, 'Dismiss notification')
    expect(within(dialog).getByRole('alert')).toBeEmptyDOMElement()

    press(dialog, 'fail')
    press(dialog, 'close')
    // Dialog gone; nothing leaks into the page banner
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body).not.toHaveTextContent('Boom: something failed')
  })

  it('re-announces an identical error on repeat: replaces the old one with a fresh, focused element', () => {
    render(<App initiallyOpen />)
    const dialog = screen.getByRole('dialog')
    press(dialog, 'fail')
    const first = within(dialog).getByText('Boom: something failed').closest('[tabindex]') as HTMLElement
    expect(first).toHaveFocus()

    // Move focus away, then raise the same error again
    act(() => {
      ;(within(dialog).getAllByRole('button', { name: 'fail', hidden: true })[0] as HTMLElement).focus()
    })
    press(dialog, 'fail')

    const items = within(dialog).getAllByText('Boom: something failed')
    expect(items).toHaveLength(1) // no stacking
    const second = items[0].closest('[tabindex]') as HTMLElement
    expect(second).not.toBe(first) // new element => announced again
    expect(second).toHaveFocus()
  })

  it('uses the page banner when no dialog is open', () => {
    render(<App initiallyOpen={false} />)
    press(document.body, 'fail')
    expect(screen.getByRole('alert')).toHaveTextContent('Boom: something failed')
  })

  it('renders inside an AlertDialog and a Sheet too', () => {
    const { unmount } = render(
      <NotificationProvider>
        <AlertBanner />
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>sure?</AlertDialogDescription>
            <Buttons />
          </AlertDialogContent>
        </AlertDialog>
      </NotificationProvider>
    )
    const alertDialog = screen.getByRole('alertdialog')
    press(alertDialog, 'fail')
    expect(within(alertDialog).getByRole('alert')).toHaveTextContent('Boom: something failed')
    unmount()

    render(
      <NotificationProvider>
        <AlertBanner />
        <Sheet open>
          <SheetContent>
            <SheetTitle>Panel</SheetTitle>
            <SheetDescription>panel</SheetDescription>
            <Buttons />
          </SheetContent>
        </Sheet>
      </NotificationProvider>
    )
    const sheet = screen.getByRole('dialog')
    press(sheet, 'ok')
    expect(within(sheet).getByRole('status')).toHaveTextContent('Saved it')
  })

  it('falls back to the page banner for a modal that cannot render scoped messages', () => {
    render(
      <NotificationProvider>
        <AlertBanner />
        <DialogPrimitive.Root open>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Content>
              <DialogPrimitive.Title>Bare</DialogPrimitive.Title>
              <DialogPrimitive.Description>no host</DialogPrimitive.Description>
              <Buttons />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </NotificationProvider>
    )
    press(screen.getByRole('dialog'), 'fail')
    // Not lost: shown in the page banner, with an auto-dismiss timer where applicable
    const banner = document.querySelector('section[aria-label="Notifications"]')
    expect(banner).toHaveTextContent('Boom: something failed')
  })
})
