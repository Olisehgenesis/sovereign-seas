import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import './index.css'
import { AppProvider } from '@/providers/AppProvider'
import Layout from '@/components/layout/Layout'
import HomePage from '@/legacy-pages/index/page'
import ProjectView from '@/legacy-pages/explorer/project/<id>/page'
import CampaignView from '@/legacy-pages/explorer/campaign/<id>/page'
import ProjectsPage from '@/legacy-pages/explorer/projects/page'
import LeaderboardPage from '@/legacy-pages/explorer/leaderboard/page'
import CampaignsPage from '@/legacy-pages/explorer/campaigns/page'
import GrantsPage from '@/legacy-pages/explorer/grants/page'
import GrantView from '@/legacy-pages/explorer/grant/<id>/page'
import UserProfilePage from '@/legacy-pages/explorer/user/<address>/page'
import CreateGrant from '@/legacy-pages/app/grant/create'
import CreateProject from '@/legacy-pages/app/project/start'
import ProjectEdit from '@/legacy-pages/app/project/<id>/edit'
import CreateCampaign from '@/legacy-pages/app/campaign/start'
import CampaignManage from '@/legacy-pages/app/campaign/<id>/manage'
import CampaignEdit from '@/legacy-pages/app/campaign/<id>/edit'
import ProfilePage from '@/legacy-pages/app/profile/page'
import TasksPage from '@/legacy-pages/app/tasks/page'
import BackofficePage from '@/legacy-pages/app/backoffice/page'
import NotFound from '@/legacy-pages/404/page'


globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />

          {/* Explorer */}
          <Route path="/explorer/project/:id" element={<Layout><ProjectView /></Layout>} />
          <Route path="/explorer/campaign/:id" element={<Layout><CampaignView /></Layout>} />
          <Route path="/explorer/projects" element={<Layout><ProjectsPage /></Layout>} />
          <Route path="/explorer/campaigns" element={<Layout><CampaignsPage /></Layout>} />
          <Route path="/explorer/grants" element={<Layout><GrantsPage /></Layout>} />
          <Route path="/explorer/grant/:id" element={<Layout><GrantView /></Layout>} />
          <Route path="/explorer/user/:address" element={<Layout><UserProfilePage /></Layout>} />
          <Route path="/explorer/leaderboard" element={<Layout><LeaderboardPage /></Layout>} />

          {/* App */}
          <Route path="/app/project/start" element={<Layout><CreateProject /></Layout>} />
          <Route path="/app/project/edit/:id" element={<Layout><ProjectEdit /></Layout>} />
          <Route path="/app/campaign/start" element={<Layout><CreateCampaign /></Layout>} />
          <Route path="/app/grant/create" element={<Layout><CreateGrant /></Layout>} />
          <Route path="/app/campaign/manage/:id" element={<Layout><CampaignManage /></Layout>} />
          <Route path="/app/campaign/edit/:id" element={<Layout><CampaignEdit /></Layout>} />

          <Route path="/app/profile" element={<Layout><ProfilePage /></Layout>} />
          <Route path="/app/me" element={<Navigate to="/app/profile" replace />} />
          <Route path="/app/tasks" element={<Layout><TasksPage /></Layout>} />
          <Route path="/app/backoffice" element={<Layout><BackofficePage /></Layout>} />

          {/* 404 Route */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />

        </Routes>
        </BrowserRouter>
      </AppProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
