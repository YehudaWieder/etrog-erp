import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createSeason,
  deleteSeason,
  getSeasons,
  setActiveSeason,
  type CreateSeasonPayload,
  type Season,
} from '../services/seasonsApi';

type SeasonsState = {
  items: Season[];
  loading: boolean;
  error: string | null;
  activeSeasonId: number | null;
};

const initialState: SeasonsState = {
  items: [],
  loading: false,
  error: null,
  activeSeasonId: null,
};

export const fetchSeasons = createAsyncThunk('seasons/fetchSeasons', async () => {
  return await getSeasons();
});

export const addSeason = createAsyncThunk(
  'seasons/addSeason',
  async (seasonData: CreateSeasonPayload, { rejectWithValue }) => {
    try {
      return await createSeason(seasonData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const activateSeason = createAsyncThunk(
  'seasons/activateSeason',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await setActiveSeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeSeason = createAsyncThunk(
  'seasons/removeSeason',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await deleteSeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const seasonsSlice = createSlice({
  name: 'seasons',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeasons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSeasons.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.activeSeasonId = action.payload.find((s) => s.isActive)?.id ?? null;
      })
      .addCase(fetchSeasons.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch seasons';
      })
      .addCase(addSeason.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSeason.fulfilled, (state, action) => {
        state.loading = false;
        const createdSeason = action.payload;

        state.items = state.items.filter((season) => season.id !== createdSeason.id);

        if (createdSeason.isActive) {
          state.activeSeasonId = createdSeason.id;
          state.items = state.items.map((season) => ({
            ...season,
            isActive: season.id === createdSeason.id,
          }));
        }

        state.items.push(createdSeason);
      })
      .addCase(addSeason.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to create season';
      })
      .addCase(activateSeason.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(activateSeason.fulfilled, (state, action) => {
        state.loading = false;
        state.activeSeasonId = action.payload.id;
        state.items = state.items.map((s) => ({ ...s, isActive: s.id === action.payload.id }));
      })
      .addCase(activateSeason.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to activate season';
      })
      .addCase(removeSeason.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeSeason.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((s) => s.id !== action.payload.id);

        if (state.activeSeasonId === action.payload.id) {
          state.activeSeasonId = state.items.find((s) => s.isActive)?.id ?? null;
        }
      })
      .addCase(removeSeason.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete season';
      });
  },
});

export default seasonsSlice.reducer;
