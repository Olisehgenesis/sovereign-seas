import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import './index.css'
import { AppProvider } from '@/providers/AppProvider'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/index/page'
import ProjectView from '@/pages/explorer/project/<id>/page'
import CampaignView from '@/pages/explorer/campaign/<id>/page'

globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/explorer/project/:id" element={<Layout><ProjectView /></Layout>} />
          <Route path="/explorer/campaign/:id" element={<Layout><CampaignView /></Layout>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)
