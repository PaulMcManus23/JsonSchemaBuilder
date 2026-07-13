import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SchemaField } from "../types";
import DropZone from "./DropZone";

const TYPE_COLORS: Record<string, string> = {
  string: "#4ecdc4",
  number: "#ffd93d",
  integer: "#ff9f43",
  boolean: "#a29bfe",
  array: "#fd79a8",
  object: "#6c63ff",
};

interface Props {
  field: SchemaField;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  // Present when this row is nested inside another field's children/itemFields.
  parentId?: string;
  kind?: "children" | "itemFields";
  accent?: string;
}

export default function FieldRow({
  field,
  selectedId,
  onSelect,
  onDelete,
  parentId,
  kind,
  accent,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data:
      parentId && kind ? { parentId, kind, fieldId: field.id } : { fieldId: field.id },
  });

  const color = TYPE_COLORS[field.type] ?? "#888";
  const isNested = parentId !== undefined;

  return (
    <div>
      {/* Sortable/droppable measurement is scoped to just this row — not its
          nested children — so dragging near a container with a deep subtree
          resolves against the row the pointer is actually over, not the
          container's much taller bounding box. */}
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        <div
          className={`field-row${selectedId === field.id ? " selected" : ""}`}
          style={
            isNested
              ? {
                  marginBottom: 5,
                  ...(accent ? { borderLeftColor: `${accent}44` } : {}),
                }
              : undefined
          }
          onClick={() => onSelect(field.id)}
        >
          <span className="drag-handle" {...listeners} {...attributes}>
            ⠿
          </span>
          <span
            className="type-badge"
            style={{ background: `${color}22`, color }}
          >
            {field.type}
          </span>
          <span className={`field-name${!field.name ? " unnamed" : ""}`}>
            {field.name || "unnamed"}
          </span>
          {field.required && <span className="req-badge">*</span>}
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(field.id);
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Object children */}
      {field.type === "object" && (
        <div className="field-children">
          <SortableContext
            items={(field.children ?? []).map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {(field.children ?? []).map((child) => (
              <FieldRow
                key={child.id}
                field={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                parentId={field.id}
                kind="children"
              />
            ))}
          </SortableContext>
          <DropZone parentId={field.id} kind="children" />
        </div>
      )}

      {/* Array item schema */}
      {field.type === "array" && (
        <div className="field-children field-array-items">
          <div className="field-nesting-label">item schema</div>
          <SortableContext
            items={(field.itemFields ?? []).map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {(field.itemFields ?? []).map((itemField) => (
              <FieldRow
                key={itemField.id}
                field={itemField}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                accent="#fd79a8"
                parentId={field.id}
                kind="itemFields"
              />
            ))}
          </SortableContext>
          <DropZone parentId={field.id} kind="itemFields" />
        </div>
      )}
    </div>
  );
}
