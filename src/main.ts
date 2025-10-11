import App from './App.svelte';
import 'leaflet/dist/leaflet.css';

// Instantiate the Svelte application at the `app` div defined in index.html.
const app = new App({ target: document.getElementById('app')! });

export default app;