import { useNavigate } from '@/utils/nextAdapter'
import { Home, ArrowLeft, Search, FileX, ChevronRight } from 'lucide-react'
import { ButtonCool } from '@/components/ui/button-cool'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white">
      <div className="text-center max-w-2xl mx-auto">
        {/* Main 404 Card */}
        <div className="group relative mb-8">
          {/* Pattern Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          {/* Main Card */}
          <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-8 sm:p-12 transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            {/* Accent Corner */}
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">!</div>
            
            <div className="relative z-[2]">
              {/* 404 Icon */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] bg-white mb-4">
                  <FileX className="h-12 w-12 sm:h-16 sm:w-16 text-[#050505]" />
                </div>
              </div>

              {/* 404 Text */}
              <div className="mb-6">
                <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">
                  404
                </h1>
                <div className="h-[0.3em] w-24 bg-[#050505] mx-auto"></div>
              </div>

              {/* Main Heading */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">
                Page Not Found
              </h2>

              {/* Description */}
              <p className="text-[#050505] mb-8 max-w-md mx-auto leading-relaxed font-semibold text-base sm:text-lg">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <ButtonCool
            onClick={() => navigate('/')}
            text="Go Home"
            bgColor="#2563eb"
            hoverBgColor="#1d4ed8"
            borderColor="#050505"
            textColor="#ffffff"
            size="md"
            className="flex items-center justify-center"
          >
            <Home className="ml-2 w-4 h-4" />
          </ButtonCool>

          <ButtonCool
            onClick={() => navigate(-1)}
            text="Go Back"
            bgColor="#6b7280"
            hoverBgColor="#4b5563"
            borderColor="#050505"
            textColor="#ffffff"
            size="md"
            className="flex items-center justify-center"
          >
            <ArrowLeft className="ml-2 w-4 h-4" />
          </ButtonCool>
        </div>

        {/* Help Section */}
        <div className="group relative">
          {/* Pattern Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] p-6 sm:p-8 transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[0.7em_0.7em_0_#000000] group-hover:-translate-x-[0.3em] group-hover:-translate-y-[0.3em]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            {/* Accent Corner */}
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative z-[2]">
              <div className="flex items-center justify-center mb-4">
                <div className="border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-2 mr-3">
                  <Search className="h-5 w-5 text-[#050505]" />
                </div>
                <h4 className="text-lg sm:text-xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Explore Our Platform</h4>
              </div>
              <p className="text-[#050505] text-sm sm:text-base mb-6 font-semibold">
                Discover projects and campaigns on our platform.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonCool
                  onClick={() => navigate('/explorer/projects')}
                  text="Projects"
                  bgColor="#a855f7"
                  hoverBgColor="#9333ea"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                  className="flex items-center justify-center"
                >
                  <ChevronRight className="ml-1 h-3 w-3" />
                </ButtonCool>
                <ButtonCool
                  onClick={() => navigate('/explorer/campaigns')}
                  text="Campaigns"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                  className="flex items-center justify-center"
                >
                  <ChevronRight className="ml-1 h-3 w-3" />
                </ButtonCool>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound