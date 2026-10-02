import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/vt323'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
import './styles/global.css'
import App from './App.tsx'
import { isDesktop } from './desktop'

if (isDesktop) document.documentElement.dataset.shell = 'desktop'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
