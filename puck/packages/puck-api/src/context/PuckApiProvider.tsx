import React, { type ReactNode } from 'react';
import { PuckApiContext, type PuckApiContextValue } from './PuckApiContext';

export interface PuckApiProviderProps extends PuckApiContextValue {
  children: ReactNode;
}

export const PuckApiProvider: React.FC<PuckApiProviderProps> = ({
  children,
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
}) => {
  return (
    <PuckApiContext.Provider
      value={{ baseURL, projectKey, businessUnitKey, jwtToken, locale }}
    >
      {children}
    </PuckApiContext.Provider>
  );
};
