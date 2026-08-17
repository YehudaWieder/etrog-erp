import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  deleteIsraelCategoryGrade,
  getIsraelCategoryGradesBySeason,
  setIsraelCategoryGrade,
  type IsraelCategoryGrade,
  type SetIsraelCategoryGradePayload,
} from '../services/israelCategoryGradesApi';

type IsraelCategoryGradesState = {
  items: IsraelCategoryGrade[];
  loading: boolean;
  error: string | null;
};

const initialState: IsraelCategoryGradesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchIsraelCategoryGrades = createAsyncThunk(
  'israelCategoryGrades/fetchIsraelCategoryGrades',
  async (seasonId: number, { rejectWithValue }) => {
    try {
      return await getIsraelCategoryGradesBySeason(seasonId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const saveIsraelCategoryGrade = createAsyncThunk(
  'israelCategoryGrades/saveIsraelCategoryGrade',
  async (payload: SetIsraelCategoryGradePayload, { rejectWithValue }) => {
    try {
      return await setIsraelCategoryGrade(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeIsraelCategoryGrade = createAsyncThunk(
  'israelCategoryGrades/removeIsraelCategoryGrade',
  async (id: number, { rejectWithValue }) => {
    try {
      return await deleteIsraelCategoryGrade(id);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const israelCategoryGradesSlice = createSlice({
  name: 'israelCategoryGrades',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIsraelCategoryGrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIsraelCategoryGrades.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIsraelCategoryGrades.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to fetch category grades';
      })
      .addCase(saveIsraelCategoryGrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveIsraelCategoryGrade.fulfilled, (state, action) => {
        state.loading = false;
        const savedEntry = action.payload;

        state.items = state.items.filter(
          (item) =>
            !(
              item.categoryId === savedEntry.categoryId &&
              item.seasonId === savedEntry.seasonId
            ),
        );
        state.items.push(savedEntry);
      })
      .addCase(saveIsraelCategoryGrade.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to save category grades';
      })
      .addCase(removeIsraelCategoryGrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeIsraelCategoryGrade.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
      })
      .addCase(removeIsraelCategoryGrade.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to delete category grades';
      });
  },
});

export default israelCategoryGradesSlice.reducer;
