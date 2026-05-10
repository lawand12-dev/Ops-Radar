import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 12 }}>Check your inbox</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22, lineHeight: 1.5 }}>
          If that email is registered with OpsRadar, we sent you a link to reset your password.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            background: '#00C2FF',
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
