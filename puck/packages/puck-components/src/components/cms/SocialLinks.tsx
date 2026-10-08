import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface SocialLinksProps {
  link1Label: string; link1Url: string;
  link2Label: string; link2Url: string;
  link3Label: string; link3Url: string;
  link4Label: string; link4Url: string;
}

export const renderSocialLinks: NonNullable<ComponentConfig<SocialLinksProps>['render']> = (props) => {
    const links = [
      [props.link1Label, props.link1Url],
      [props.link2Label, props.link2Url],
      [props.link3Label, props.link3Url],
      [props.link4Label, props.link4Url],
    ].filter(([label, url]) => label && url) as [string, string][];
    if (links.length === 0) return <></>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
        {links.map(([label, url], i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2c5530', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}
          >
            {label}
          </a>
        ))}
      </div>
    );
};
