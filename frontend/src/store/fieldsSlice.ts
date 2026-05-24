import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createField,
  deleteField,
  getFields,
  updateField,
  type CreateFieldPayload,
  type Field,
  type UpdateFieldPayload,
} from '../services/fieldsApi';

type FieldsState = {
  items: Field[];
  loading: boolean;
  error: string | null;
};

const initialState: FieldsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchFields = createAsyncThunk('fields/fetchFields', async () => {
  return await getFields();
});

export const addField = createAsyncThunk(
  'fields/addField',
  async (fieldData: CreateFieldPayload, { rejectWithValue }) => {
    try {
      return await createField(fieldData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeField = createAsyncThunk(
  'fields/removeField',
  async (fieldId: number, { rejectWithValue }) => {
    try {
      return await deleteField(fieldId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editField = createAsyncThunk(
  'fields/editField',
  async (fieldData: UpdateFieldPayload, { rejectWithValue }) => {
    try {
      return await updateField(fieldData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const fieldsSlice = createSlice({
  name: 'fields',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFields.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchFields.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch fields';
      })
      .addCase(addField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addField.fulfilled, (state, action) => {
        state.loading = false;
        const createdField = action.payload;

        state.items = state.items.filter((field) => field.id !== createdField.id);
        state.items.push(createdField);
      })
      .addCase(addField.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to create field';
      })
      .addCase(editField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editField.fulfilled, (state, action) => {
        state.loading = false;
        const updatedField = action.payload;

        state.items = state.items.map((field) =>
          field.id === updatedField.id ? updatedField : field,
        );
      })
      .addCase(editField.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to update field';
      })
      .addCase(removeField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeField.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((field) => field.id !== action.payload.id);
      })
      .addCase(removeField.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete field';
      });
  },
});

export default fieldsSlice.reducer;
