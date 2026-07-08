import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SchemaField } from '../types'
import DropZone from './DropZone'

const TYPE_COLORS: Record<string, string> = {
  string:  '#4ecdc4',
  number:  '#ffd93d',
  integer: '#ff9f43',
  boolean: '#a29bfe',
  array:   '#fd79a8',
  object:  '#6c63ff',
}

interface Props {
  field: SchemaField
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function ChildRow({ child, selectedId, onSelect, onDelete, accent, parentId, kind }: {
  child: SchemaField
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  accent?: string
  parentId: string
  kind: 'children' | 'itemFields'
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.id,
    data: { parentId, kind, fieldId: child.id },
  })
  const color = TYPE_COLORS[child.type] ?? '#888'
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className={`field-row${selectedId === child.id ? ' selected' : ''}`}
        style={{ marginBottom: 5, ...(accent ? { borderLeftColor: `${accent}44` } : {}) }}
        onClick={() => onSelect(child.id)}
      >
        <span className="drag-handle" {...listeners} {...attributes}>⠿</span>
        <span className="type-badge" style={{ background: `${color}22`, color }}>
          {child.type}
        </span>
        <span className={`field-name${!child.name ? ' unnamed' : ''}`}>
          {child.name || 'unnamed'}
        </span>
        {child.required && <span className="req-badge">*</span>}
        <button
          className="delete-btn"
          onClick={e => { e.stopPropagation(); onDelete(child.id) }}
        >✕</button>
      </div>
    </div>
  )
}

export default function FieldRow({ field, selectedId, onSelect, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { fieldId: field.id },
  })

  const color = TYPE_COLORS[field.type] ?? '#888'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className={`field-row${selectedId === field.id ? ' selected' : ''}`}
        onClick={() => onSelect(field.id)}
      >
        <span className="drag-handle" {...listeners} {...attributes}>⠿</span>
        <span className="type-badge" style={{ background: `${color}22`, color }}>
          {field.type}
        </span>
        <span className={`field-name${!field.name ? ' unnamed' : ''}`}>
          {field.name || 'unnamed'}
        </span>
        {field.required && <span className="req-badge">*</span>}
        <button className="delete-btn" onClick={e => { e.stopPropagation(); onDelete(field.id) }}>✕</button>
      </div>

      {/* Object children */}
      {field.type === 'object' && (
        <div className="field-children">
          {(field.children ?? []).map(child => (
            <ChildRow
              key={child.id}
              child={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
          <DropZone parentId={field.id} kind="children" />
        </div>
      )}

      {/* Array item schema */}
      {field.type === 'array' && (
        <div className="field-children field-array-items">
          <div className="field-nesting-label">item schema</div>
          {(field.itemFields ?? []).map(itemField => (
            <ChildRow
              key={itemField.id}
              child={itemField}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              accent="#fd79a8"
            />
          ))}
          <DropZone parentId={field.id} kind="itemFields" />
        </div>
      )}
    </div>
  )
}
