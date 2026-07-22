import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  deleteTraderSeasonSettings,
  getTraderSeasonSettingsBySeason,
  setTraderSeasonSettings,
  type SetTraderSeasonSettingsPayload,
  type TraderSeasonSettings,
} from '../services/traderSeasonSettingsApi';

type TraderSeasonSettingsState = {
  items: TraderSeasonSettings[];
  loading: boolean;
  error: string | null;
};

const initialState: TraderSeasonSettingsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTraderSeasonSettings = createAsyncThunk(
  'traderSeasonSettings/fetchTraderSeasonSettings',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await getTraderSeasonSettingsBySeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const saveTraderSeasonSettings = createAsyncThunk(
  'traderSeasonSettings/saveTraderSeasonSettings',
  async (payload: SetTraderSeasonSettingsPayload, { rejectWithValue }) => {
    try {
      return await setTraderSeasonSettings(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeTraderSeasonSettings = createAsyncThunk(
  'traderSeasonSettings/removeTraderSeasonSettings',
  async (id: number, { rejectWithValue }) => {
    try {
      return await deleteTraderSeasonSettings(id);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const traderSeasonSettingsSlice = createSlice({
  name: 'traderSeasonSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTraderSeasonSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTraderSeasonSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTraderSeasonSettings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch trader season settings';
      })
      .addCase(saveTraderSeasonSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveTraderSeasonSettings.fulfilled, (state, action) => {
        state.loading = false;
        const savedSettings = action.payload;

        state.items = state.items.filter(
          (item) => !(item.traderId === savedSettings.traderId && item.seasonId === savedSettings.seasonId),
        );
        state.items.push(savedSettings);
      })
      .addCase(saveTraderSeasonSettings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to save trader season settings';
      })
      .addCase(removeTraderSeasonSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeTraderSeasonSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload.id);
      })
      .addCase(removeTraderSeasonSettings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete trader season settings';
      });
  },
});

export default traderSeasonSettingsSlice.reducer;
