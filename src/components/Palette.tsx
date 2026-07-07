import { useDraggable } from '@dnd-kit/core'
import type { FieldType } from '../types'

interface PaletteEntry {
  type: FieldType
  label: string
  icon: string
  color: string
}

const FIELDS: PaletteEntry[] = [
  { type: 'string',  label: 'String',  icon: 'T',  color: '#4ecdc4' },
  { type: 'number',  label: 'Number',  icon: '#',  color: '#ffd93d' },
  { type: 'integer', label: 'Integer', icon: 'Z',  color: '#ff9f43' },
  { type: 'boolean', label: 'Boolean', icon: '✓',  color: '#a29bfe' },
  { type: 'array',   label: 'Array',   icon: '[]', color: '#fd79a8' },
  { type: 'object',  label: 'Object',  icon: '{}', color: '#6c63ff' },
]

function PaletteItem({ entry }: { entry: PaletteEntry }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${entry.type}`,
    data: { fromPalette: true, fieldType: entry.type },
  })

  return (
    <div
      ref={setNodeRef}
      className="palette-item"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      {...listeners}
      {...attributes}
    >
      <div
        className="pi-icon"
        style={{ background: `${entry.color}22`, color: entry.color, fontWeight: 700, fontFamily: 'monospace' }}
      >
        {entry.icon}
      </div>
      <span className="pi-label">{entry.label}</span>
    </div>
  )
}

export default function Palette({ width }: { width: number }) {
  return (
    <div className="palette" style={{ width, flexShrink: 0 }}>
      <div className="palette-section">
        <h3>Field Types</h3>
        {FIELDS.map(e => <PaletteItem key={e.type} entry={e} />)}
      </div>
    </div>
  )
}
