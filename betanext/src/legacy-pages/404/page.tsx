import { useNavigate } from '@/utils/nextAdapter'
import { Home, ArrowLeft, Search, FileX, ChevronRight } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-4">
            <FileX className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* 404 Text */}
        <div className="mb-6">
          <h1 className="text-6xl md:text-7xl font-bold text-primary mb-2">
            404
          </h1>
          <div className="h-1 w-16 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Main Heading */}
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          {/* Go Home Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </button>

          {/* Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-6 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Section */}
        <div className="p-6 bg-card rounded-2xl border">
          <div className="flex items-center justify-center mb-3">
            <Search className="h-5 w-5 text-primary mr-2" />
            <h4 className="text-lg font-semibold text-card-foreground">Explore Our Platform</h4>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Discover projects and campaigns on our platform.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => navigate('/explorer/projects')}
              className="inline-flex items-center px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/90 transition-colors"
            >
              Projects
              <ChevronRight className="ml-1 h-3 w-3" />
            </button>
            <button
              onClick={() => navigate('/explorer/campaigns')}
              className="inline-flex items-center px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/90 transition-colors"
            >
              Campaigns
              <ChevronRight className="ml-1 h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound