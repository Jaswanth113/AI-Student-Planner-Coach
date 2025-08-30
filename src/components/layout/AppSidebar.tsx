import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  CheckSquare, 
  Target,
  Clock,
  ShoppingCart,
  Receipt,
  Bell,
  Bot,
  User,
  Settings,
  Sparkles,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { 
    name: "Planner", 
    href: "/planner", 
    icon: Calendar,
    subItems: [
      { name: "Week View", href: "/planner/week" },
      { name: "Day View", href: "/planner/day" }
    ]
  },
  { name: "Tasks & Goals", href: "/tasks", icon: CheckSquare },
  { name: "Commitments", href: "/commitments", icon: Clock },
  { name: "Grocery & Budget", href: "/grocery", icon: ShoppingCart },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Learn", href: "/learn", icon: Target },
];

const bottomItems = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen sidebar-width bg-card border-r border-border">
      <div className="flex h-full flex-col">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Life Planner</h1>
            <p className="text-xs text-muted-foreground">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigationItems.map((item) => (
            <div key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive: navActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-muted hover:text-foreground",
                    (navActive || isActive(item.href))
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
              
              {/* Sub-items for nested navigation */}
              {item.subItems && isActive(item.href) && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <NavLink
                      key={subItem.name}
                      to={subItem.href}
                      className={({ isActive: subActive }) =>
                        cn(
                          "block px-3 py-1.5 rounded-md text-xs transition-colors",
                          "hover:bg-muted hover:text-foreground",
                          subActive
                            ? "bg-mued text-foreground font-medium"
                            : "text-muted-foreground"
                        )
                      }
                    >
                      {subItem.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-4 py-4 border-t border-border space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive: navActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  navActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
          
          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
