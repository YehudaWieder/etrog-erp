import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type GlobalFiltersState = {
  scopes: Record<string, Record<string, string>>;
  resetVersion: number;
};

const initialState: GlobalFiltersState = {
  scopes: {},
  resetVersion: 0,
};

const globalFiltersSlice = createSlice({
  name: 'globalFilters',
  initialState,
  reducers: {
    setScopeFilters: (
      state,
      action: PayloadAction<{ scope: string; filters: Record<string, string> }>,
    ) => {
      state.scopes[action.payload.scope] = action.payload.filters;
    },
    setScopeFilter: (
      state,
      action: PayloadAction<{ scope: string; key: string; value: string }>,
    ) => {
      state.scopes[action.payload.scope] = state.scopes[action.payload.scope] ?? {};
      state.scopes[action.payload.scope][action.payload.key] = action.payload.value;
    },
    resetScopeFilters: (state, action: PayloadAction<{ scope: string }>) => {
      delete state.scopes[action.payload.scope];
    },
    resetAllScopeFilters: (state) => {
      state.scopes = {};
      state.resetVersion += 1;
    },
  },
});

export const { setScopeFilters, setScopeFilter, resetScopeFilters, resetAllScopeFilters } = globalFiltersSlice.actions;

export default globalFiltersSlice.reducer;
