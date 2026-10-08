import React, { type PropsWithChildren } from 'react';
import { ChakraProvider, createSystem } from '@chakra-ui/react/styled-system';
import {
  NimbusI18nProvider,
  _RegionProvider,
  system as nimbusSystem,
} from '@commercetools/nimbus';


const SCOPED_SYSTEM_KEY = Symbol.for(
  '@commercetools-demo/puck:nimbus-scoped-system'
);

const globalScope = globalThis as unknown as Record<
  symbol,
  ReturnType<typeof createSystem> | undefined
>;

const scopedSystem: ReturnType<typeof createSystem> =
  globalScope[SCOPED_SYSTEM_KEY] ??
  (globalScope[SCOPED_SYSTEM_KEY] = createSystem({
    // `_config` is the fully-merged Nimbus + Chakra config used to build the
    // stock system; reusing it keeps all Nimbus theming intact.
    ...(nimbusSystem as unknown as { _config: Record<string, unknown> })._config,
    preflight: false,
    globalCss: {},
  }));

export const EnsureNimbusProvider: React.FC<PropsWithChildren<{ locale?: string }>> = ({
  locale = 'en',
  children,
}) => (
  <ChakraProvider value={scopedSystem}>
    <NimbusI18nProvider locale={locale}>
      <_RegionProvider>{children}</_RegionProvider>
    </NimbusI18nProvider>
  </ChakraProvider>
);
