import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MotionGraphicsBackdrop from './MotionGraphicsBackdrop.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="site-root">
      <MotionGraphicsBackdrop />
      <div className="site-content-layer">
        <App />
      </div>
    </div>
  </StrictMode>,
)
