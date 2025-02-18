// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        ping: {
          '75%, 100%': {
            transform: 'scale(1.5)',
            opacity: '0',
          },
        },
      },
      transitionDelay: {
        '75': '75ms',
        '150': '150ms',
        '225': '225ms',
        '300': '300ms',
        '375': '375ms',
        '450': '450ms',
        '525': '525ms',
        '600': '600ms',
        '675': '675ms',
      },
    },
  },
  plugins: [],
}
