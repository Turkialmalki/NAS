import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'دخول' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return <LoginForm signup={sp.mode === 'signup'} next={sp.next || '/app'} linkError={sp.error === 'link'} />;
}
