import { motion as Motion, useReducedMotion } from 'framer-motion'
import './MotionGraphicsBackdrop.css'

const blobTransition = (duration) => ({
  duration,
  repeat: Infinity,
  repeatType: 'mirror',
  ease: 'easeInOut',
})

const spinLinear = (duration) => ({
  duration,
  repeat: Infinity,
  ease: 'linear',
})

export default function MotionGraphicsBackdrop() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion === true) {
    return <div className="mg-backdrop mg-backdrop--static" aria-hidden />
  }

  return (
    <div className="mg-backdrop" aria-hidden>
      <div className="mg-base" />
      <div className="mg-tri-grid" />
      <div className="mg-diagonal-stripes" />

      <svg className="mg-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="mg-dots" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.2" fill="currentColor" opacity="0.55" />
            <circle cx="22" cy="22" r="1.4" fill="currentColor" opacity="0.35" />
          </pattern>
          <pattern id="mg-hex" width="104" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M52 4 L100 32 L100 88 L52 116 L4 88 L4 32 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.45"
            />
            <path
              d="M52 -56 L100 -28 L100 28 L52 56 L4 28 L4 -28 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              opacity="0.32"
            />
          </pattern>
          <linearGradient id="mg-stroke-fade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <rect className="mg-hex-shift" width="2400" height="1600" x="-240" y="-260" fill="url(#mg-hex)" opacity="0.85" />

        <g className="mg-grid-shift">
          <rect width="2400" height="1600" x="-240" y="-260" fill="url(#mg-dots)" />
        </g>

        <g stroke="currentColor" fill="none" strokeWidth="2.2" opacity="0.55">
          <path d="M 0 120 L 1920 120" className="mg-dash-flow" />
          <path d="M 0 960 L 1920 960" className="mg-dash-flow mg-dash-flow--b" />
          <path d="M 140 0 L 140 1080" className="mg-dash-flow" />
          <path d="M 1780 0 L 1780 1080" className="mg-dash-flow mg-dash-flow--b" />
        </g>

        <g className="mg-orbit" stroke="url(#mg-stroke-fade)" fill="none" strokeWidth="2.4">
          <ellipse cx="960" cy="540" rx="560" ry="340" className="mg-dash-flow" />
          <ellipse cx="960" cy="540" rx="420" ry="260" className="mg-dash-flow mg-dash-flow--b" />
          <rect x="520" y="220" width="880" height="640" rx="24" className="mg-dash-flow" strokeDasharray="28 22" />
        </g>

        <g className="mg-orbit mg-orbit--slow" stroke="currentColor" fill="none" strokeWidth="1.8" opacity="0.65">
          <path d="M 160 540 Q 520 80 960 540 T 1760 540" className="mg-dash-flow" />
          <path d="M 80 720 Q 440 1120 960 720 T 1840 720" className="mg-dash-flow mg-dash-flow--b" />
          <polygon points="960,120 1180,420 740,420" className="mg-dash-flow" strokeLinejoin="miter" />
          <polygon points="960,980 1180,680 740,680" className="mg-dash-flow mg-dash-flow--b" strokeLinejoin="miter" />
        </g>

        <g stroke="currentColor" fill="currentColor" fillOpacity="0.12" strokeWidth="1.6" opacity="0.7">
          <polygon points="240,200 320,200 280,120" />
          <polygon points="1680,240 1760,240 1720,160" />
          <polygon points="200,880 280,880 240,960" />
          <polygon points="1640,840 1720,840 1680,920" />
        </g>

        <g className="mg-brackets" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="square" opacity="0.5">
          <path d="M 80 80 L 80 200 L 200 200" />
          <path d="M 1840 80 L 1840 200 L 1720 200" />
          <path d="M 80 1000 L 80 880 L 200 880" />
          <path d="M 1840 1000 L 1840 880 L 1720 880" />
        </g>

        <line x1="0" y1="200" x2="1920" y2="260" stroke="currentColor" strokeWidth="1.4" className="mg-pulse-line" />
        <line x1="0" y1="900" x2="1920" y2="820" stroke="currentColor" strokeWidth="1.4" className="mg-pulse-line" />
      </svg>

      <div className="mg-blobs">
        <Motion.div
          className="mg-blob mg-blob--1"
          animate={{
            x: [0, 80, -40, 30, 0],
            y: [0, -50, 40, -20, 0],
            scale: [1, 1.12, 0.94, 1.06, 1],
          }}
          transition={blobTransition(26)}
        />
        <Motion.div
          className="mg-blob mg-blob--2"
          animate={{
            x: [0, -70, 50, -20, 0],
            y: [0, 60, -35, 45, 0],
            scale: [1, 0.92, 1.15, 1, 1],
          }}
          transition={blobTransition(32)}
        />
        <Motion.div
          className="mg-blob mg-blob--3"
          animate={{
            x: [0, 55, -65, 20, 0],
            y: [0, 35, -55, 25, 0],
            scale: [1, 1.08, 0.9, 1.1, 1],
          }}
          transition={blobTransition(38)}
        />
        <Motion.div
          className="mg-blob mg-blob--4"
          animate={{
            x: [0, -45, 55, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.18, 0.88, 1],
          }}
          transition={blobTransition(22)}
        />
      </div>

      <div className="mg-rings">
        <div className="mg-ring mg-ring--1" />
        <div className="mg-ring mg-ring--2" />
        <div className="mg-ring mg-ring--3" />
        <div className="mg-ring mg-ring--4" />
      </div>

      <div className="mg-wire-frames">
        <Motion.div
          className="mg-wire-square"
          style={{ left: '8%', top: '18%', width: 'min(22vw, 280px)' }}
          animate={{ rotate: [0, 360] }}
          transition={spinLinear(95)}
        />
        <Motion.div
          className="mg-wire-square mg-wire-square--ccw"
          style={{ right: '6%', top: '22%', width: 'min(18vw, 220px)' }}
          animate={{ rotate: [0, -360] }}
          transition={spinLinear(72)}
        />
        <Motion.div
          className="mg-wire-diamond"
          style={{ left: '42%', bottom: '8%' }}
          animate={{ rotate: [45, 405] }}
          transition={spinLinear(110)}
        />
      </div>

      <div className="mg-chips">
        <span className="mg-chip" />
        <span className="mg-chip mg-chip--b" />
        <span className="mg-chip mg-chip--c" />
      </div>

      <Motion.span
        className="mg-spark"
        style={{ left: '18%', top: '32%' }}
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.45, 0.85] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.span
        className="mg-spark"
        style={{ right: '22%', top: '52%' }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.55, 1] }}
        transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
      <Motion.span
        className="mg-spark"
        style={{ left: '48%', bottom: '18%' }}
        animate={{ opacity: [0.3, 0.95, 0.3], scale: [0.9, 1.5, 0.9] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
      />
      <Motion.span
        className="mg-spark"
        style={{ right: '38%', top: '28%' }}
        animate={{ opacity: [0.25, 0.9, 0.25], scale: [1, 1.35, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />

      <div className="mg-conic-wrap">
        <div className="mg-conic" />
      </div>

      <div className="mg-veil" />
    </div>
  )
}
