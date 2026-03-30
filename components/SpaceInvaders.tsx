'use client'
import { useEffect, useRef } from 'react'

const W = 800
const H = 600
const PLAYER_W = 48
const PLAYER_H = 20
const PLAYER_SPEED = 5
const BULLET_SPEED = 9
const ENEMY_BULLET_SPEED = 4
const COLS = 11
const ROWS = 5
const ALIEN_W = 30
const ALIEN_H = 22
const ALIEN_PAD_X = 16
const ALIEN_PAD_Y = 14
const GRID_LEFT = Math.floor((W - COLS * (ALIEN_W + ALIEN_PAD_X)) / 2)
const GRID_TOP = 70
const MOVE_STEP = 10
const DROP_STEP = 20

type Bullet = { x: number; y: number }
type Alien = { alive: boolean; row: number; col: number }

type State = {
  px: number
  py: number
  bullet: Bullet | null
  enemyBullets: Bullet[]
  aliens: Alien[]
  gridX: number
  gridY: number
  gridDir: number
  moveTimer: number
  shootTimer: number
  score: number
  hiScore: number
  lives: number
  phase: 'idle' | 'playing' | 'gameover' | 'won'
  invincible: number
  shootCooldown: number
  frameN: number
}

function initAliens(): Alien[] {
  const out: Alien[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      out.push({ alive: true, row: r, col: c })
  return out
}

function makeState(hiScore = 0): State {
  return {
    px: W / 2 - PLAYER_W / 2,
    py: H - 55,
    bullet: null,
    enemyBullets: [],
    aliens: initAliens(),
    gridX: 0,
    gridY: 0,
    gridDir: 1,
    moveTimer: 0,
    shootTimer: 0,
    score: 0,
    hiScore,
    lives: 3,
    phase: 'idle',
    invincible: 0,
    shootCooldown: 0,
    frameN: 0,
  }
}

function alienPos(s: State, a: Alien) {
  return {
    x: GRID_LEFT + s.gridX + a.col * (ALIEN_W + ALIEN_PAD_X),
    y: GRID_TOP + s.gridY + a.row * (ALIEN_H + ALIEN_PAD_Y),
  }
}

const ALIEN_COLORS = ['#ff4466', '#ff4466', '#ffaa00', '#ffaa00', '#66ff88']

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, f: number) {
  ctx.fillStyle = ALIEN_COLORS[row] ?? '#fff'
  const t = f % 2 === 0

  if (row === 0) {
    // Crab
    ctx.fillRect(x + 10, y, 10, 6)
    ctx.fillRect(x + 6, y + 6, 18, 6)
    ctx.fillRect(x + 2, y + 12, 26, 6)
    ctx.fillRect(x + 2, y + 18, 8, 4)
    ctx.fillRect(x + 20, y + 18, 8, 4)
    if (t) { ctx.fillRect(x, y + 18, 4, 4); ctx.fillRect(x + 26, y + 18, 4, 4) }
    else { ctx.fillRect(x + 2, y + 22, 4, 2); ctx.fillRect(x + 24, y + 22, 4, 2) }
  } else if (row <= 2) {
    // Octopus
    ctx.fillRect(x + 8, y, 14, 6)
    ctx.fillRect(x + 2, y + 6, 26, 6)
    ctx.fillRect(x + 4, y + 12, 22, 6)
    ctx.fillRect(x + 2, y + 18, 8, 4)
    ctx.fillRect(x + 20, y + 18, 8, 4)
    if (t) { ctx.fillRect(x, y + 20, 4, 2); ctx.fillRect(x + 26, y + 20, 4, 2) }
    else { ctx.fillRect(x + 4, y + 22, 4, 2); ctx.fillRect(x + 22, y + 22, 4, 2) }
  } else {
    // Squid
    ctx.fillRect(x + 12, y, 6, 6)
    ctx.fillRect(x + 4, y + 6, 22, 6)
    ctx.fillRect(x + 0, y + 12, 30, 6)
    ctx.fillRect(x + 2, y + 18, 8, 4)
    ctx.fillRect(x + 10, y + 18, 10, 4)
    ctx.fillRect(x + 20, y + 18, 8, 4)
    if (t) { ctx.fillRect(x, y + 20, 4, 4); ctx.fillRect(x + 26, y + 20, 4, 4) }
    else { ctx.fillRect(x + 4, y + 22, 4, 2); ctx.fillRect(x + 22, y + 22, 4, 2) }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean) {
  if (flash && Math.floor(Date.now() / 120) % 2 === 0) return
  ctx.fillStyle = '#00ff41'
  ctx.fillRect(x + 20, y - 8, 8, 8)     // cannon
  ctx.fillRect(x + 14, y, 20, 6)         // top
  ctx.fillRect(x + 6, y + 6, 36, 6)     // mid
  ctx.fillRect(x, y + 12, PLAYER_W, 8)  // base
}

// Static starfield
const STARS: [number, number, number][] = Array.from({ length: 80 }, (_, i) => [
  (i * 137 + 50) % W,
  (i * 79 + 20) % (H - 60),
  i % 3 === 0 ? 2 : 1,
])

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sRef = useRef<State>(makeState())
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const onDown = (e: KeyboardEvent) => {
      e.preventDefault()
      keysRef.current.add(e.key)
      const s = sRef.current
      if (e.key === 'Enter' || e.key === ' ') {
        if (s.phase === 'idle') s.phase = 'playing'
      }
      if ((e.key === 'r' || e.key === 'R') && s.phase !== 'playing') {
        sRef.current = makeState(s.hiScore)
        sRef.current.phase = 'playing'
      }
    }
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key)

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)

    const loop = (time: number) => {
      const dt = Math.min(time - lastRef.current, 48)
      lastRef.current = time
      const s = sRef.current
      const keys = keysRef.current
      s.frameN++

      if (s.phase === 'playing') {
        // Player movement
        if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A'))
          s.px = Math.max(0, s.px - PLAYER_SPEED)
        if (keys.has('ArrowRight') || keys.has('d') || keys.has('D'))
          s.px = Math.min(W - PLAYER_W, s.px + PLAYER_SPEED)

        // Shoot
        s.shootCooldown -= dt
        if ((keys.has(' ') || keys.has('ArrowUp')) && !s.bullet && s.shootCooldown <= 0) {
          s.bullet = { x: s.px + PLAYER_W / 2 - 2, y: s.py }
          s.shootCooldown = 280
        }

        // Player bullet movement
        if (s.bullet) {
          s.bullet.y -= BULLET_SPEED
          if (s.bullet.y < 0) s.bullet = null
        }

        const alive = s.aliens.filter(a => a.alive)

        if (alive.length === 0) {
          s.phase = 'won'
          s.hiScore = Math.max(s.hiScore, s.score)
        } else {
          // Alien movement
          const totalAliens = COLS * ROWS
          const moveInterval = Math.max(600 - (totalAliens - alive.length) * 10, 80)
          s.moveTimer += dt

          if (s.moveTimer >= moveInterval) {
            s.moveTimer = 0

            let minX = W, maxX = 0
            for (const a of alive) {
              const p = alienPos(s, a)
              if (p.x < minX) minX = p.x
              if (p.x + ALIEN_W > maxX) maxX = p.x + ALIEN_W
            }

            if (s.gridDir === 1 && maxX + MOVE_STEP >= W) {
              s.gridDir = -1
              s.gridY += DROP_STEP
            } else if (s.gridDir === -1 && minX - MOVE_STEP <= 0) {
              s.gridDir = 1
              s.gridY += DROP_STEP
            } else {
              s.gridX += s.gridDir * MOVE_STEP
            }

            // Check aliens reached player
            for (const a of alive) {
              const p = alienPos(s, a)
              if (p.y + ALIEN_H >= s.py) {
                s.phase = 'gameover'
                s.hiScore = Math.max(s.hiScore, s.score)
                break
              }
            }
          }

          // Alien shooting
          const shootInterval = Math.max(1800 - s.score * 3, 500)
          s.shootTimer += dt
          if (s.shootTimer >= shootInterval) {
            s.shootTimer = 0
            const shooter = alive[Math.floor(Math.random() * alive.length)]
            const p = alienPos(s, shooter)
            s.enemyBullets.push({ x: p.x + ALIEN_W / 2 - 2, y: p.y + ALIEN_H })
          }
        }

        // Enemy bullets movement + out-of-bounds
        s.enemyBullets = s.enemyBullets.filter(b => {
          b.y += ENEMY_BULLET_SPEED
          return b.y < H
        })

        // Invincibility timer
        if (s.invincible > 0) s.invincible -= dt

        // Collision: player bullet vs alien
        if (s.bullet) {
          for (const a of s.aliens) {
            if (!a.alive) continue
            const p = alienPos(s, a)
            if (
              s.bullet.x + 4 >= p.x && s.bullet.x <= p.x + ALIEN_W &&
              s.bullet.y + 12 >= p.y && s.bullet.y <= p.y + ALIEN_H
            ) {
              a.alive = false
              s.bullet = null
              const pts = [30, 20, 20, 10, 10]
              s.score += pts[a.row] ?? 10
              break
            }
          }
        }

        // Collision: enemy bullet vs player
        if (s.invincible <= 0) {
          for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
            const b = s.enemyBullets[i]
            if (
              b.x + 4 >= s.px && b.x <= s.px + PLAYER_W &&
              b.y + 10 >= s.py && b.y <= s.py + PLAYER_H
            ) {
              s.enemyBullets.splice(i, 1)
              s.lives--
              s.invincible = 2200
              if (s.lives <= 0) {
                s.phase = 'gameover'
                s.hiScore = Math.max(s.hiScore, s.score)
              }
              break
            }
          }
        }
      }

      // ── RENDER ──────────────────────────────────────────────
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      // Stars
      for (const [sx, sy, sz] of STARS) {
        ctx.fillStyle = sz === 2 ? '#ffffff55' : '#ffffff33'
        ctx.fillRect(sx, sy, sz, sz)
      }

      // Ground line
      ctx.strokeStyle = '#00ff41'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, H - 22); ctx.lineTo(W, H - 22); ctx.stroke()

      // HUD
      ctx.font = 'bold 16px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.fillText(`SCORE  ${s.score}`, 20, 28)
      ctx.textAlign = 'center'
      ctx.fillText(`HI  ${s.hiScore}`, W / 2, 28)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ff4466'
      ctx.fillText('♥'.repeat(Math.max(s.lives, 0)), W - 20, 28)
      ctx.textAlign = 'left'

      const s2 = sRef.current

      // Aliens
      for (const a of s2.aliens) {
        if (!a.alive) continue
        const p = alienPos(s2, a)
        drawAlien(ctx, p.x, p.y, a.row, s2.frameN)
      }

      // Player
      if (s2.phase !== 'idle')
        drawPlayer(ctx, s2.px, s2.py, s2.invincible > 0)

      // Player bullet
      if (s2.bullet) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(s2.bullet.x, s2.bullet.y, 4, 14)
      }

      // Enemy bullets
      ctx.fillStyle = '#ff4466'
      for (const b of s2.enemyBullets) {
        // Zig-zag bolt
        const zz = s2.frameN % 2 === 0 ? 2 : -2
        ctx.fillRect(b.x + zz, b.y, 3, 5)
        ctx.fillRect(b.x - zz, b.y + 5, 3, 5)
      }

      // Overlays
      const phase = s2.phase
      if (phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#00ff41'
        ctx.font = 'bold 52px monospace'
        ctx.fillText('SPACE INVADERS', W / 2, H / 2 - 60)
        ctx.fillStyle = '#ffaa00'
        ctx.font = '20px monospace'
        ctx.fillText('Press ENTER or SPACE to start', W / 2, H / 2)
        ctx.fillStyle = '#aaa'
        ctx.font = '15px monospace'
        ctx.fillText('← → Move   SPACE Shoot', W / 2, H / 2 + 36)
        ctx.textAlign = 'left'
      } else if (phase === 'gameover' || phase === 'won') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        if (phase === 'won') {
          ctx.fillStyle = '#00ff41'
          ctx.font = 'bold 52px monospace'
          ctx.fillText('YOU WIN!', W / 2, H / 2 - 50)
        } else {
          ctx.fillStyle = '#ff4466'
          ctx.font = 'bold 52px monospace'
          ctx.fillText('GAME OVER', W / 2, H / 2 - 50)
        }
        ctx.fillStyle = '#fff'
        ctx.font = '22px monospace'
        ctx.fillText(`Score: ${s2.score}`, W / 2, H / 2 + 10)
        ctx.fillText(`Hi-Score: ${s2.hiScore}`, W / 2, H / 2 + 44)
        ctx.fillStyle = '#ffaa00'
        ctx.font = '18px monospace'
        ctx.fillText('Press R to play again', W / 2, H / 2 + 86)
        ctx.textAlign = 'left'
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black select-none">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        tabIndex={0}
        className="border border-green-600 focus:outline-none"
        style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
      />
      <p className="text-gray-600 text-xs font-mono mt-3 tracking-widest">
        ← → MOVE &nbsp;|&nbsp; SPACE SHOOT &nbsp;|&nbsp; R RESTART
      </p>
    </div>
  )
}
