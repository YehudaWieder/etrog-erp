import { configureStore } from "@reduxjs/toolkit";
import seasonsReducer from "./seasonsSlice";
// ... ייבוא רידוסרים נוספים בהמשך

const store = configureStore({
  reducer: {
    seasons: seasonsReducer,
    // ... רידוסרים נוספים
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
