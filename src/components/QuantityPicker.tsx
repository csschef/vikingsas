type QuantityPickerProps = {
  value: number
  max: number
  onChange: (value: number) => void
}

function QuantityPicker({ value, max, onChange }: QuantityPickerProps) {
  return (
    <div className="quantity-picker">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Minska antal"
      >
        -
      </button>
      <span>{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Öka antal"
      >
        +
      </button>
    </div>
  )
}

export default QuantityPicker
