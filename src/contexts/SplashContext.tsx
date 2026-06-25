import { createContext, useContext } from 'react';

export interface SplashContextValue {
  splashActive: boolean;
}

export const SplashContext = createContext<SplashContextValue>({ splashActive: true });

export const useSplash = () => useContext(SplashContext);
