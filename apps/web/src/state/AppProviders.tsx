import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { SocketProvider } from './SocketContext';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';

/** Composition root for all client side providers. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
