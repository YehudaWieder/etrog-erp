import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createIsraelField,
  deleteIsraelField,
  getIsraelFields,
  updateIsraelField,
  type CreateIsraelFieldPayload,
  type IsraelField,
  type UpdateIsraelFieldPayload,
} from '../services/israelFieldsApi';

type IsraelFieldsState = {
  items: IsraelField[];
  loading: boolean;
  error: string | null;
};

const initialState: IsraelFieldsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchIsraelFields = createAsyncThunk(
  'israelFields/fetchIsraelFields',
  async () => {
    return await getIsraelFields();
  },
);

export const addIsraelField = createAsyncThunk(
  'israelFields/addIsraelField',
  async (fieldData: CreateIsraelFieldPayload, { rejectWithValue }) => {
    try {
      return await createIsraelField(fieldData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeIsraelField = createAsyncThunk(
  'israelFields/removeIsraelField',
  async (fieldId: number, { rejectWithValue }) => {
    try {
      return await deleteIsraelField(fieldId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editIsraelField = createAsyncThunk(
  'israelFields/editIsraelField',
  async (fieldData: UpdateIsraelFieldPayload, { rejectWithValue }) => {
    try {
      return await updateIsraelField(fieldData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const israelFieldsSlice = createSlice({
  name: 'israelFields',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIsraelFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIsraelFields.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIsraelFields.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to fetch fields';
      })
      .addCase(addIsraelField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIsraelField.fulfilled, (state, action) => {
        state.loading = false;
        const createdField = action.payload;

        state.items = state.items.filter(
          (field) => field.id !== createdField.id,
        );
        state.items.push(createdField);
      })
      .addCase(addIsraelField.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to create field';
      })
      .addCase(editIsraelField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editIsraelField.fulfilled, (state, action) => {
        state.loading = false;
        const updatedField = action.payload;

        state.items = state.items.map((field) =>
          field.id === updatedField.id ? updatedField : field,
        );
      })
      .addCase(editIsraelField.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to update field';
      })
      .addCase(removeIsraelField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeIsraelField.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (field) => field.id !== action.payload.id,
        );
      })
      .addCase(removeIsraelField.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Failed to delete field';
      });
  },
});

export default israelFieldsSlice.reducer;
