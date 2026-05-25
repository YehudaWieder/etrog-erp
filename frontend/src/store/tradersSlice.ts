import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createTrader,
  deleteTrader,
  getTraders,
  updateTrader,
  type CreateTraderPayload,
  type Trader,
  type UpdateTraderPayload,
} from '../services/tradersApi';

type TradersState = {
  items: Trader[];
  loading: boolean;
  error: string | null;
};

const initialState: TradersState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTraders = createAsyncThunk('traders/fetchTraders', async () => {
  return await getTraders();
});

export const addTrader = createAsyncThunk(
  'traders/addTrader',
  async (traderData: CreateTraderPayload, { rejectWithValue }) => {
    try {
      return await createTrader(traderData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeTrader = createAsyncThunk(
  'traders/removeTrader',
  async (traderId: number, { rejectWithValue }) => {
    try {
      return await deleteTrader(traderId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editTrader = createAsyncThunk(
  'traders/editTrader',
  async (traderData: UpdateTraderPayload, { rejectWithValue }) => {
    try {
      return await updateTrader(traderData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const tradersSlice = createSlice({
  name: 'traders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTraders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTraders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTraders.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch traders';
      })
      .addCase(addTrader.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTrader.fulfilled, (state, action) => {
        state.loading = false;
        const createdTrader = action.payload;

        state.items = state.items.filter((trader) => trader.id !== createdTrader.id);
        state.items.push(createdTrader);
      })
      .addCase(addTrader.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to create trader';
      })
      .addCase(editTrader.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editTrader.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTrader = action.payload;

        state.items = state.items.map((trader) =>
          trader.id === updatedTrader.id ? updatedTrader : trader,
        );
      })
      .addCase(editTrader.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to update trader';
      })
      .addCase(removeTrader.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeTrader.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((trader) => trader.id !== action.payload.id);
      })
      .addCase(removeTrader.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete trader';
      });
  },
});

export default tradersSlice.reducer;