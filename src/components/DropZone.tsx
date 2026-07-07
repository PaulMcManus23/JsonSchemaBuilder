import { useDroppable } from '@dnd-kit/core'

interface Props {
  parentId: string
  kind: 'children' | 'itemFields'
}

export default function DropZone({ parentId, kind }: Props) {
  const droppableId = kind === 'itemFields'
    ? `dropzone-items-${parentId}`
    : `dropzone-${parentId}`

  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: { parentId, dropType: kind },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        border: `1.5px dashed ${isOver ? '#6c63ff' : '#2e3250'}`,
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 10,
        color: isOver ? '#6c63ff' : '#8b90a7',
        textAlign: 'center',
        background: isOver ? 'rgba(108,99,255,0.07)' : 'transparent',
        transition: 'all .15s',
        marginTop: 4,
        letterSpacing: '.04em',
      }}
    >
      {kind === 'itemFields' ? 'drop fields here as item properties' : 'drop fields here to nest inside object'}
    </div>
  )
}
