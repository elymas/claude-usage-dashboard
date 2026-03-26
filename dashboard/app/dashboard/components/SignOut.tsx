'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface Props {
  email: string;
}

export default function SignOut({ email }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500">{email}</span>
      <button
        onClick={handleSignOut}
        className="text-gray-400 hover:text-gray-600"
      >
        Sign out
      </button>
    </div>
  );
}
