'use client'

type HoneypotFieldProps = {
  label?: string
  value: string
  onChange: (value: string) => void
}

const hiddenFieldStyle = {
  position: 'absolute',
  left: '-9999px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
} as const

export default function HoneypotField({
  label = 'Company website',
  value,
  onChange,
}: HoneypotFieldProps) {
  return (
    <div aria-hidden="true" style={hiddenFieldStyle}>
      <label>
        {label}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          name="company_website"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  )
}
