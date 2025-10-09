// NOTE: Color generation now handled by prebuild script (scripts/generate-sass-colors.js)
// import cssToSass from './postcss-css-to-sass.js';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    // cssToSass(), // DISABLED - using prebuild script instead to avoid conflicts
    tailwindcss,
    autoprefixer,
  ],
}
