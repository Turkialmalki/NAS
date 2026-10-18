import { getT } from '@/lib/i18n/server';
import { LoginForm } from '@/components/LoginForm';

export async function generateMetadata() { const t = await getT(); return { title: t('دخول') }; }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string; role?: string }> }) {
  const sp = await searchParams;
  return <LoginForm signup={sp.mode === 'signup'} next={sp.next?.startsWith('/app/') ? sp.next : '/app'} linkError={sp.error === 'link'} role={sp.role} />;
}
