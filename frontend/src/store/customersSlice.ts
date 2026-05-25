import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../services/apiClient';
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  type CreateCustomerPayload,
  type Customer,
  type UpdateCustomerPayload,
} from '../services/customersApi';

type CustomersState = {
  items: Customer[];
  loading: boolean;
  error: string | null;
};

const initialState: CustomersState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk('customers/fetchCustomers', async () => {
  return await getCustomers();
});

export const addCustomer = createAsyncThunk(
  'customers/addCustomer',
  async (customerData: CreateCustomerPayload, { rejectWithValue }) => {
    try {
      return await createCustomer(customerData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const editCustomer = createAsyncThunk(
  'customers/editCustomer',
  async (customerData: UpdateCustomerPayload, { rejectWithValue }) => {
    try {
      return await updateCustomer(customerData);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

export const removeCustomer = createAsyncThunk(
  'customers/removeCustomer',
  async (customerId: number, { rejectWithValue }) => {
    try {
      return await deleteCustomer(customerId);
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }

      throw error;
    }
  },
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to fetch customers';
      })
      .addCase(addCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const createdCustomer = action.payload;

        state.items = state.items.filter((customer) => customer.id !== createdCustomer.id);
        state.items.push(createdCustomer);
      })
      .addCase(addCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to create customer';
      })
      .addCase(editCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCustomer = action.payload;

        state.items = state.items.map((customer) =>
          customer.id === updatedCustomer.id ? updatedCustomer : customer,
        );
      })
      .addCase(editCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to update customer';
      })
      .addCase(removeCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((customer) => customer.id !== action.payload.id);
      })
      .addCase(removeCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? action.error.message ?? 'Failed to delete customer';
      });
  },
});

export default customersSlice.reducer;
