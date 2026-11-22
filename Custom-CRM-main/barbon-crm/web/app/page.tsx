'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setLoading(false);
      if (data.session && mounted) setMessage(`Signed in as ${data.session.user.email ?? 'user'}.`);
    }).catch(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [supabase]);

  async function requestMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : 'Check your email for a secure sign-in link.');
  }

  return (
    <main className="shell">
      <section className="card" aria-labelledby="title">
        <p className="eyebrow">Barbon CRM · Phase 1</p>
        <h1 id="title">Secure workspace foundation</h1>
        <p className="muted">The existing Preact CRM remains the read-only fallback while this authenticated application is built in parallel.</p>
        {loading ? <p role="status">Checking session…</p> : (
          <form onSubmit={requestMagicLink}>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            <button type="submit">Send secure sign-in link</button>
          </form>
        )}
        {message && <p role="status" className="message">{message}</p>}
      </section>
    </main>
  );
}
