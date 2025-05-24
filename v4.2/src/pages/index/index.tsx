import React, { useEffect } from 'react'

const HomePage = () => {
  useEffect(() => {
    console.log('HomePage mounted')
  }, [])

  try {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome to Sovereign Seas</h1>
        <p>Here we are - Home Page</p>
      </div>
    )
  } catch (error) {
    console.error('Error rendering HomePage:', error)
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Page</h1>
        <p className="text-red-500">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
      </div>
    )
  }
}

export default HomePage 