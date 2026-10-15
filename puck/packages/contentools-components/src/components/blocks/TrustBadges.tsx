import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface TrustBadgesProps {
  badge1Icon: string; badge1Label: string;
  badge2Icon: string; badge2Label: string;
  badge3Icon: string; badge3Label: string;
  badge4Icon: string; badge4Label: string;
}

export const renderTrustBadges: NonNullable<ComponentConfig<TrustBadgesProps>['render']> = (props) => {
  const badges = [
    [props.badge1Icon, props.badge1Label],
    [props.badge2Icon, props.badge2Label],
    [props.badge3Icon, props.badge3Label],
    [props.badge4Icon, props.badge4Label],
  ].filter(([, label]) => label) as [string, string][];
  if (badges.length === 0) return <></>;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '2rem',
        padding: '2rem 1rem',
        background: '#f9f9f9',
        borderRadius: '4px',
      }}
    >
      {badges.map(([icon, label], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon && (
            <img
              src={icon}
              alt={label}
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
          )}
          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#333' }}>{label}</span>
        </div>
      ))}
    </div>
  );
};
