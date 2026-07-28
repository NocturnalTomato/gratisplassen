export function StarsDisplay({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-sm text-gray-400 dark:text-zinc-500">Nog geen reviews</span>;
  }
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden>
        {"★".repeat(rounded)}
        {"☆".repeat(5 - rounded)}
      </span>
      <span className="text-gray-500 dark:text-zinc-400">{value.toFixed(1)}</span>
    </span>
  );
}

export function StarsInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            aria-label={`${n} sterren`}
            className={`text-2xl leading-none ${
              n <= value ? "text-rose-500 dark:text-rose-400" : "text-gray-300 dark:text-zinc-600"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
