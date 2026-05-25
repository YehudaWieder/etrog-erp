import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createCustomerCategory,
  deleteCustomerCategory,
  getCustomerCategoriesBySeason,
  updateCustomerCategory,
  type CreateCustomerCategoryPayload,
  type CustomerCategory,
  type UpdateCustomerCategoryPayload,
} from '../services/customerCategoriesApi';

type CustomerCategoriesState = {
  items: CustomerCategory[];
  loading: boolean;
  error: string | null;
};

const initialState: CustomerCategoriesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchCustomerCategories = createAsyncThunk(
  'customerCategories/fetchCustomerCategories',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await getCustomerCategoriesBySeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const addCustomerCategory = createAsyncThunk(
  'customerCategories/addCustomerCategory',
  async (payload: CreateCustomerCategoryPayload, { rejectWithValue }) => {
    try {
      return await createCustomerCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editCustomerCategory = createAsyncThunk(
  'customerCategories/editCustomerCategory',
  async (payload: UpdateCustomerCategoryPayload, { rejectWithValue }) => {
    try {
      return await updateCustomerCategory(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeCustomerCategory = createAsyncThunk(
  'customerCategories/removeCustomerCategory',
  async (id: number, { rejectWithValue }) => {
    try {
      return await deleteCustomerCategory(id);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const customerCategoriesSlice = createSlice({
  name: 'customerCategories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomerCategories.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch customer categories';
      })
      .addCase(addCustomerCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCustomerCategory.fulfilled, (state, action) => {
        state.loading = false;
        const createdCategory = action.payload;

        state.items = state.items.filter((category) => category.id !== createdCategory.id);
        state.items.push(createdCategory);
      })
      .addCase(addCustomerCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to create customer category';
      })
      .addCase(editCustomerCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editCustomerCategory.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCategory = action.payload;

        state.items = state.items.map((category) =>
          category.id === updatedCategory.id ? updatedCategory : category,
        );
      })
      .addCase(editCustomerCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to update customer category';
      })
      .addCase(removeCustomerCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCustomerCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((category) => category.id !== action.payload.id);
      })
      .addCase(removeCustomerCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete customer category';
      });
  },
});

export default customerCategoriesSlice.reducer;