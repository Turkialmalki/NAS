import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { ContactForm } from '@/components/ContactForm';

export async function generateMetadata() { const t = await getT(); return { title: t('تواصل معنا') }; }
export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="wrap ct"><ContactForm topic={sp.topic} /></main>
      <SiteFooter />
    </>
  );
}
