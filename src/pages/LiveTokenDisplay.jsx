import { useState, useEffect } from 'react';
import { API_BASE } from '../api/config';

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function LiveTokenDisplay({ slug }) {
  const clock = useClock();
  const [shop, setShop] = useState(null);
  const [queue, setQueue] = useState({ current: 0, next: 1, assigned: [] });
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > 768);

  useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch shop info
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/qr-menu/${slug}`)
      .then(r => r.json())
      .then(d => setShop(d.shop || null))
      .catch(() => {});
  }, [slug]);

  // Poll token queue every 2 seconds
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/qr-menu/${slug}/token-queue`);
        if (!r.ok) return;
        const d = await r.json();
        if (mounted && d.token_queue) setQueue(d.token_queue);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [slug]);

  const current = queue.current || 0;
  const assigned = queue.assigned || [];
  const waiting = assigned.filter(t => t > current).length;
  const served = assigned.filter(t => t <= current && t > 0).length;
  const nextToken = Math.min(...assigned.filter(t => t > current));
  const hasQueue = current > 0;
  const hasNext = nextToken && nextToken !== Infinity;
  const isLastToken = hasQueue && !hasNext && waiting === 0;

  const Clock = () => (
    <div style={{ fontSize: isLandscape ? 18 : 16, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
      {clock}
    </div>
  );

  // ── State 3: No Queue ──
  if (!hasQueue) {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0d2e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui,-apple-system,sans-serif', padding: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          {shop?.profile_picture && (
            <img src={shop.profile_picture} alt=""
              style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover', marginBottom: 16 }} />
          )}
          <h1 style={{ fontSize: isLandscape ? 28 : 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            {shop?.bot_full_name || 'Shop'}
          </h1>
          <div style={{ fontSize: isLandscape ? 160 : 120, fontWeight: 900, color: '#7C3AED', lineHeight: 1, margin: '32px 0' }}>
            #000
          </div>
          <p style={{ fontSize: isLandscape ? 24 : 20, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            Walk in and get your token!
          </p>
          <div style={{ marginTop: 32, fontSize: isLandscape ? 16 : 14, color: 'rgba(255,255,255,0.4)' }}>
            <Clock />
          </div>
        </div>
      </div>
    );
  }

  const currentStr = String(current).padStart(3, '0');

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0d2e 100%)',
      fontFamily: 'system-ui,-apple-system,sans-serif', color: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isLandscape ? '16px 40px' : '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {shop?.profile_picture ? (
            <img src={shop.profile_picture} alt=""
              style={{ width: isLandscape ? 44 : 36, height: isLandscape ? 44 : 36, borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: isLandscape ? 44 : 36, height: isLandscape ? 44 : 36, borderRadius: 12, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛒</div>
          )}
          <h1 style={{ fontSize: isLandscape ? 22 : 18, fontWeight: 700, margin: 0, color: '#fff' }}>
            {shop?.bot_full_name || 'Shop'}
          </h1>
        </div>
        <Clock />
      </header>

      {/* ── Main Content ── */}
      {isLandscape ? (
        /* ── LANDSCAPE LAYOUT ── */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', gap: 48 }}>
          {/* NOW SERVING */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              Now Serving
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                border: '3px solid #7C3AED', opacity: 0.3,
                animation: 'livePulse 2s ease-in-out infinite',
              }} />
              <div style={{
                fontSize: 200, fontWeight: 900, lineHeight: 1, color: '#fff',
                textShadow: '0 0 60px rgba(124,58,237,0.4)',
              }}>
                #{currentStr}
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: 20, padding: '8px 20px', borderRadius: 100,
              background: 'rgba(34,197,94,0.15)', color: '#22c55e',
              fontSize: 14, fontWeight: 600,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Being served now
            </div>
          </div>

          {/* UP NEXT */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              Up Next
            </div>
            <div style={{
              fontSize: 120, fontWeight: 800, lineHeight: 1, color: isLastToken ? 'rgba(255,255,255,0.3)' : '#7C3AED',
              marginBottom: 20,
            }}>
              {isLastToken ? '—' : hasNext ? `#${String(nextToken).padStart(3, '0')}` : '—'}
            </div>
            {isLastToken ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 100,
                background: 'rgba(250,204,21,0.15)', color: '#facc15',
                fontSize: 14, fontWeight: 600,
              }}>
                🎉 Almost done!
              </div>
            ) : hasNext ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 100,
                background: 'rgba(251,146,60,0.15)', color: '#fb923c',
                fontSize: 14, fontWeight: 600,
              }}>
                ⏳ Please get ready
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                No upcoming tokens
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── PORTRAIT LAYOUT ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 32 }}>
          {/* NOW SERVING */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Now Serving
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                position: 'absolute', inset: -16, borderRadius: '50%',
                border: '3px solid #7C3AED', opacity: 0.3,
                animation: 'livePulse 2s ease-in-out infinite',
              }} />
              <div style={{
                fontSize: 160, fontWeight: 900, lineHeight: 1, color: '#fff',
                textShadow: '0 0 40px rgba(124,58,237,0.4)',
              }}>
                #{currentStr}
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 16, padding: '6px 16px', borderRadius: 100,
              background: 'rgba(34,197,94,0.15)', color: '#22c55e',
              fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Being served now
            </div>
          </div>

          {/* UP NEXT */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Up Next
            </div>
            <div style={{
              fontSize: 96, fontWeight: 800, lineHeight: 1, color: isLastToken ? 'rgba(255,255,255,0.3)' : '#7C3AED',
              marginBottom: 12,
            }}>
              {isLastToken ? '—' : hasNext ? `#${String(nextToken).padStart(3, '0')}` : '—'}
            </div>
            {isLastToken ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 100,
                background: 'rgba(250,204,21,0.15)', color: '#facc15',
                fontSize: 13, fontWeight: 600,
              }}>
                🎉 Almost done!
              </div>
            ) : hasNext ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 100,
                background: 'rgba(251,146,60,0.15)', color: '#fb923c',
                fontSize: 13, fontWeight: 600,
              }}>
                ⏳ Please get ready
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                No upcoming tokens
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Bar ── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isLandscape ? 48 : 32,
        padding: isLandscape ? '16px 40px' : '12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: isLandscape ? 15 : 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
      }}>
        <span>⏳ Waiting: {waiting}</span>
        <span>✅ Served today: {served}</span>
      </footer>

      <style>{`
        body { margin: 0; overflow: hidden; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
