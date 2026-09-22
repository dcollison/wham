import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { GymProvider } from './context/GymContext';
import './index.css';

import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <GymProvider>
          <App />
        </GymProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
