import { redirect } from 'next/navigation';
import { getCtx, homeFor } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { Welcome } from '@/components/me/Welcome';

export default async function WelcomePage() {
  const ctx = await getCtx();
  const home = homeFor(ctx);
  if (home !== '/app/welcome') redirect(home);
  const t = await getT();
  return <Welcome name={ctx.name} title={t('أهلًا بك')} />;
}
