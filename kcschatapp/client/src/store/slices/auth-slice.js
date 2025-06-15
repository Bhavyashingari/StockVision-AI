export const createAuthSlice = (set) => ({
  userInfo: undefined,
  setUserInfo: (userInfo) => set({ userInfo }),
  updateUserPreferences: (preferences) => {
    set((state) => ({
      userInfo: state.userInfo ? { ...state.userInfo, ...preferences } : undefined,
    }));
  },
});
