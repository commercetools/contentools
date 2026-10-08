import React, {
  createContext,
  ReactNode,
  useMemo,
  useState,
  useContext,
} from 'react';
import { useBusinessUnits } from '../hooks/use-business-units';

const DEFAULT_OPTION = { key: 'default', label: 'Default' };

export type BusinessUnitOption = {
  key: string;
  label: string;
};

interface BusinessUnitContextValue {
  isLoading: boolean;
  showDropdown: boolean;
  businessUnits: BusinessUnitOption[];
  selectedBusinessUnitKey: string;
  setSelectedBusinessUnitKey: (key: string) => void;
}

const BusinessUnitContext = createContext<BusinessUnitContextValue | undefined>(
  undefined
);

interface BusinessUnitProviderProps {
  children: ReactNode;
}

export const BusinessUnitProvider: React.FC<BusinessUnitProviderProps> = ({
  children,
}) => {
  const { businessUnits: fetchedUnits, loading } = useBusinessUnits();
  const [selectedBusinessUnitKey, setSelectedBusinessUnitKey] =
    useState<string>('default');

  const businessUnits: BusinessUnitOption[] = useMemo(() => {
    const mapped = (fetchedUnits ?? [])
      .filter((bu) => bu.key !== 'default')
      .map((bu) => ({ key: bu.key, label: bu.name }));
    return [DEFAULT_OPTION, ...mapped];
  }, [fetchedUnits]);


  const value: BusinessUnitContextValue = useMemo(
    () => ({
      isLoading: loading,
      showDropdown: businessUnits.length > 1,
      businessUnits,
      selectedBusinessUnitKey,
      setSelectedBusinessUnitKey,
    }),
    [businessUnits, selectedBusinessUnitKey]
  );



  return (
    <BusinessUnitContext.Provider value={value}>
      {children}
    </BusinessUnitContext.Provider>
  );
};

export const useBusinessUnit = (): BusinessUnitContextValue => {
  const context = useContext(BusinessUnitContext);
  if (context === undefined) {
    throw new Error(
      'useBusinessUnit must be used within a BusinessUnitProvider'
    );
  }
  return context;
};
