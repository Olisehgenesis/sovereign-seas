'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function BannerTestPage() {
  const [showBanner, setShowBanner] = useState(true)

  const bannerStyles = [
    {
      name: 'Top Banner',
      component: (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-semibold">🎉 Special Offer!</span>
              <span className="ml-3">Get 50% off on all campaigns this month</span>
            </div>
            <button 
              onClick={() => setShowBanner(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )
    },
    {
      name: 'Info Banner',
      component: (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Info:</strong> Your campaign is performing well with a 15% increase in clicks this week.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Success Banner',
      component: (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <strong>Success:</strong> Campaign published successfully! Your ads are now live.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Warning Banner',
      component: (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> Your campaign budget is running low. Consider adding more funds.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Error Banner',
      component: (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> Failed to publish campaign. Please check your settings and try again.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Promotional Banner',
      component: (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h3 className="text-lg font-bold mb-2">🚀 SovAds Pro Available Now!</h3>
            <p className="text-sm opacity-90 mb-3">Get advanced analytics, priority support, and exclusive features</p>
            <div className="flex justify-center space-x-4">
              <button className="bg-white text-purple-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors">
                Learn More
              </button>
              <button className="border border-white text-white px-4 py-2 rounded-md font-medium hover:bg-white hover:text-purple-600 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Cookie Banner',
      component: (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm">
                We use cookies to enhance your experience and analyze our traffic. By continuing to use our site, you consent to our use of cookies.
              </p>
            </div>
            <div className="ml-4 flex space-x-3">
              <button className="text-gray-300 hover:text-white text-sm underline">
                Privacy Policy
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Accept All
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Settings
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Maintenance Banner',
      component: (
        <div className="bg-orange-100 border border-orange-200 text-orange-800 px-4 py-3">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-orange-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Scheduled Maintenance</p>
              <p className="text-sm">System maintenance scheduled for Sunday 2:00 AM - 4:00 AM UTC. Some features may be temporarily unavailable.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Banner Tests</h1>
            <p className="text-gray-600 mt-2">Test different banner styles and layouts</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowBanner(!showBanner)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {showBanner ? 'Hide' : 'Show'} Top Banner
            </button>
            <Link 
              href="/test"
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Back to Tests
            </Link>
          </div>
        </div>
      </div>

      {/* Top Banner Demo */}
      {showBanner && (
        <div className="mb-8">
          {bannerStyles[0].component}
        </div>
      )}

      {/* Banner Examples */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {bannerStyles.map((banner, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{banner.name}</h3>
                <p className="text-sm text-gray-600">Example implementation and usage</p>
              </div>
              <div className="p-6">
                {banner.component}
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <code className="text-sm text-gray-600">
                  Banner Type: {banner.name.toLowerCase().replace(/\s+/g, '-')}
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
            Banner Test Suite - SovAds UI Components
          </p>
        </div>
      </div>
    </div>
  )
}
