import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSeason, getSeasons, setActiveSeason, type CreateSeasonPayload, type Season } from '../services/seasonsApi';

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

export const addSeason = createAsyncThunk('seasons/addSeason', async (seasonData: CreateSeasonPayload) => {
  return await createSeason(seasonData);
});

export const activateSeason = createAsyncThunk('seasons/activateSeason', async (seasonId: number) => {
  return await setActiveSeason(seasonId);
});

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
        state.error = action.error.message ?? 'Failed to fetch seasons';
      })
      .addCase(addSeason.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(activateSeason.fulfilled, (state, action) => {
        state.activeSeasonId = action.payload.id;
        state.items = state.items.map((s) => ({ ...s, isActive: s.id === action.payload.id }));
      });
  },
});

export default seasonsSlice.reducer;
