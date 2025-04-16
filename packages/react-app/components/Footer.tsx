type Props = {
  className?: string;
};

const navigation = [
  {
    name: 'Twitter',
    href: 'https://twitter.com/illmindofbanana',
    icon: (props: Props) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    href: 'https://github.com/Olisehgenesis/sovereign-seas',
    icon: (props: Props) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-white/90 backdrop-blur-sm mt-auto border-t border-blue-100 relative overflow-hidden">
      {/* Wave pattern background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="wave" x="0" y="0" width="120" height="20" patternUnits="userSpaceOnUse">
              <path 
                d="M0 10 Q30 20 60 10 Q90 0 120 10 V30 H0 Z" 
                fill="#4F46E5" 
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wave)" />
        </svg>
      </div>
      
      <div className="mx-auto max-w-7xl py-4 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8 relative">
        <div className="flex justify-center space-x-4 md:order-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-blue-500 hover:text-indigo-600 transition-all hover:-translate-y-1 transform flex items-center justify-center h-8 w-8 bg-blue-50 rounded-full border border-blue-100 shadow-sm hover:shadow-md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </a>
          ))}
        </div>
        <div className="mt-2 md:order-1 md:mt-0">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Developed with <span className="inline-block animate-pulse text-blue-500">⚓</span> by <span className="tilt-neon bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 font-bold">Oliseh GENESIS</span>
          </p>
        </div>
      </div>
           
      {/* Animated gradient line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 animate-gradient-x"></div>
      
      {/* Decorative dots */}
      <div className="absolute bottom-0 left-0 w-24 h-12 pointer-events-none opacity-20">
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-blue-500"></div>
        <div className="absolute bottom-6 left-8 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
        <div className="absolute bottom-3 left-14 w-1 h-1 rounded-full bg-blue-400"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-12 pointer-events-none opacity-20">
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
        <div className="absolute bottom-6 right-8 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
        <div className="absolute bottom-3 right-14 w-1 h-1 rounded-full bg-blue-400"></div>
      </div>
    </footer>
  );
}