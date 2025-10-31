'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function AlertTestPage() {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'success', message: 'Campaign created successfully!', show: true },
    { id: 2, type: 'error', message: 'Failed to load campaign data', show: true },
    { id: 3, type: 'warning', message: 'Low budget remaining', show: true },
    { id: 4, type: 'info', message: 'New features available', show: true }
  ])

  const dismissAlert = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, show: false } : alert
    ))
  }

  const addAlert = (type: string) => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'An error occurred while processing',
      warning: 'Please review your settings',
      info: 'New information available'
    }
    
    const newAlert = {
      id: Date.now(),
      type,
      message: messages[type as keyof typeof messages],
      show: true
    }
    
    setAlerts([...alerts, newAlert])
  }

  const AlertComponent = ({ alert }: { alert: typeof alerts[0] }) => {
    if (!alert.show) return null

    const baseClasses = "p-4 rounded-md border-l-4 flex items-start"
    const typeClasses = {
      success: "bg-green-50 border-green-400 text-green-700",
      error: "bg-red-50 border-red-400 text-red-700",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-700",
      info: "bg-blue-50 border-blue-400 text-blue-700"
    }

    const icons = {
      success: (
        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      error: (
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      warning: (
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      info: (
        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    }

    return (
      <div className={`${baseClasses} ${typeClasses[alert.type as keyof typeof typeClasses]}`}>
        <div className="flex-shrink-0 mr-3">
          {icons[alert.type as keyof typeof icons]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
        <div className="flex-shrink-0 ml-3">
          <button
            onClick={() => dismissAlert(alert.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const alertExamples = [
    {
      name: 'Success Alert',
      description: 'Used for successful operations and confirmations',
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
                <strong>Success!</strong> Your campaign has been published and is now live.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Error Alert',
      description: 'Used for errors and failed operations',
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
                <strong>Error:</strong> Unable to connect to the server. Please try again later.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Warning Alert',
      description: 'Used for warnings and important notices',
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
      name: 'Info Alert',
      description: 'Used for informational messages and tips',
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
                <strong>Info:</strong> New features are available! Check out our latest updates.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Dismissible Alert',
      description: 'Alert with close button functionality',
      component: (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-gray-700">
                <strong>Notice:</strong> This alert can be dismissed by clicking the X button.
              </p>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Alert with Actions',
      description: 'Alert with action buttons',
      component: (
        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-indigo-700 mb-2">
                <strong>Action Required:</strong> Please verify your email address to continue.
              </p>
              <div className="flex space-x-3">
                <button className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700 transition-colors">
                  Verify Email
                </button>
                <button className="text-indigo-600 text-xs font-medium hover:text-indigo-800 transition-colors">
                  Resend Email
                </button>
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
            <h1 className="text-3xl font-bold text-gray-900">Alert Tests</h1>
            <p className="text-gray-600 mt-2">Test different alert types and interactions</p>
          </div>
          <Link 
            href="/test"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>

      {/* Interactive Alert Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Interactive Alert Demo</h3>
            <p className="text-sm text-gray-600">Add and dismiss alerts dynamically</p>
          </div>
          <div className="p-6">
            <div className="flex space-x-3 mb-4">
              <button 
                onClick={() => addAlert('success')}
                className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Add Success
              </button>
              <button 
                onClick={() => addAlert('error')}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Add Error
              </button>
              <button 
                onClick={() => addAlert('warning')}
                className="px-3 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Add Warning
              </button>
              <button 
                onClick={() => addAlert('info')}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add Info
              </button>
            </div>
            <div className="space-y-3">
              {alerts.map(alert => (
                <AlertComponent key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>

        {/* Alert Examples */}
        <div className="space-y-8">
          {alertExamples.map((alert, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{alert.name}</h3>
                <p className="text-sm text-gray-600">{alert.description}</p>
              </div>
              <div className="p-6">
                {alert.component}
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <code className="text-sm text-gray-600">
                  Alert Type: {alert.name.toLowerCase().replace(/\s+/g, '-')}
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
            Alert Test Suite - SovAds UI Components
          </p>
        </div>
      </div>
    </div>
  )
}
