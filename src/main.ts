import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

// Register the network-only service worker on production deployments.
// The app remains installable, but deliberately does not support offline use.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
      .catch(error => console.error('PWA service worker registration failed:', error))
  }, { once: true })
}
