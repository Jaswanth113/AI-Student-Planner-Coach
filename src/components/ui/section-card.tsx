import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
    disabled?: boolean;
  };
  children: ReactNode;
  className?: string;
}

export function SectionCard({ 
  title, 
  description, 
  action, 
  children, 
  className 
}: SectionCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-title">{title}</CardTitle>
            {description && (
              <CardDescription className="text-subtitle mt-1">
                {description}
              </CardDescription>
            )}
          </div>
          {action && (
            <Button
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
              className="shrink-0"
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}