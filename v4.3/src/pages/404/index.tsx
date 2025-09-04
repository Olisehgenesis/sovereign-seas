import { useNavigate } from 'react-router-dom'
import { Ship, Home, Anchor, Waves, Compass, ArrowLeft, Search, MapPin, Wind, Cloud } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <>
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating Islands */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-indigo-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-cyan-400/10 to-teal-400/10 animate-float blur-2xl"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-20 left-20 text-blue-300/20">
          <Anchor className="h-8 w-8 animate-float-slow" />
        </div>
        <div className="absolute top-32 right-32 text-cyan-300/20">
          <Compass className="h-6 w-6 animate-float" />
        </div>
        <div className="absolute bottom-40 left-16 text-blue-300/20">
          <Wind className="h-10 w-10 animate-float-slower" />
        </div>
        <div className="absolute bottom-20 right-20 text-indigo-300/20">
          <Cloud className="h-12 w-12 animate-float-slow" />
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="text-center max-w-2xl mx-auto">
          
          {/* Main Ship Icon with Enhanced Animation */}
          <div className="mb-12 relative">
            <div className="relative inline-block">
              {/* Ship Shadow/Wake */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-blue-200/30 rounded-full blur-sm animate-pulse-slow"></div>
              
              {/* Main Ship */}
              <div className="relative">
                <Ship className="h-32 w-32 text-blue-500 mx-auto animate-float drop-shadow-lg" />
                
                {/* Floating particles around ship */}
                <div className="absolute -top-2 -right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <div className="absolute -bottom-2 -left-2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping delay-300"></div>
                <div className="absolute top-1/2 -right-4 w-1 h-1 bg-indigo-400 rounded-full animate-ping delay-700"></div>
              </div>
              
              {/* Wave Effects */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                <Waves className="h-4 w-4 text-blue-300 animate-bounce delay-100" />
                <Waves className="h-3 w-3 text-cyan-300 animate-bounce delay-300" />
                <Waves className="h-4 w-4 text-blue-300 animate-bounce delay-500" />
              </div>
            </div>
          </div>

          {/* 404 Text with Gradient */}
          <div className="mb-6">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent animate-pulse-slow">
              404
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-4 animate-pulse"></div>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 animate-fade-in-up">
            Lost at Sea
          </h2>

          {/* Subheading with Icon */}
          <div className="flex items-center justify-center mb-6 animate-fade-in-up delay-200">
            <MapPin className="h-5 w-5 text-blue-500 mr-2 animate-pulse" />
            <h3 className="text-xl text-gray-600 font-medium">Uncharted Waters</h3>
          </div>

          {/* Description */}
          <p className="text-gray-500 mb-10 max-w-md mx-auto leading-relaxed animate-fade-in-up delay-300">
            Ahoy! It seems you've sailed beyond the known seas. The page you're searching for has drifted away with the tide.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-500">
            {/* Go Home Button */}
            <button
              onClick={() => navigate('/')}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 font-medium"
            >
              <Home className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
              Return to Harbor
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Go Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="group inline-flex items-center px-8 py-4 bg-white text-gray-700 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 font-medium"
            >
              <ArrowLeft className="h-5 w-5 mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
              Go Back
            </button>
          </div>

          {/* Additional Help Section */}
          <div className="mt-12 p-6 bg-blue-50/50 backdrop-blur-sm rounded-2xl border border-blue-100/50 animate-fade-in-up delay-700">
            <div className="flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-700">Need Help Navigating?</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Try exploring our main sections or search for what you need.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => navigate('/explorer')}
                className="px-4 py-2 text-sm bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition-colors duration-200"
              >
                Explorer
              </button>
              <button
                onClick={() => navigate('/campaigns')}
                className="px-4 py-2 text-sm bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition-colors duration-200"
              >
                Campaigns
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="px-4 py-2 text-sm bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition-colors duration-200"
              >
                Documentation
              </button>
            </div>
          </div>
        </div>
      </div>

    
    </>
  )
}

export default NotFound