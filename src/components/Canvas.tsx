import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@fluentui/react-components'
import type { SchemaField } from '../types'
import FieldRow from './FieldRow'

interface Props {
  fields: SchemaField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClear: () => void
  width: number
}

export default function Canvas({ fields, selectedId, onSelect, onDelete, onClear, width }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'canvas-root',
    data: { isRoot: true },
  })

  return (
    <div className="canvas-wrap" style={{ width, flexShrink: 0 }}>
      <div className="canvas-toolbar">
        <span>{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
        {fields.length > 0 && (
          <Button
            appearance="subtle"
            size="small"
            onClick={onClear}
            style={{ color: 'var(--colorStatusDangerForeground1)' }}
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="canvas-area">
        <div ref={setNodeRef} className={`canvas-drop-zone${isOver ? ' over' : ''}`}>
          {fields.length === 0 ? (
            <div className="canvas-empty">
              <div className="ce-icon">⬡</div>
              <p>Drag field types from the left panel</p>
            </div>
          ) : (
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map(field => (
                <FieldRow
                  key={field.id}
                  field={field}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}
