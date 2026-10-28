import React from 'react';
import { AppShell } from './AppShell';

export const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppShell portalTitle="Super Admin Console" badgeText="Platform Super Admin">
      {children}
    </AppShell>
  );
};
