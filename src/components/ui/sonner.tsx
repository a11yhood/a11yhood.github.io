import { useTheme } from "next-themes"
import { CSSProperties, ReactNode, isValidElement, useEffect, useRef, useState } from "react"
import { Toaster as Sonner, ToasterProps, useSonner } from "sonner"

const nodeToText = (node: ReactNode | (() => ReactNode) | undefined): string => {
  if (typeof node === "function") {
    return nodeToText(node())
  }

  if (node === null || node === undefined || typeof node === "boolean") {
    return ""
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((item) => nodeToText(item)).filter(Boolean).join(" ").trim()
  }

  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children
    return nodeToText(children)
  }

  return ""
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { toasts } = useSonner()
  const [politeAnnouncement, setPoliteAnnouncement] = useState({ id: 0, text: "" })
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState({ id: 0, text: "" })
  const lastAnnouncementRef = useRef<string>("")

  useEffect(() => {
    const latestToast = toasts[toasts.length - 1]
    if (!latestToast || latestToast.delete) {
      return
    }

    const titleText = nodeToText(latestToast.title)
    const descriptionText = nodeToText(latestToast.description)
    const announcementText = [titleText, descriptionText].filter(Boolean).join(". ").trim()

    if (!announcementText) {
      return
    }

    const announcementKey = `${latestToast.id}:${announcementText}`
    if (lastAnnouncementRef.current === announcementKey) {
      return
    }

    lastAnnouncementRef.current = announcementKey
    const isAssertive = latestToast.type === "error" || latestToast.type === "warning"

    if (isAssertive) {
      setAssertiveAnnouncement((previous) => ({ id: previous.id + 1, text: announcementText }))
      return
    }

    setPoliteAnnouncement((previous) => ({ id: previous.id + 1, text: announcementText }))
  }, [toasts])

  return (
    <>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        containerAriaLabel="Notifications"
        duration={6000}
        expand
        visibleToasts={5}
        style={
          {
            "--background": "var(--popover)",
            "--foreground": "var(--popover-foreground)",
            "--border": "var(--border)",
          } as CSSProperties
        }
        {...props}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true" key={politeAnnouncement.id}>
        {politeAnnouncement.text}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" key={assertiveAnnouncement.id}>
        {assertiveAnnouncement.text}
      </div>
    </>
  )
}

export { Toaster }
