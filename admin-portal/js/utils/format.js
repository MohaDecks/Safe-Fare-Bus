export const formatBirr = (n) =>
  `ETB ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const roleLabel = (r) =>
  ({ admin: "Bus Company Admin", cashier: "Cashier", corporate: "Corporate company" }[r] || r);
