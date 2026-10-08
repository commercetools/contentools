import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface HeroBannerProps {
  title: string;
  subtitle: string;
  image: string;
}

export const renderHeroBanner: NonNullable<
  ComponentConfig<HeroBannerProps>['render']
> = ({ title, subtitle, image }) => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      paddingBottom: '56.25%',
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
    }}
  >
    {image && (
      <img
        src={image}
        alt={title || 'Hero banner'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    )}
    {/* dark overlay */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.3)',
        zIndex: 1,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        textAlign: 'center',
        color: 'white',
        zIndex: 2,
        padding: '2rem',
        maxWidth: '90%',
      }}
    >
      {title && (
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: '0 0 1rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
          }}
        >
          {title}
        </h1>
      )}
      {subtitle && (
        <p
          style={{
            fontSize: '1.25rem',
            margin: 0,
            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
            opacity: 0.95,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  </div>
);
