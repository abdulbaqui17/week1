import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './app/globals.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <div className="dark bg-slate-950 text-slate-200 min-h-screen">
      <App />
    </div>
  </StrictMode>,
)
