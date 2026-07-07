import { useEffect, useRef } from 'react'
import type { SchemaField } from '../types'
import FieldEditor from './FieldEditor'

function findField(fields: SchemaField[], id: string): SchemaField | null {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.children) {
      const found = findField(f.children, id)
      if (found) return found
    }
    if (f.itemFields) {
      const found = findField(f.itemFields, id)
      if (found) return found
    }
  }
  return null
}

interface Props {
  fields: SchemaField[]
  selectedId: string | null
  onChange: (updated: SchemaField) => void
  width: number
}

export default function EditorPanel({ fields, selectedId, onChange, width }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [selectedId])

  const field = selectedId ? findField(fields, selectedId) : null

  return (
    <div className="panel editor-panel" style={{ width, flexShrink: 0 }}>
      <div className="panel-header">
        <span className="panel-title">Properties</span>
        {field && (
          <span style={{ color: 'var(--colorNeutralForeground3)', fontSize: 11 }}>
            {field.name || 'unnamed'} · {field.type}
          </span>
        )}
      </div>
      <div className="panel-body" ref={bodyRef}>
        <FieldEditor field={field} onChange={onChange} />
      </div>
    </div>
  )
}
