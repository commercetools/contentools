import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface DeliveryMessageProps {
  message: string;
  threshold: string;
}

export const renderDeliveryMessage: NonNullable<
  ComponentConfig<DeliveryMessageProps>['render']
> = ({ message, threshold }) => {
  if (!message) return <></>;
  const text = threshold
    ? message.replace(/\$\d+/g, `$${threshold}`)
    : message;
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        background: '#f0f7f0',
        borderRadius: '4px',
        fontSize: '0.95rem',
        color: '#2c5530',
      }}
    >
      {text}
    </div>
  );
};
