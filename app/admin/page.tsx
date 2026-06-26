import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import AdminApp from './AdminApp';
import SignOutButton from '../SignOutButton';

// Admin page — server component guard. Must be signed in AND an admin.
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/signin');
  if (!user.isAdmin) redirect('/dashboard');

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="simply.tv coding challenge — home">
          <Image
            className="logo"
            src="/simply-tv.avif"
            alt="simply.tv"
            width={61}
            height={26}
            priority
          />
          <span className="ctx">coding&nbsp;challenge</span>
        </a>
        <div className="topbar-right">
          <div className="acct" style={{ display: 'inline-flex' }}>
            <span className="dot" aria-hidden="true" />
            <b>{user.email}</b>
            <span className="role">admin</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="stage">
        <AdminApp />
      </main>
    </div>
  );
}
