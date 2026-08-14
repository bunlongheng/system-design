import { useState, useEffect, useRef } from 'react'

// ─── AI Thinking Overlay (copied from diagrams app) ──────────────────────────

const AI_TOKENS = [
  'tokens','context','embedding','inference','neural','attention','transformer',
  'gradient','weight','latent','vector','semantic','entropy','logit','softmax',
  'decode','encode','tensor','backprop','synapse','neuron','pattern','classify',
  'predict','generate','reason','analyze','parse','query','memory','chain',
  'cluster','feature','kernel','dropout','sigmoid','relu','normalize','sample',
  'prompt','stream','output','input','layer','epoch','batch','loss','node','graph',
]
const AI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>/\\|{}[]'
const PARTICLE_COLORS = [
  '#f87171','#fb923c','#fbbf24','#34d399','#38bdf8','#818cf8','#e879f9',
  '#f472b6','#a3e635','#2dd4bf','#60a5fa','#c084fc',
]
const LOADING_PHRASES = [
  'Thinking...','Tokenizing...','Building graph...','Reasoning...','Encoding...',
  'Mapping flow...','Inferring...','Generating...','Assembling...','Almost there...',
]

function pickToken() {
  return Math.random() < 0.35
    ? AI_TOKENS[Math.floor(Math.random() * AI_TOKENS.length)]
    : AI_CHARS[Math.floor(Math.random() * AI_CHARS.length)]
}

export function AIThinkingOverlay() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const [phrase, setPhrase] = useState(LOADING_PHRASES[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)])
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 600, H = 400
    canvas.width = W * 2; canvas.height = H * 2
    ctx.scale(2, 2)

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -Math.random() * 2 - 0.5,
      text: pickToken(),
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 9 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.5,
      life: Math.random() * 200,
    }))

    function animate() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life++
        p.opacity *= 0.997
        if (p.y < -20 || p.opacity < 0.05) {
          p.x = Math.random() * W
          p.y = H + 10
          p.vy = -Math.random() * 2 - 0.5
          p.vx = (Math.random() - 0.5) * 1.5
          p.text = pickToken()
          p.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
          p.opacity = 0.15 + Math.random() * 0.5
          p.life = 0
        }
        ctx.globalAlpha = p.opacity
        ctx.font = `${p.size}px "JetBrains Mono", "Fira Code", monospace`
        ctx.fillStyle = p.color
        ctx.fillText(p.text, p.x, p.y)
      }
      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(12px)',
    }}>
      <canvas ref={canvasRef} style={{ width: 600, height: 400, position: 'absolute', opacity: 0.6 }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#1c1e21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 24, height: 24, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#fff', borderRadius: '50%',
            animation: 'sd-spin 0.8s linear infinite',
          }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{phrase}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Claude is designing your architecture</div>
      </div>
      <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
