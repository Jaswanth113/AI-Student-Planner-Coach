import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: 1 | 2 | 3;
  className?: string;
}

const priorityConfig = {
  1: { label: "P1", className: "priority-1" },
  2: { label: "P2", className: "priority-2" },
  3: { label: "P3", className: "priority-3" },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, "text-xs font-medium border", className)}
    >
      {config.label}
    </Badge>
  );
}