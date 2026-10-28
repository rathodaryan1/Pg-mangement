import React from 'react';
import { AppShell } from './AppShell';

export const ResidentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppShell portalTitle="Resident Portal" badgeText="Verified Resident">
      {children}
    </AppShell>
  );
};
