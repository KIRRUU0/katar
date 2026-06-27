/**
 * Tailwind config — restrict `content` paths so generated CSS is limited
 * to actual project files (reduces produced CSS size for Lighthouse).
 */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
