import React from 'react';
import { AppShell } from './AppShell';

export const StaffLayout: React.FC<{
  children: React.ReactNode;
  portalTitle?: string;
  badgeText?: string;
}> = ({ children, portalTitle = 'Operations Desk', badgeText }) => {
  return (
    <AppShell portalTitle={portalTitle} badgeText={badgeText}>
      {children}
    </AppShell>
  );
};
