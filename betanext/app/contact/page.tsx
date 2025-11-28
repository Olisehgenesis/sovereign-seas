import Link from 'next/link';
import { Metadata } from 'next';
import { Mail, Twitter, Linkedin, Send, MessageCircle, Navigation2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    <div className="min-h-screen bg-transparent text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="space-y-5 text-center mb-16">
          <span className="inline-flex items-center justify-center rounded-full border border-white/25 bg-black/60 px-5 py-1 text-[10px] font-semibold tracking-[0.35em] text-gray-200 uppercase">
            SovSeas Contact
          </span>
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-black/50 px-6 py-6 backdrop-blur-2xl">
            <h1 className="text-4xl sm:text-5xl font-semibold text-white mb-4">Let&apos;s build open oceans together</h1>
            <p className="text-sm text-gray-200">
              SovSeas is built by Code 3 Spaces, incubated by the Celo Proof of Ship program, and crafted in code by Oliseh Genesis.
              Reach out for partnerships, grants, or operational support.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          <Card className="border border-white/30 bg-black/60 backdrop-blur-2xl text-white rounded-3xl px-8 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl font-semibold">Direct line</CardTitle>
              <CardDescription className="text-gray-400">
                Prefer inboxes, not forms? Send mail and we&apos;ll reply within two business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-black/40 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Email</p>
                  <p className="text-lg text-white font-medium">innovationsug@gmail.com</p>
                </div>
                <Button asChild size="icon" variant="outline" className="rounded-full border-white/60 text-white hover:bg-white hover:text-black">
                  <Link href="mailto:innovationsug@gmail.com">
                    <Mail className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <form action="mailto:innovationsug@gmail.com" method="POST" className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-100">Name</Label>
                  <Input id="name" name="name" required className="mt-2 border-white/30 bg-black/40 text-white placeholder:text-gray-500 focus-visible:ring-white" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-100">Email</Label>
                  <Input id="email" name="email" type="email" required className="mt-2 border-white/30 bg-black/40 text-white placeholder:text-gray-500 focus-visible:ring-white" />
                </div>
                <div>
                  <Label htmlFor="message" className="text-gray-100">Message</Label>
                  <Textarea id="message" name="message" rows={4} required className="mt-2 border-white/30 bg-black/40 text-white placeholder:text-gray-500 focus-visible:ring-white" />
                </div>
                <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200 rounded-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send note
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border border-white/30 rounded-3xl bg-black/55 backdrop-blur-2xl text-white shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Built by Code 3 Spaces
                  <Navigation2 className="h-5 w-5 text-gray-400" />
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Strategic studio stewarding SovSeas across research, product, and deployment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/25 p-4 bg-black/40">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Incubation</p>
                  <p className="text-sm text-gray-200">
                    Proudly incubated by the Celo Proof of Ship program—anchoring regenerative finance for ocean-positive ventures.
                  </p>
                </div>
                <div className="space-y-3">
                  {studioLinks.map(({ title, href, handle, icon: Icon }) => (
                    <Link
                      key={title}
                      href={href}
                      target="_blank"
                      className="flex items-center justify-between rounded-2xl border border-white/25 px-4 py-3 bg-black/35 hover:bg-black/25 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{title}</p>
                        <p className="text-xs text-gray-400">{handle}</p>
                      </div>
                      <Icon className="h-4 w-4 text-gray-300" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/30 rounded-3xl bg-black/65 backdrop-blur-2xl text-white">
              <CardHeader>
                <CardTitle>Code by Oliseh Genesis</CardTitle>
                <CardDescription className="text-gray-400">
                  Builder, systems designer, and maintainer of the SovSeas codebase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {builderLinks.map(({ label, href, handle, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    target="_blank"
                    className="flex items-center justify-between rounded-2xl border border-white/25 px-4 py-3 bg-black/35 hover:bg-black/25 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-gray-400">{handle}</p>
                    </div>
                    <Icon className="h-4 w-4 text-gray-300" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/25 rounded-3xl bg-black/50 backdrop-blur-2xl text-white">
              <CardContent className="py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Community channel</p>
                  <p className="text-lg font-semibold text-white">Follow SovSeas on X</p>
                  <p className="text-sm text-gray-400">Stay close to voyage logs, bounty drops, and campaign updates.</p>
                </div>
                <Button asChild className="bg-white text-black rounded-full hover:bg-gray-200">
                  <Link href="https://x.com/sovseas" target="_blank">
                    <Twitter className="h-4 w-4 mr-2" />
                    @sovseas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

