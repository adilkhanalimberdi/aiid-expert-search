import { strengthOf, type Strength } from '../lib/format'

// Мозаика Sarap: оценка выкладывается плитками смальты. Сетка 10×10, одна плитка это один процент;
// стена набирается снизу вверх, как настоящее мозаичное панно. Оттенки плиток чуть различаются, как у смальты.

const SHADES_LIGHT: Record<Strength, string[]> = {
  strong: ['#0e8a84', '#0b7a75', '#149a92'],
  medium: ['#e3a333', '#d39327', '#ebb24d'],
  weak: ['#9a9ea8', '#8b8f99', '#a7abb4'],
}
const SHADES_DARK: Record<Strength, string[]> = {
  strong: ['#5fd6cb', '#4cc5ba', '#72e1d6'],
  medium: ['#f0c46a', '#e2b050', '#f6d083'],
  weak: ['#8e97c4', '#7f89ba', '#9ca4cd'],
}
const EMPTY_LIGHT = '#d8d5cb'
const EMPTY_DARK = 'rgb(255 255 255 / 0.11)'

/** Детерминированный «шум» оттенка: одна и та же плитка всегда того же цвета. */
function shade(index: number, shades: string[]): string {
  const hash = (index * 2654435761) >>> 0
  return shades[hash % shades.length]
}

type MosaicSize = 'hero' | 'card' | 'mini'
const GEOMETRY: Record<MosaicSize, { cell: number; gap: number }> = {
  hero: { cell: 15, gap: 2 },
  card: { cell: 7, gap: 1.5 },
  mini: { cell: 4, gap: 1 },
}

interface MosaicScoreProps {
  percent: number
  size?: MosaicSize
  onDark?: boolean
  /** Плитки ложатся по одной при появлении (только у лучшего кандидата) */
  animate?: boolean
}

/** Панно 10×10: заполненные плитки это процент совпадения, цвет по силе (от 70 сильное, от 40 среднее). */
export function MosaicScore({ percent, size = 'card', onDark = false, animate = false }: MosaicScoreProps) {
  const { cell, gap } = GEOMETRY[size]
  const strength = strengthOf(percent)
  const shades = (onDark ? SHADES_DARK : SHADES_LIGHT)[strength]
  const step = cell + gap
  const side = 10 * cell + 9 * gap
  const filled = Math.max(0, Math.min(100, Math.round(percent)))
  const withScale = size === 'hero'
  const width = withScale ? side + 34 : side
  const thresholdY = (value: number) => side - (value / 10) * step + gap / 2
  const labelColor = onDark ? 'rgb(255 255 255 / 0.72)' : 'var(--color-pebble)'

  const tiles = []
  for (let k = 0; k < 100; k += 1) {
    const row = 9 - Math.floor(k / 10)
    const col = k % 10
    const isOn = k < filled
    tiles.push(
      <rect
        key={k}
        x={col * step}
        y={row * step}
        width={cell}
        height={cell}
        fill={isOn ? shade(k, shades) : onDark ? EMPTY_DARK : EMPTY_LIGHT}
        className={animate && isOn ? 'set-tile' : undefined}
        style={animate && isOn ? { animationDelay: `${k * 7}ms` } : undefined}
      />,
    )
  }

  return (
    <svg width={width} height={side} viewBox={`0 0 ${width} ${side}`} aria-hidden className="flex-none">
      {tiles}
      {withScale &&
        [40, 70].map((value) => (
          <g key={value}>
            <line x1={side + 3} x2={side + 10} y1={thresholdY(value)} y2={thresholdY(value)} stroke={labelColor} strokeWidth={1.5} />
            <text x={side + 13} y={thresholdY(value) + 4} fontSize={11} fill={labelColor} fontFamily="var(--font-sans)">
              {value}
            </text>
          </g>
        ))}
    </svg>
  )
}

// Знак Sarap: пять плиток складываются в букву S. Верхние две охра (запрос), нижние бирюза (эксперт),
// средняя светлая плитка это место, где они встречаются.
const MARK_TILES: [number, number, string][] = [
  [1, 0, 'var(--color-ochre)'],
  [2, 0, 'var(--color-ochre-soft)'],
  [1, 1, '#ffffff'],
  [0, 2, 'var(--color-turquoise-glow)'],
  [1, 2, 'var(--color-turquoise)'],
]

export function SarapMark({ size = 34, isLaying = false, label }: { size?: number; isLaying?: boolean; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="flex-none"
    >
      {MARK_TILES.map(([x, y, fill], index) => (
        <rect
          key={index}
          x={x * 12}
          y={y * 12}
          width={10}
          height={10}
          fill={fill}
          className={isLaying ? 'lay-tile' : undefined}
          style={isLaying ? { animationDelay: `${index * 140}ms` } : undefined}
        />
      ))}
    </svg>
  )
}

// Узор шапки: плитки смальты двумя полосами у краёв, гуще у самого края, к центру реже; центр пуст,
// чтобы не мешать заголовку и полю. Размер плитки фиксированный, полосы не масштабируются.
const BACKDROP_CELL = 22
const BACKDROP_COLS = 9
const BACKDROP_ROWS = 40

function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function strip(seed: number) {
  const random = seeded(seed)
  const tiles: { x: number; y: number; fill: string }[] = []
  for (let row = 0; row < BACKDROP_ROWS; row += 1) {
    for (let col = 0; col < BACKDROP_COLS; col += 1) {
      const chance = Math.max(0, 0.5 - col * 0.055)
      if (random() > chance) continue
      const accent = random()
      const fill =
        accent < 0.06
          ? 'var(--color-turquoise)'
          : accent < 0.1
            ? 'var(--color-ochre)'
            : accent < 0.55
              ? 'var(--color-smalt-soft)'
              : 'var(--color-smalt-deep)'
      tiles.push({ x: col * BACKDROP_CELL, y: row * BACKDROP_CELL, fill })
    }
  }
  return tiles
}

const LEFT = strip(1977)
const RIGHT = strip(1983)

function Strip({ tiles, side }: { tiles: typeof LEFT; side: 'left' | 'right' }) {
  // справа начало координат у правого края (вложенный svg с x=100%), поэтому на узком экране
  // видны крайние, самые плотные столбцы, как и слева
  const rects = tiles.map((tile, index) => (
    <rect
      key={index}
      x={side === 'left' ? tile.x + 1 : -tile.x - BACKDROP_CELL + 2}
      y={tile.y + 1}
      width={BACKDROP_CELL - 3}
      height={BACKDROP_CELL - 3}
      fill={tile.fill}
    />
  ))
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute top-0 hidden h-full sm:block sm:w-[110px] xl:w-[198px] ${side === 'left' ? 'left-0' : 'right-0'}`}
    >
      {side === 'left' ? (
        rects
      ) : (
        <svg x="100%" overflow="visible">
          {rects}
        </svg>
      )}
    </svg>
  )
}

export function MosaicBackdrop() {
  return (
    <>
      <Strip tiles={LEFT} side="left" />
      <Strip tiles={RIGHT} side="right" />
    </>
  )
}

/** Фриз: ряд плиток палитры, отделяет шапку и подвал. */
export function Frieze({ className = '' }: { className?: string }) {
  const colors = ['var(--color-turquoise)', 'var(--color-ochre)', 'var(--color-terracotta)', 'var(--color-smalt-soft)', 'var(--color-plaster)']
  const random = seeded(42)
  return (
    <svg aria-hidden preserveAspectRatio="none" viewBox="0 0 960 8" className={`block h-2 w-full ${className}`}>
      {Array.from({ length: 96 }, (_, i) => (
        <rect key={i} x={i * 10} y={0} width={9} height={8} fill={colors[Math.floor(random() * colors.length)]} />
      ))}
    </svg>
  )
}
