import React from 'react';
import { AppShell } from './AppShell';

export const OwnerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppShell portalTitle="Property Operations" badgeText="Owner / Manager">
      {children}
    </AppShell>
  );
};
