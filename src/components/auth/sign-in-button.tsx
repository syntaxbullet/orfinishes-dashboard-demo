import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogIn } from 'lucide-react';

export function SignInButton() {
  const { signInWithDiscord, loading } = useAuth();

  return (
    <Button
      onClick={signInWithDiscord}
      disabled={loading}
      className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
    >
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with Discord
    </Button>
  );
}
