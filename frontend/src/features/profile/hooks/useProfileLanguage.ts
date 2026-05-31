import { useMemo } from 'react';
import { getStoredProfileLanguage } from '../utils/profilePage.utils';

export function useProfileLanguage() {
  return useMemo(() => getStoredProfileLanguage(), []);
}
