
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { env } from './utils/env'

// Log environment information in development mode
if (env.isDev()) {
  console.log('Running in development mode');
  console.log('App name:', env.appName);
}

createRoot(document.getElementById("root")!).render(<App />);
