import Link from 'next/link';
import { Metadata } from 'next';
import { Mail, Twitter, Linkedin, Send, MessageCircle, Navigation2 } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';

export const metadata: Metadata = {
  title: 'Contact | SovSeas',
  description: 'Reach the SovSeas collective, Code 3 Spaces, and the builder network that powers the platform.',
};

const studioLinks = [
  {
    title: 'Code 3 Spaces on X',
    href: 'https://x.com/code3spaces?s=21',
    handle: '@code3spaces',
    icon: Twitter,
  },
  {
    title: 'Code 3 Spaces on LinkedIn',
    href: 'https://www.linkedin.com/company/code3spaces/',
    handle: 'code3spaces',
    icon: Linkedin,
  },
];

const builderLinks = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/olisehgenesis',
    handle: 'olisehgenesis',
    icon: Linkedin,
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/illmindofbanana',
    handle: '@illmindofbanana',
    icon: Twitter,
  },
  {
    label: 'Telegram',
    href: 'https://t.me/olisehgenesis',
    handle: 'olisehgenesis',
    icon: MessageCircle,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
        {/* Header Section */}
        <div className="space-y-5 text-center mb-12 sm:mb-16">
          <div className="group relative inline-block">
            <div 
              className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            <div className="relative bg-white sm:border-[0.35em] sm:border-[#2563eb] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 p-6 z-[2]">
              <span className="inline-flex items-center justify-center bg-[#2563eb] text-white px-4 py-2 text-xs font-extrabold tracking-[0.3em] uppercase border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] mb-4">
                SovSeas Contact
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">
                Let&apos;s build open oceans together
              </h1>
              <p className="text-base sm:text-lg text-[#050505] font-semibold leading-relaxed">
                SovSeas is built by Code 3 Spaces, incubated by the Celo Proof of Ship program, and crafted in code by Oliseh Genesis.
                Reach out for partnerships, grants, or operational support.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10">
          {/* Direct Line Card */}
          <div className="group relative">
            <div 
              className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
            <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            <div className="relative bg-white sm:border-[0.35em] sm:border-[#10b981] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 p-6 z-[2]">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Direct line</h2>
                <p className="text-[#050505] font-semibold">
                  Prefer inboxes, not forms? Send mail and we&apos;ll reply within two business days.
                </p>
              </div>

              <div className="space-y-6">
                {/* Email Card */}
                <div className="group/item relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] p-4 sm:p-5 hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#050505] font-extrabold mb-1">Email</p>
                      <p className="text-lg text-[#050505] font-extrabold">innovationsug@gmail.com</p>
                    </div>
                    <Link 
                      href="mailto:innovationsug@gmail.com"
                      className="p-3 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
                    >
                      <Mail className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Contact Form */}
                <form action="mailto:innovationsug@gmail.com" method="POST" className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold placeholder:text-gray-400 focus:outline-none focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold placeholder:text-gray-400 focus:outline-none focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      required
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold placeholder:text-gray-400 focus:outline-none focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all resize-none"
                      placeholder="Your message..."
                    />
                  </div>
                  <ButtonCool
                    type="submit"
                    text="Send note"
                    bgColor="#2563eb"
                    textColor="#ffffff"
                    borderColor="#050505"
                    size="lg"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 ml-2" />
                  </ButtonCool>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 sm:space-y-8">
            {/* Code 3 Spaces Card */}
            <div className="group relative">
              <div 
                className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
              <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
              <div className="relative bg-white sm:border-[0.35em] sm:border-[#a855f7] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 p-6 z-[2]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Built by Code 3 Spaces</h3>
                  <Navigation2 className="h-5 w-5 text-[#a855f7]" />
                </div>
                <p className="text-[#050505] font-semibold mb-6">
                  Strategic studio stewarding SovSeas across research, product, and deployment.
                </p>
                
                <div className="mb-6 p-4 bg-white border-[0.2em] border-[#a855f7] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#050505] font-extrabold mb-2">Incubation</p>
                  <p className="text-sm text-[#050505] font-semibold">
                    Proudly incubated by the Celo Proof of Ship program—anchoring regenerative finance for ocean-positive ventures.
                  </p>
                </div>

                <div className="space-y-3">
                  {studioLinks.map(({ title, href, handle, icon: Icon }) => (
                    <Link
                      key={title}
                      href={href}
                      target="_blank"
                      className="group/link flex items-center justify-between p-4 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-[#050505]">{title}</p>
                        <p className="text-xs text-[#050505] font-semibold">{handle}</p>
                      </div>
                      <Icon className="h-5 w-5 text-[#a855f7]" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Oliseh Genesis Card */}
            <div className="group relative">
              <div 
                className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
              <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
              <div className="relative bg-white sm:border-[0.35em] sm:border-[#2563eb] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 p-6 z-[2]">
                <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Code by Oliseh Genesis</h3>
                <p className="text-[#050505] font-semibold mb-6">
                  Builder, systems designer, and maintainer of the SovSeas codebase.
                </p>
                <div className="space-y-3">
                  {builderLinks.map(({ label, href, handle, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      target="_blank"
                      className="group/link flex items-center justify-between p-4 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-[#050505]">{label}</p>
                        <p className="text-xs text-[#050505] font-semibold">{handle}</p>
                      </div>
                      <Icon className="h-5 w-5 text-[#2563eb]" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Community Channel Card */}
            <div className="group relative">
              <div 
                className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
              <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
              <div className="relative bg-white sm:border-[0.35em] sm:border-[#10b981] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 p-6 z-[2]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[#050505] font-extrabold mb-1">Community channel</p>
                    <p className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Follow SovSeas on X</p>
                    <p className="text-sm text-[#050505] font-semibold">Stay close to voyage logs, bounty drops, and campaign updates.</p>
                  </div>
                  <Link 
                    href="https://x.com/sovseas" 
                    target="_blank"
                    className="inline-flex items-center justify-center"
                  >
                    <ButtonCool
                      text="@sovseas"
                      bgColor="#10b981"
                      textColor="#ffffff"
                      borderColor="#050505"
                      size="md"
                    >
                      <Twitter className="h-4 w-4 ml-2" />
                    </ButtonCool>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
