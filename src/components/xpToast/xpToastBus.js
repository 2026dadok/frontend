const listeners = new Set();

export const showXpToast = ({ title, xp }) => {
  listeners.forEach((listener) => listener({ title, xp, key: Date.now() }));
};

export const subscribeXpToast = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
