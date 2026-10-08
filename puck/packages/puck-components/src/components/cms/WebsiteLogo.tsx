import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { useIntl } from 'react-intl';

export interface WebsiteLogoProps {
  logo: string;
  maxWidth: string;
  maxHeight: string;
}

export const renderWebsiteLogo: NonNullable<
  ComponentConfig<WebsiteLogoProps>['render']
> = ({ logo, maxWidth, maxHeight }) => {
  const intl = useIntl();
  if (!logo) return (
    <div style={{ width: `${parseInt(maxWidth, 10) || 180}px`, height: `${parseInt(maxHeight, 10) || 50}px`, background: '#f0f0f0', borderRadius: '4px' }} />
  );
  return (
    <div
      style={{
        maxWidth: `${parseInt(maxWidth, 10) || 180}px`,
        maxHeight: `${parseInt(maxHeight, 10) || 50}px`,
      }}
    >
      <img
        src={logo}
        alt={intl.formatMessage({ id: 'Editor.websiteLogoAlt' })}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
};
