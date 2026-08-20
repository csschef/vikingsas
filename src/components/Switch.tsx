type SwitchProps = {
  checked: boolean
  onChange: () => void
  label: string
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <span className="switch-track" />
    </label>
  )
}

export default Switch
