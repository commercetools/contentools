import React, { type ReactNode } from 'react';
import { ImagePickerContext, type ImagePickerConfig } from './ImagePickerContext';
import { EnsureIntlProvider } from '../EnsureIntlProvider';

export interface ImagePickerProviderProps extends ImagePickerConfig {
  children: ReactNode;
  /** Content locale (e.g. "en-US"). Resolves to en/es; unsupported → en. */
  locale?: string;
  /** Per-key message overrides applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

export const ImagePickerProvider: React.FC<ImagePickerProviderProps> = ({
  children,
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  messageOverrides,
}) => {
  return (
    <ImagePickerContext.Provider
      value={{ baseURL, projectKey, businessUnitKey, jwtToken }}
    >
      <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
        {children}
      </EnsureIntlProvider>
    </ImagePickerContext.Provider>
  );
};
