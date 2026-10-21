import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'sonner';
import { AlertTriangle, Info, Loader2, LucideCheckCircle, XCircle } from 'lucide-react';

const Icons = {
  success: <LucideCheckCircle />,
  error: <XCircle />,
  warning: <AlertTriangle />,
  info: <Info />,
  loading: <Loader2 className="animate-spin" />,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" richColors={true} duration={3000} icons={Icons} />
  </StrictMode>
);
