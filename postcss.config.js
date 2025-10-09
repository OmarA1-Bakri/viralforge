import cssToSass from './postcss-css-to-sass.js';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    cssToSass(), // Generate Sass variables from CSS custom properties
    tailwindcss,
    autoprefixer,
  ],
}
