import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createIsraelSortCategory,
  deleteIsraelSortCategory,
  getIsraelSortCategories,
  updateIsraelSortCategory,
  type CreateIsraelSortCategoryPayload,
  type IsraelSortCategory,
  type UpdateIsraelSortCategoryPayload,
} from '../services/israelSortCategoriesApi';

type IsraelSortCategoriesState = {
  items: IsraelSortCategory[];
  loading: boolean;
  error: string | null;
};

const initialState: IsraelSortCategoriesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchIsraelSortCategories = createAsyncThunk(
  'israelSortCategories/fetchIsraelSortCategories',
  async () => {
    return await getIsraelSortCategories();
  },
);

export const addIsraelSortCategory = createAsyncThunk(
  'israelSortCategories/addIsraelSortCategory',
  async (payload: CreateIsraelSortCategoryPayload, { rejectWithValue }) => {
    try {
      return await createIsraelSortCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeIsraelSortCategory = createAsyncThunk(
  'israelSortCategories/removeIsraelSortCategory',
  async (id: number, { rejectWithValue }) => {
    try {
      return await deleteIsraelSortCategory(id);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editIsraelSortCategory = createAsyncThunk(
  'israelSortCategories/editIsraelSortCategory',
  async (payload: UpdateIsraelSortCategoryPayload, { rejectWithValue }) => {
    try {
      return await updateIsraelSortCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const israelSortCategoriesSlice = createSlice({
  name: 'israelSortCategories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIsraelSortCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIsraelSortCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIsraelSortCategories.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to fetch sorting categories';
      })
      .addCase(addIsraelSortCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIsraelSortCategory.fulfilled, (state, action) => {
        state.loading = false;
        const createdCategory = action.payload;

        state.items = state.items.filter(
          (category) => category.id !== createdCategory.id,
        );
        state.items.push(createdCategory);
      })
      .addCase(addIsraelSortCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to create sorting category';
      })
      .addCase(editIsraelSortCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editIsraelSortCategory.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCategory = action.payload;

        state.items = state.items.map((category) =>
          category.id === updatedCategory.id ? updatedCategory : category,
        );
      })
      .addCase(editIsraelSortCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to update sorting category';
      })
      .addCase(removeIsraelSortCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeIsraelSortCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (category) => category.id !== action.payload.id,
        );
      })
      .addCase(removeIsraelSortCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to delete sorting category';
      });
  },
});

export default israelSortCategoriesSlice.reducer;
