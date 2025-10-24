import { useAuth } from '@/contexts/auth-context';
import { SignInButton } from './sign-in-button';
import { UserProfile } from './user-profile';

export function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Welcome to ORFinishes</h1>
            <p className="text-muted-foreground">
              Please sign in with Discord to access the admin panel.
            </p>
          </div>
          <SignInButton />
        </div>
      </div>
    );
  }

  return <UserProfile />;
}
