import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Layout from './components/Layout'
import HomePage from './pages/index/index'
import ExplorersPage from './pages/explorers/index'
import NotFound from './pages/404/index'
import CreateCampaign from '@/pages/app/campaign/start'
import CampaignsPage from '@/pages/campaigns/index'
import ProjectsPage from '@/pages/projects/index'
import DocsPage from '@/pages/docs/index'

import './index.css'
import { AppProvider } from '@/providers/AppProvider'
import CreateProject from '@/pages/app/project/start'
import CampaignView from '@/pages/explorers/campaign/<id>/index'
import ProjectView from '@/pages/explorers/project/<id>'
import CampaignManagePage from '@/pages/app/campaign/manage/<id>/page'
import ProfilePage from '@/pages/app/profile/page'
import EditCampaignDetails from '@/pages/app/campaign/edit'
import EditProjectPage from './pages/app/project/admin/<id>/page'
import VerifyPage from './pages/app/verify/page'
import VoteEmbed from './pages/embed/VoteEmbed'
import CampaignEmbed from './pages/embed/campaign'
import CreateCampaignV2 from './pages/app/v2/create-campaign'
import ProjectViewV2 from './pages/app/v2/explorer/project/[id]/page'
import CampaignViewV2 from './pages/app/v2/explorer/campaign/[id]/page'
import TestTipsPage from './pages/app/v2/test-tips/page'
globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explorer" element={<ExplorersPage />} />
            <Route path="/explore" element={<ExplorersPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            {/* <Route path="/app/v2/campaign-pools" element={<CampaignPoolsPage />} /> */}
            <Route path="/app/v2/create-campaign" element={<CreateCampaignV2 />} />
           
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/docs" element={<DocsPage />} />

            <Route path="/explorer/project/:id" element={<ProjectView />} />
            <Route path="/explorer/campaign/:id" element={<CampaignView />} />

            <Route path="/app/me" element={<ProfilePage />} />
            <Route path="/app/campaign/start" element={<CreateCampaign />} />
            <Route path="/app/campaign/manage/:id" element={<CampaignManagePage />} />
            <Route path="/app/campaign/edit/:id" element={<EditCampaignDetails />} />
            <Route path="/app/project/start" element={<CreateProject />} />
            <Route path="/app/project/edit/:id" element={<EditProjectPage />} />
            <Route path="/app/verify" element={<VerifyPage />} />

            // Embed routes
            <Route path="/embed/:campaignid/:projectid" element={<VoteEmbed />} />
            <Route path="/embed/campaign/:campaignid" element={<CampaignEmbed />} />

            //v2 routes
            <Route path="/v2/explorer/project/:id" element={<ProjectViewV2 />} />
            <Route path="/v2/explorer/campaign/:id" element={<CampaignViewV2 />} />
            <Route path="/app/v2/test-tips" element={<TestTipsPage />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)
