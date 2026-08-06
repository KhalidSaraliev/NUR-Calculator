import type { Config } from 'tailwindcss';

// Токены бренда NUR — тёмно-зелёный/изумрудный + золото + белый (см. ТЗ).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nur: {
          emerald: '#0B3D2E', // sidebar, глубокий фон
          forest: '#146C43', // интерактивный / primary
          sprout: '#1E9E6B', // hover / success
          gold: '#C9A227', // акцент бренда — используется сдержанно
          goldSoft: '#E8D9A0',
          ink: '#101614', // основной текст
          mist: '#F4F7F5', // подложка карточек
          line: '#E3E9E6', // разделители
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 61, 46, 0.06), 0 8px 24px -12px rgba(11, 61, 46, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
