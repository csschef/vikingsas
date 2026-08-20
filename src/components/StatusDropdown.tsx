import { useEffect, useRef, useState } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import type { Order } from '../types/types'

const statusClass: Record<Order['status'], string> = {
  Beställd: 'status-pending',
  Behandlas: 'status-processing',
  Levererad: 'status-delivered',
  Återbetald: 'status-refunded',
}

const statuses: Order['status'][] = [
  'Beställd',
  'Behandlas',
  'Levererad',
  'Återbetald',
]

type StatusDropdownProps = {
  value: Order['status']
  onChange: (status: Order['status']) => void
}

function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleSelect(status: Order['status']) {
    setOpen(false)
    if (status !== value) onChange(status)
  }

  return (
    <div className="status-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`status-dropdown-trigger status-pill ${statusClass[value]}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value}
        <CaretDownIcon size={16} weight="bold" />
      </button>
      {open && (
        <ul className="status-dropdown-list" role="listbox">
          {statuses.map((status) => (
            <li key={status} role="option" aria-selected={status === value}>
              <button
                type="button"
                className={`status-pill ${statusClass[status]}`}
                onClick={() => handleSelect(status)}
              >
                {status}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default StatusDropdown
