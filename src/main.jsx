import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// registerType: 'autoUpdate' already activates the new worker immediately.
// Keeping onNeedRefresh here would override the automatic page reload and leave
// installed PWAs on an old bundle until the user accepts a browser dialog.
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
