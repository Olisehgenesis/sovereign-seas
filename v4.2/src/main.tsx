import { Buffer } from 'buffer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Layout from './components/Layout'
import HomePage from './pages/index/index'
import ExplorersPage from './pages/explorers/index'
import NotFound from './pages/404/index'
import CreateCampaign from '@/pages/app/campaign/start'


import './index.css'
import { AppProvider } from '@/providers/AppProvider'
import CreateProject from '@/pages/app/project/start'
import CampaignView from '@/pages/explorers/campaign/<id>'
import ProjectView from '@/pages/explorers/project/<id>'
import CampaignManagePage from '@/pages/app/campaign/manage/<id>/page'

globalThis.Buffer = Buffer

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explorer" element={<ExplorersPage />} />

            <Route path="/explorer/project/:id" element={<ProjectView />} />
            <Route path="/explorer/campaign/:id" element={<CampaignView />} />
            <Route path="/app/campaign/start" element={<CreateCampaign />} />
            <Route path="/app/campaign/manage/:id" element={<CampaignManagePage />} />
            <Route path="/app/project/start" element={<CreateProject />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)
