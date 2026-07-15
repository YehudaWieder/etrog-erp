import { useEffect, useState } from 'react';
import { API_LOADING_EVENT } from '../services/apiClient';

export function useApiLoading(): boolean {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleLoadingChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isLoading: boolean }>;
      setIsLoading(Boolean(customEvent.detail?.isLoading));
    };

    window.addEventListener(API_LOADING_EVENT, handleLoadingChange);

    return () => {
      window.removeEventListener(API_LOADING_EVENT, handleLoadingChange);
    };
  }, []);

  return isLoading;
}
