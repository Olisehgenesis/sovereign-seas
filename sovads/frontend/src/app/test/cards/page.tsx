'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function CardTestPage() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null)

  const cardExamples = [
    {
      name: 'Basic Card',
      description: 'Simple card with title, content, and action',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Performance</h3>
            <p className="text-gray-600 mb-4">
              Your campaign is performing well with a 15% increase in clicks this week.
            </p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View Details →
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Card with Image',
      description: 'Card featuring an image header',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">SovAds</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Featured Campaign</h3>
            <p className="text-gray-600 mb-4">
              Boost your reach with our premium advertising platform.
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Active</span>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Stats Card',
      description: 'Card displaying key metrics and statistics',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
              <span className="text-green-600 text-sm font-medium">+12.5%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">$24,567</div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Up from last month
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Interactive Card',
      description: 'Card with hover effects and interactive elements',
      component: (
        <div 
          className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
            selectedCard === 1 ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
          onClick={() => setSelectedCard(selectedCard === 1 ? null : 1)}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Publisher Account</h3>
              <div className={`w-3 h-3 rounded-full ${selectedCard === 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>
            <p className="text-gray-600 mb-4">
              Manage your publisher settings and view analytics.
            </p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors">
                Settings
              </button>
              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors">
                Analytics
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Card with Badge',
      description: 'Card featuring status badges and labels',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Status</h3>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Your campaign is running successfully and reaching your target audience.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-medium">1,234</span> impressions
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">56</span> clicks
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Card with Actions',
      description: 'Card with multiple action buttons',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Management</h3>
            <p className="text-gray-600 mb-4">
              Manage your advertising campaigns and track performance.
            </p>
            <div className="flex space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                Edit
              </button>
              <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
                Duplicate
              </button>
              <button className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Card Grid Layout',
      description: 'Multiple cards in a grid layout',
      component: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Impressions</h4>
                <p className="text-xs text-gray-500">Total views</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">12,345</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Clicks</h4>
                <p className="text-xs text-gray-500">Total clicks</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">567</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Revenue</h4>
                <p className="text-xs text-gray-500">Total earnings</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">$1,234</div>
          </div>
        </div>
      )
    },
    {
      name: 'Card with Progress',
      description: 'Card showing progress bars and completion status',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Progress</h3>
              <span className="text-sm text-gray-500">75% Complete</span>
            </div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Budget Used</span>
                <span className="font-medium">$7,500 / $10,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Days Remaining</span>
                <span className="font-medium">7 days</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Card with Tabs',
      description: 'Card with tabbed content sections',
      component: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button className="px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                Overview
              </button>
              <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                Analytics
              </button>
              <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                Settings
              </button>
            </nav>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Overview</h3>
            <p className="text-gray-600 mb-4">
              Your campaign is performing well with steady growth in impressions and clicks.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1,234</div>
                <div className="text-sm text-gray-500">Impressions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">56</div>
                <div className="text-sm text-gray-500">Clicks</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Card Tests</h1>
            <p className="text-gray-600 mt-2">Test different card layouts and designs</p>
          </div>
          <Link 
            href="/test"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>

      {/* Card Examples */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {cardExamples.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{card.name}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
              <div className="p-6">
                {card.component}
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <code className="text-sm text-gray-600">
                  Card Type: {card.name.toLowerCase().replace(/\s+/g, '-')}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Card Test Suite - SovAds UI Components
          </p>
        </div>
      </div>
    </div>
  )
}
