import { createContext, useContext } from 'react';

export interface ImagePickerConfig {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken?: string;
}

export const ImagePickerContext = createContext<ImagePickerConfig | null>(null);

export const useImagePickerContext = (): ImagePickerConfig => {
  const ctx = useContext(ImagePickerContext);
  if (!ctx) {
    throw new Error(
      'useImagePickerContext must be used inside <ImagePickerProvider>. ' +
        'Wrap your component tree with <ImagePickerProvider>.'
    );
  }
  return ctx;
};
