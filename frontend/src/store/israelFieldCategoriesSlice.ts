import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createIsraelFieldCategory,
  deleteIsraelFieldCategory,
  getIsraelFieldCategoriesBySeason,
  updateIsraelFieldCategory,
  type CreateIsraelFieldCategoryPayload,
  type IsraelFieldCategory,
  type UpdateIsraelFieldCategoryPayload,
} from '../services/israelFieldCategoriesApi';

type IsraelFieldCategoriesState = {
  items: IsraelFieldCategory[];
  loading: boolean;
  error: string | null;
};

const initialState: IsraelFieldCategoriesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchIsraelFieldCategories = createAsyncThunk(
  'israelFieldCategories/fetchIsraelFieldCategories',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await getIsraelFieldCategoriesBySeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const addIsraelFieldCategory = createAsyncThunk(
  'israelFieldCategories/addIsraelFieldCategory',
  async (payload: CreateIsraelFieldCategoryPayload, { rejectWithValue }) => {
    try {
      return await createIsraelFieldCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editIsraelFieldCategory = createAsyncThunk(
  'israelFieldCategories/editIsraelFieldCategory',
  async (payload: UpdateIsraelFieldCategoryPayload, { rejectWithValue }) => {
    try {
      return await updateIsraelFieldCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeIsraelFieldCategory = createAsyncThunk(
  'israelFieldCategories/removeIsraelFieldCategory',
  async (id: number, { rejectWithValue }) => {
    try {
      return await deleteIsraelFieldCategory(id);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const israelFieldCategoriesSlice = createSlice({
  name: 'israelFieldCategories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIsraelFieldCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIsraelFieldCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIsraelFieldCategories.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to fetch seller categories';
      })
      .addCase(addIsraelFieldCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIsraelFieldCategory.fulfilled, (state, action) => {
        state.loading = false;
        const createdCategory = action.payload;

        state.items = state.items.filter(
          (category) => category.id !== createdCategory.id,
        );
        state.items.push(createdCategory);
      })
      .addCase(addIsraelFieldCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to create seller category';
      })
      .addCase(editIsraelFieldCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editIsraelFieldCategory.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCategory = action.payload;

        state.items = state.items.map((category) =>
          category.id === updatedCategory.id ? updatedCategory : category,
        );
      })
      .addCase(editIsraelFieldCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to update seller category';
      })
      .addCase(removeIsraelFieldCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeIsraelFieldCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (category) => category.id !== action.payload.id,
        );
      })
      .addCase(removeIsraelFieldCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to delete seller category';
      });
  },
});

export default israelFieldCategoriesSlice.reducer;
