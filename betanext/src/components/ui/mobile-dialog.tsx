import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function MobileDialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="mobile-dialog" {...props} />
}

function MobileDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="mobile-dialog-trigger" {...props} />
}

function MobileDialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="mobile-dialog-portal" {...props} />
}

function MobileDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="mobile-dialog-close" {...props} />
}

function MobileDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="mobile-dialog-overlay"
      className={cn(
        // High z-index so mobile dialogs always sit above sticky headers / nav
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[80] bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function MobileDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <MobileDialogPortal data-slot="mobile-dialog-portal">
      <MobileDialogOverlay />
      <DialogPrimitive.Content
        data-slot="mobile-dialog-content"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 duration-200"
        {...props}
      >
        <div
          className={cn(
            // Inner container that is centered inside the viewport.
            // Individual modals can control width, max-height, scrolling, etc.
            "w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl bg-background",
            className
          )}
        >
          {/* Accessible fallback title to satisfy Radix requirement */}
          <DialogPrimitive.Title className="sr-only">
            Dialog
          </DialogPrimitive.Title>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="mobile-dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </div>
      </DialogPrimitive.Content>
    </MobileDialogPortal>
  )
}

function MobileDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="mobile-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function MobileDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="mobile-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function MobileDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="mobile-dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function MobileDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="mobile-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  MobileDialog,
  MobileDialogClose,
  MobileDialogContent,
  MobileDialogDescription,
  MobileDialogFooter,
  MobileDialogHeader,
  MobileDialogTitle,
  MobileDialogTrigger,
}
