export const fmtRM = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  return `RM${v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};