'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { WebsiteProvider } from '../context/WebsiteContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WebsiteProvider>
        {children}
      </WebsiteProvider>
    </AuthProvider>
  );
} 