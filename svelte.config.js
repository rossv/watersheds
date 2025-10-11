// svelte.config.js
import preprocess from 'svelte-preprocess';

/**
 * Basic Svelte configuration.  We use svelte-preprocess to enable
 * TypeScript and other language features within our `.svelte` files.
 */
export default {
  preprocess: preprocess()
};