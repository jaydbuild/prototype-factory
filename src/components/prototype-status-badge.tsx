
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrototypeStatusBadgeProps {
  status: 'pending' | 'processing' | 'deployed' | 'failed' | null
}

export function PrototypeStatusBadge({ status }: PrototypeStatusBadgeProps) {
  if (!status) return null

  switch (status) {
    case 'pending':
    case 'processing':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      )
    case 'deployed':
      return (
        <Badge variant="default" className={cn("bg-green-500", "text-white")}>
          Live
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          Failed
        </Badge>
      )
    default:
      return null
  }
}
