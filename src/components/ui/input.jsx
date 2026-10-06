import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-muted',
        'aria-[invalid=true]:border-status-behind',
        className,
      )}
      {...props}
    />
  )
})
