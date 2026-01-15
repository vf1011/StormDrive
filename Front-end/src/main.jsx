import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { supabase } from './supabase.jsx'; 
import App from './App.jsx'
import { LoadingProvider } from  './web/components/Hooks/LoadingContext.jsx';
import { FileProvider } from './web/components/Hooks/FileContext.jsx';


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
        <LoadingProvider>
          <FileProvider>
              <App />
          </FileProvider>
        </LoadingProvider>
    </BrowserRouter>
  </React.StrictMode>,
);