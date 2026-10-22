import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'sonner';
import { AlertTriangle, Info, Loader2, LucideCheckCircle, XCircle } from 'lucide-react';

const Icons = {
  success: <LucideCheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  loading: <Loader2 className="w-5 h-5 animate-spin" />,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      richColors={false}
      duration={3200}
      offset="20px"
      icons={Icons}
    />
  </StrictMode>
);
