// "2026-09-20" → "2026. 9. 20"
export const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
};
