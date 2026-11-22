'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/browser';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setMsg('');
        const db = supabaseBrowser();
        const res = mode === 'signup'
            ? await db.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: location.origin + '/auth/callback' }
            })
            : await db.auth.signInWithPassword({ email, password });
        setBusy(false);

        if (res.error) {
            if (res.error.message.includes('Invalid login credentials')) {
                setMsg('Invalid login credentials. If you haven\'t created this user in Supabase yet, switch to "Create account" or add the user in the Supabase Dashboard.');
            } else if (res.error.message.includes('Email not confirmed')) {
                setMsg('Email not confirmed yet. Please verify the link in your email or auto-confirm the user in the Supabase Dashboard.');
            } else {
                setMsg(res.error.message);
            }
            return;
        }

        if (res.data.session) {
            location.href = '/dashboard';
        } else {
            setMsg('Check your inbox to verify your email, then sign in. (Or auto-confirm the user in your Supabase Auth dashboard)');
        }
    }

    async function logout() {
        await supabaseBrowser().auth.signOut();
        location.href = '/';
    }

    return (
        <div className="wrap">
            <section className="panel authbox">
                <div className="eyebrow">Welcome to perkly</div>
                <h1>{mode === 'signup' ? 'Make loyalty happen.' : 'Welcome back.'}</h1>
                <p className="muted">One account for your business dashboard and personal wallet.</p>

                <div style={{ display: 'flex', gap: 10, margin: '16px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: 10 }}>
                    <button
                        type="button"
                        className={`btn ${mode === 'login' ? '' : 'ghost'}`}
                        style={{ flex: 1, padding: '8px 12px' }}
                        onClick={() => { setMode('login'); setMsg(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={`btn ${mode === 'signup' ? '' : 'ghost'}`}
                        style={{ flex: 1, padding: '8px 12px' }}
                        onClick={() => { setMode('signup'); setMsg(''); }}
                    >
                        Create Account
                    </button>
                </div>

                <form className="form" onSubmit={submit}>
                    <label className="field">
                        Email
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </label>
                    <label className="field">
                        Password
                        <input
                            required
                            type="password"
                            minLength={6}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                        />
                    </label>
                    <button className="btn" disabled={busy}>
                        {busy ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                    </button>
                </form>

                {msg && (
                    <p
                        className={'notice ' + (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('invalid') ? 'error' : '')}
                        style={{ marginTop: 12, lineHeight: 1.4 }}
                    >
                        {msg}
                    </p>
                )}

                <hr style={{ margin: '20px 0' }} />
                <button className="btn ghost tiny" onClick={logout}>Sign out of this browser</button>
            </section>
        </div>
    );
}

