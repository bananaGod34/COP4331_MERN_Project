import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// import mobile drag-and-drop because it's annoying
import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css";

polyfill({
  dragImageCenterOnTouch: true
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
