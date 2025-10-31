'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ButtonTestPage() {
  const [loading, setLoading] = useState(false)
  const [disabled, setDisabled] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  const buttonStyles = [
    {
      name: 'Primary Buttons',
      description: 'Main action buttons with different sizes',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              Small
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
              Medium
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
              Large
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Disabled
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              With Icon
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Secondary Buttons',
      description: 'Secondary action buttons with outline style',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
              Small
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">
              Medium
            </button>
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">
              Large
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Disabled
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              With Icon
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Success Buttons',
      description: 'Success state buttons for positive actions',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
              Save
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors">
              Confirm
            </button>
            <button className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors">
              Publish Campaign
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Success Action
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Danger Buttons',
      description: 'Danger state buttons for destructive actions',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
              Delete
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors">
              Remove
            </button>
            <button className="px-6 py-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors">
              Cancel Campaign
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Item
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Loading Buttons',
      description: 'Buttons with loading states and spinners',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleLoadingDemo}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Loading...' : 'Start Loading'}
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Icon Buttons',
      description: 'Buttons with only icons for compact interfaces',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-100 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Button Groups',
      description: 'Groups of related buttons',
      component: (
        <div className="space-y-4">
          <div className="flex">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-l-md font-medium hover:bg-blue-700 transition-colors">
              Left
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white border-l border-blue-700 font-medium hover:bg-blue-700 transition-colors">
              Center
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-r-md border-l border-blue-700 font-medium hover:bg-blue-700 transition-colors">
              Right
            </button>
          </div>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
              Save
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Floating Action Buttons',
      description: 'Floating buttons for quick actions',
      component: (
        <div className="space-y-4">
          <div className="relative h-32 bg-gray-100 rounded-lg">
            <button className="absolute bottom-4 right-4 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <div className="relative h-32 bg-gray-100 rounded-lg">
            <button className="absolute bottom-4 right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
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
            <h1 className="text-3xl font-bold text-gray-900">Button Tests</h1>
            <p className="text-gray-600 mt-2">Test different button styles and interactions</p>
          </div>
          <Link 
            href="/test"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>

      {/* Button Examples */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {buttonStyles.map((button, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{button.name}</h3>
                <p className="text-sm text-gray-600">{button.description}</p>
              </div>
              <div className="p-6">
                {button.component}
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <code className="text-sm text-gray-600">
                  Button Type: {button.name.toLowerCase().replace(/\s+/g, '-')}
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
            Button Test Suite - SovAds UI Components
          </p>
        </div>
      </div>
    </div>
  )
}
