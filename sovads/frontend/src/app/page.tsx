import Link from 'next/link'
import BannerAdPreview from '@/components/ads/BannerAdPreview'

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Ads that pay, simple and transparent
            </h1>
            <p className="text-lg sm:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto lg:mx-0">
              One lightweight SDK. Publishers earn when sites are ready. Advertisers get verifiable reach.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link href="/advertiser" className="btn btn-primary px-8 py-3">
                Run an Ad Campaign
              </Link>
              <Link href="/publisher" className="btn btn-outline px-8 py-3">
                Start Earning
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-foreground/70">
              <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
              <span className="opacity-40">•</span>
              <Link href="/sdk-demo.html" className="hover:text-foreground">Developer Docs</Link>
              <span className="opacity-40">•</span>
              <Link href="/sdk-demo.html#demo" className="hover:text-foreground">SDK Demo</Link>
            </div>
          </div>

          {/* Right code snippet - top right like SovSeas */}
          <div className="hidden sm:block">
            <div className="max-w-2xl ml-auto rounded-2xl overflow-hidden shadow-sm border border-border">
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                <span className="ml-2 text-xs text-neutral-400">snippet.ts</span>
              </div>
              <pre className="bg-neutral-950 text-neutral-100 text-sm leading-6 p-4 overflow-x-auto">
                <code>
                  <span className="text-white">{`// Site ID auto-detected from domain`}</span>{'\n'}
                  <span className="text-primary">const</span> adsClient = <span className="text-accent">new</span> SovAds(<span className="text-blue-400">publicId</span>);{'\n'}
                  <span className="text-primary">const</span> banner = <span className="text-accent">new</span> Banner(adsClient, <span className="text-green-400">&apos;banner&apos;</span>);{'\n'}
                  <span className="text-primary">await</span> banner.render(); <span className="text-neutral-400">{`// renders after site ready`}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-semibold mb-4 text-center">Live SovAds Preview</h2>
        <BannerAdPreview className="min-h-[200px] rounded-2xl border border-border bg-card" />
      </section>
    </div>
  )
}