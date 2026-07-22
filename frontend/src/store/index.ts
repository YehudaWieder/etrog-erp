import { configureStore } from "@reduxjs/toolkit";
import seasonsReducer from "./seasonsSlice";
import fieldsReducer from "./fieldsSlice";
import tradersReducer from './tradersSlice';
import customersReducer from './customersSlice';
import customerCategoriesReducer from './customerCategoriesSlice';
import traderSeasonSettingsReducer from './traderSeasonSettingsSlice';
import globalFiltersReducer from './globalFiltersSlice';
// ... ייבוא רידוסרים נוספים בהמשך

const store = configureStore({
  reducer: {
    seasons: seasonsReducer,
    fields: fieldsReducer,
    traders: tradersReducer,
    customers: customersReducer,
    customerCategories: customerCategoriesReducer,
    traderSeasonSettings: traderSeasonSettingsReducer,
    globalFilters: globalFiltersReducer,
    // ... רידוסרים נוספים
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
