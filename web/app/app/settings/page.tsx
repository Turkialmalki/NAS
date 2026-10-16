import { requireStaff } from '@/lib/ctx';
import { SettingsForm } from '@/components/app/SettingsForm';

export default async function SettingsPage() {
  const { sb, festival } = await requireStaff();
  const [{ data: cats }, { data: crit }] = await Promise.all([
    sb.from('categories').select('id,name,description,fee').eq('festival_id', festival.id).order('sort'),
    sb.from('criteria').select('id,name,weight').eq('festival_id', festival.id).order('sort'),
  ]);
  return <SettingsForm festival={festival} categories={cats || []} criteria={crit || []} site={process.env.NEXT_PUBLIC_SITE_URL || ''} />;
}
