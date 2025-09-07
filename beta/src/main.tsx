import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import './index.css'
import { AppProvider } from '@/providers/AppProvider'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/index/page'
import ProjectView from '@/pages/explorer/project/<id>/page'
import CampaignView from '@/pages/explorer/campaign/<id>/page'
import ProjectsPage from '@/pages/explorer/projects/page'
import CampaignsPage from '@/pages/explorer/campaigns/page'
import CreateProject from '@/pages/app/project/start'
import CreateCampaign from '@/pages/app/campaign/start'
import ProfilePage from '@/pages/app/profile/page'
import NotFound from '@/pages/404/page'


globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />

          {/* Explorer */}
          <Route path="/explorer/project/:id" element={<Layout><ProjectView /></Layout>} />
          <Route path="/explorer/campaign/:id" element={<Layout><CampaignView /></Layout>} />
          <Route path="/explorer/projects" element={<Layout><ProjectsPage /></Layout>} />
          <Route path="/explorer/campaigns" element={<Layout><CampaignsPage /></Layout>} />

          {/* App */}
          <Route path="/app/project/start" element={<Layout><CreateProject /></Layout>} />
          <Route path="/app/campaign/start" element={<Layout><CreateCampaign /></Layout>} />

          <Route path="/app/profile" element={<Layout><ProfilePage /></Layout>} />
          <Route path="/app/me" element={<Navigate to="/app/profile" replace />} />

          {/* 404 Route */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />

        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)
