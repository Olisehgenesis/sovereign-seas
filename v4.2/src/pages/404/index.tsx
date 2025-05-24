import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Ship, Home } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <Ship className="h-24 w-24 text-blue-500 mx-auto animate-float" />
        </div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mb-6">Page Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Looks like you've sailed into uncharted waters. The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Home className="h-5 w-5 mr-2" />
          Return Home
        </button>
      </div>
    </div>
  )
}

export default NotFound 