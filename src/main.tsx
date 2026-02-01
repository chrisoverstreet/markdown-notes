import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
