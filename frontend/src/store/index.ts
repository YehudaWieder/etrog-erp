import { configureStore } from "@reduxjs/toolkit";
import seasonsReducer from "./seasonsSlice";
import fieldsReducer from "./fieldsSlice";
import tradersReducer from './tradersSlice';
// ... ייבוא רידוסרים נוספים בהמשך

const store = configureStore({
  reducer: {
    seasons: seasonsReducer,
    fields: fieldsReducer,
    traders: tradersReducer,
    // ... רידוסרים נוספים
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
