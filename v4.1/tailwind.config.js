/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom Sovereign Seas colors
        'ss-blue': '#0078D7',
        'ss-blue-light': '#4DA3FF',
        'ss-blue-dark': '#00509E',
        'ss-sky-light': '#E8F5FF',
        'ss-sky-medium': '#C7E5FF',
        'ss-sky-dark': '#A9D6FF',
        'ss-navy': '#003366',
        'ss-text': '#2E3338',
        'ss-text-light': '#666666',
        // Original theme colors
        prosperity: "#FCFF52",
        forest: "#476520",
        gypsum: "#FCF6F1",
        sand: "#E7E3D4",
        wood: "#655947",
        fig: "#1E002B",
        snow: "#FFFFFF",
        onyx: "#000000",
        success: "#329F3B",
        error: "#E70532",
        disabled: "#9B9B9B",
        sky: "#7CC0FF",
        citrus: "#FF9A51",
        lotus: "#FFA3EB",
        lavender: "#B490FF",
      },
      fontFamily: {
        'tilt-neon': ['Tilt Neon', 'Playfair Display', 'serif'],
        'inter': ['Inter', 'Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'ss-card': '0 10px 25px rgba(0, 120, 215, 0.1)',
        'ss-card-hover': '0 20px 40px rgba(0, 120, 215, 0.15)',
      },
      borderRadius: {
        'ss': '12px',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-slower': 'float 8s ease-in-out infinite',
        'pulse-blue': 'pulse-blue 2s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-blue': {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 120, 215, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(0, 120, 215, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 120, 215, 0)' },
        },
      },
    },
  },
  plugins: [],
};
