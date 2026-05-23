import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/globals.css'
import App from './App'

// ── Hub SSO detection ─────────────────────────────────────────────────────────
// When a school pupil arrives from wrife.co.uk via the tile links, the URL
// contains #access_token=... (Route A SSO). Capture this flag NOW, before
// the Supabase SDK strips the hash asynchronously, so the "← WriFe" back
// button in the Sidebar and mobile strip is shown for this session.
if (window.location.hash.includes('access_token')) {
  sessionStorage.setItem('entryViaHub', '1')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
