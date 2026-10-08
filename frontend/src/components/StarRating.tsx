interface Props {
  value: number | null;
  onChange?: (stars: number) => void;
  size?: 'sm' | 'md';
}

export function StarRating({ value, onChange, size = 'md' }: Props) {
  const cls = size === 'sm' ? 'text-lg' : 'text-3xl';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(s)}
          className={`${cls} ${s <= (value ?? 0) ? 'text-amber-500' : 'text-neutral-300'} ${
            onChange ? 'cursor-pointer' : 'cursor-default'
          }`}
          aria-label={`${s} estrelas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
