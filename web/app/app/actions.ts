'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function switchFestival(id: string) {
  (await cookies()).set('nas_fid', id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  redirect('/app');
}
