import Link from 'next/link'

export default function TestIndex() {
  const testPages = [
    {
      title: 'Banner Tests',
      description: 'Test different banner styles and layouts',
      href: '/test/banners',
      color: 'bg-blue-500'
    },
    {
      title: 'Alert Tests',
      description: 'Test various alert types and states',
      href: '/test/alerts',
      color: 'bg-yellow-500'
    },
    {
      title: 'Button Tests',
      description: 'Test different button styles and interactions',
      href: '/test/buttons',
      color: 'bg-green-500'
    },
    {
      title: 'Form Tests',
      description: 'Test form components and validation',
      href: '/test/forms',
      color: 'bg-purple-500'
    },
    {
      title: 'Card Tests',
      description: 'Test different card layouts and designs',
      href: '/test/cards',
      color: 'bg-red-500'
    },
    {
      title: 'Navigation Tests',
      description: 'Test navigation components and layouts',
      href: '/test/navigation',
      color: 'bg-indigo-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SovAds UI Test Suite</h1>
            <p className="text-gray-600 mt-2">Test and preview different UI components</p>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* Test Pages Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testPages.map((page, index) => (
            <Link
              key={index}
              href={page.href}
              className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${page.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">
                      {page.title.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {page.title}
                    </h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  {page.description}
                </p>
                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                  View Tests
                  <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            SovAds UI Test Suite - Component Testing & Preview
          </p>
        </div>
      </div>
    </div>
  )
}
