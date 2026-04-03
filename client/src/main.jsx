import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:   '#13131e',
            color:        '#eaeaf8',
            border:       '1px solid #252535',
            borderRadius: '10px',
            fontFamily:   "'Space Grotesk', sans-serif",
            fontSize:     '0.875rem',
          },
          success: { iconTheme: { primary: '#00d084', secondary: '#080810' } },
          error:   { iconTheme: { primary: '#ff5c5c', secondary: '#080810' } },
          duration: 3000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
