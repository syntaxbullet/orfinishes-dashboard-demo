import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, User } from "lucide-react";

export function UserProfile() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent animate-pulse">
          <User className="h-4 w-4" />
        </div>
        <div className="grid flex-1 gap-0.5">
          <div className="h-4 bg-sidebar-accent rounded animate-pulse" />
          <div className="h-3 bg-sidebar-accent rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "User";
  const userRole = user.user_metadata?.role || "User";

  return (
    <div className="flex items-center gap-2 rounded-lg px-2">
      <div
        className="flex size-8 items-center justify-center rounded-full profile-picture"
        style={{
          background: `url(${user.user_metadata?.picture})`,
          backgroundSize: "cover",
        }}
      ></div>
      <div className="grid flex-1 gap-0.5">
        <span className="truncate text-sm font-medium">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {userRole}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="h-8 w-8 p-0"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
