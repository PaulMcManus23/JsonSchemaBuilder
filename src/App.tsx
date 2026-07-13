import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import {
  FluentProvider,
  Text,
  Badge,
  Button,
  ToggleButton,
} from "@fluentui/react-components";
import type { SchemaField, FieldType } from "./types";
import { applyUiSchemaToFields } from "./schemaUtils";
import { appDarkTheme, appLightTheme, themeBg } from "./theme";
import Palette from "./components/Palette";
import Canvas from "./components/Canvas";
import EditorPanel from "./components/EditorPanel";
import PreviewPanel from "./components/PreviewPanel";
import ImportDialog from "./components/ImportDialog";
import MockDataDialog from "./components/MockDataDialog";
import ChatPanel from "./components/ChatPanel";

// ── Helpers ────────────────────────────────────────────────
function makeField(type: FieldType): SchemaField {
  return {
    id: uuidv4(),
    name: "",
    type,
    required: false,
    ...(type === "array" ? { itemType: "string" } : {}),
    ...(type === "object" ? { children: [] } : {}),
  };
}

function updateFieldInTree(
  fields: SchemaField[],
  id: string,
  updater: (f: SchemaField) => SchemaField,
): SchemaField[] {
  return fields.map((f) => {
    if (f.id === id) return updater(f);
    let updated = f;
    if (f.children)
      updated = {
        ...updated,
        children: updateFieldInTree(f.children, id, updater),
      };
    if (f.itemFields)
      updated = {
        ...updated,
        itemFields: updateFieldInTree(f.itemFields, id, updater),
      };
    return updated;
  });
}

function reorderWithinParent(
  fields: SchemaField[],
  parentId: string,
  kind: "children" | "itemFields",
  activeId: string,
  overId: string,
): SchemaField[] {
  return fields.map((f) => {
    if (f.id === parentId) {
      const list = (kind === "children" ? f.children : f.itemFields) ?? [];
      const oi = list.findIndex((c) => c.id === activeId);
      const ni = list.findIndex((c) => c.id === overId);
      if (oi === -1 || ni === -1) return f;
      const reordered = arrayMove(list, oi, ni);
      return kind === "children"
        ? { ...f, children: reordered }
        : { ...f, itemFields: reordered };
    }
    let updated = f;
    if (f.children)
      updated = {
        ...updated,
        children: reorderWithinParent(f.children, parentId, kind, activeId, overId),
      };
    if (f.itemFields)
      updated = {
        ...updated,
        itemFields: reorderWithinParent(
          f.itemFields,
          parentId,
          kind,
          activeId,
          overId,
        ),
      };
    return updated;
  });
}

function removeFieldFromTree(fields: SchemaField[], id: string): SchemaField[] {
  return fields
    .filter((f) => f.id !== id)
    .map((f) => {
      let updated = f;
      if (f.children)
        updated = { ...updated, children: removeFieldFromTree(f.children, id) };
      if (f.itemFields)
        updated = {
          ...updated,
          itemFields: removeFieldFromTree(f.itemFields, id),
        };
      return updated;
    });
}

// ── Resizer divider ────────────────────────────────────────
function Resizer({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return <div className="resizer" onMouseDown={onMouseDown} />;
}

// ── App ────────────────────────────────────────────────────
const PALETTE_MIN = 110;
const PANEL_MIN = 180;
const DIVIDER_W = 4;

function ls<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

const VALID_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
]);

function isValidField(f: unknown): f is SchemaField {
  if (!f || typeof f !== "object" || Array.isArray(f)) return false;
  const field = f as Record<string, unknown>;
  if (typeof field.id !== "string" || !field.id) return false;
  if (!VALID_TYPES.has(field.type as string)) return false;
  if (typeof field.name !== "string") return false;
  if (field.children !== undefined && !Array.isArray(field.children))
    return false;
  if (field.itemFields !== undefined && !Array.isArray(field.itemFields))
    return false;
  return true;
}

function sanitiseFields(raw: unknown): SchemaField[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<SchemaField[]>((acc, item) => {
    if (!isValidField(item)) return acc;
    const sanitised: SchemaField = { ...item };
    if (sanitised.children)
      sanitised.children = sanitiseFields(sanitised.children);
    if (sanitised.itemFields)
      sanitised.itemFields = sanitiseFields(sanitised.itemFields);
    acc.push(sanitised);
    return acc;
  }, []);
}

function loadFields(): SchemaField[] {
  try {
    const v = localStorage.getItem("jsb_fields");
    if (v === null) return [];
    return sanitiseFields(JSON.parse(v));
  } catch {
    return [];
  }
}

function loadWidths(): [number, number, number, number, number] | null {
  try {
    const v = localStorage.getItem("jsb_widths");
    if (v === null) return null;
    const parsed = JSON.parse(v);
    if (
      Array.isArray(parsed) &&
      parsed.length === 5 &&
      parsed.every(
        (n: unknown) => typeof n === "number" && n > 0 && isFinite(n),
      )
    ) {
      return parsed as [number, number, number, number, number];
    }
  } catch {}
  return null;
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => ls("jsb_isDark", true));
  const theme = isDark ? appDarkTheme : appLightTheme;

  // Sync body background to match the provider
  useEffect(() => {
    document.body.style.background = isDark ? themeBg.dark : themeBg.light;
    localStorage.setItem("jsb_isDark", JSON.stringify(isDark));
  }, [isDark]);

  const containerRef = useRef<HTMLDivElement>(null);

  const [widths, setWidths] = useState<
    [number, number, number, number, number]
  >(() => loadWidths() ?? [160, 240, 200, 480, 260]);
  const resizingRef = useRef<{
    divider: number;
    startX: number;
    startWidths: [number, number, number, number, number];
  } | null>(null);

  // Auto-distribute on first visit only (no saved widths yet)
  useLayoutEffect(() => {
    if (localStorage.getItem("jsb_widths")) return;
    const w = containerRef.current?.getBoundingClientRect().width;
    if (!w) return;
    const available = w - 4 * DIVIDER_W;
    const pal = 130;
    const chat = 280;
    const preview = Math.floor(available * 0.4);
    const rest = available - pal - preview - chat;
    const canvas = Math.floor(rest * 0.55);
    const editor = rest - canvas;
    setWidths([pal, canvas, editor, preview, chat]);
  }, []);

  useEffect(() => {
    localStorage.setItem("jsb_widths", JSON.stringify(widths));
  }, [widths]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const delta = e.clientX - r.startX;
      const w = [...r.startWidths] as [number, number, number, number, number];
      const mins = [PALETTE_MIN, PANEL_MIN, PANEL_MIN, PANEL_MIN, PANEL_MIN];
      if (r.divider === 0) {
        w[0] = Math.max(mins[0], r.startWidths[0] + delta);
        w[1] = Math.max(mins[1], r.startWidths[1] - (w[0] - r.startWidths[0]));
      } else if (r.divider === 1) {
        w[1] = Math.max(mins[1], r.startWidths[1] + delta);
        w[2] = Math.max(mins[2], r.startWidths[2] - (w[1] - r.startWidths[1]));
      } else if (r.divider === 2) {
        w[2] = Math.max(mins[2], r.startWidths[2] + delta);
        w[3] = Math.max(mins[3], r.startWidths[3] - (w[2] - r.startWidths[2]));
      } else {
        w[3] = Math.max(mins[3], r.startWidths[3] + delta);
        w[4] = Math.max(mins[4], r.startWidths[4] - (w[3] - r.startWidths[3]));
      }
      setWidths(w);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = (divider: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      divider,
      startX: e.clientX,
      startWidths: [...widths] as [number, number, number, number, number],
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // ── Schema state ─────────────────────────────────────────
  const [fields, setFields] = useState<SchemaField[]>(loadFields);
  const [schemaMeta, setSchemaMeta] = useState<{
    title: string;
    description: string;
  }>(() => ls("jsb_meta", { title: "", description: "" }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<FieldType | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  // Raw imported schema — used directly by PreviewPanel when present, bypassing field derivation.
  // Not persisted; re-import after a page refresh.
  const [rawSchema, setRawSchema] = useState<Record<string, unknown> | null>(
    null,
  );
  const [rawUiSchema, setRawUiSchema] = useState<Record<
    string,
    unknown
  > | null>(null);

  const clearRaw = useCallback(() => {
    setRawSchema(null);
    setRawUiSchema(null);
  }, []);

  // Values typed into the Live Preview form — persisted so they survive a refresh.
  const [previewData, setPreviewData] = useState<unknown>(() =>
    ls("jsb_previewData", {}),
  );

  useEffect(() => {
    localStorage.setItem("jsb_fields", JSON.stringify(fields));
  }, [fields]);

  useEffect(() => {
    localStorage.setItem("jsb_meta", JSON.stringify(schemaMeta));
  }, [schemaMeta]);

  useEffect(() => {
    localStorage.setItem("jsb_previewData", JSON.stringify(previewData));
  }, [previewData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const d = e.active.data.current;
    if (d?.fromPalette) setActiveType(d.fieldType as FieldType);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveType(null);
      const { active, over } = e;
      if (!over) return;
      const aData = active.data.current;
      const oData = over.data.current;

      if (aData?.fromPalette) {
        const type = aData.fieldType as FieldType;
        const child = makeField(type);
        clearRaw();

        if (oData?.parentId) {
          if (oData.dropType === "itemFields") {
            setFields((prev) =>
              updateFieldInTree(prev, oData.parentId, (parent) => ({
                ...parent,
                itemType: "object" as FieldType,
                itemFields: [...(parent.itemFields ?? []), child],
              })),
            );
          } else {
            setFields((prev) =>
              updateFieldInTree(prev, oData.parentId, (parent) => ({
                ...parent,
                children: [...(parent.children ?? []), child],
              })),
            );
          }
          setSelectedId(child.id);
          return;
        }

        if (over.id === "canvas-root" || oData?.isRoot) {
          setFields((prev) => [...prev, child]);
          setSelectedId(child.id);
          return;
        }

        const idx = fields.findIndex((f) => f.id === over.id);
        if (idx !== -1) {
          setFields((prev) => {
            const n = [...prev];
            n.splice(idx + 1, 0, child);
            return n;
          });
          setSelectedId(child.id);
        }
        return;
      }

      if (active.id !== over.id) {
        const parentId = aData?.parentId as string | undefined;
        const kind = aData?.kind as "children" | "itemFields" | undefined;
        if (parentId && kind) {
          setFields((prev) =>
            reorderWithinParent(
              prev,
              parentId,
              kind,
              active.id as string,
              over.id as string,
            ),
          );
          return;
        }

        const oi = fields.findIndex((f) => f.id === active.id);
        const ni = fields.findIndex((f) => f.id === over.id);
        if (oi !== -1 && ni !== -1)
          setFields((prev) => arrayMove(prev, oi, ni));
      }
    },
    [fields, clearRaw],
  );

  const handleFieldChange = useCallback(
    (updated: SchemaField) => {
      setFields((prev) => updateFieldInTree(prev, updated.id, () => updated));
      clearRaw();
    },
    [clearRaw],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setFields((prev) => removeFieldFromTree(prev, id));
      setSelectedId((s) => (s === id ? null : s));
      clearRaw();
    },
    [clearRaw],
  );

  const handleImport = useCallback(
    (
      importedFields: SchemaField[],
      importedUiSchema: Record<string, unknown> | undefined,
      importedRawSchema: Record<string, unknown>,
    ) => {
      setFields(
        importedUiSchema
          ? applyUiSchemaToFields(importedFields, importedUiSchema)
          : importedFields,
      );
      setRawSchema(importedRawSchema);
      setRawUiSchema(importedUiSchema ?? null);
      setSelectedId(null);
    },
    [],
  );

  return (
    <FluentProvider
      theme={theme}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: isDark ? themeBg.dark : themeBg.light,
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="app-header">
          <Text size={400} weight="semibold">
            JSON Schema Builder
          </Text>
          <Badge appearance="filled" color="brand" size="small">
            rjsf
          </Badge>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <ToggleButton
              appearance="subtle"
              size="small"
              checked={!isDark}
              onClick={() => setIsDark((v) => !v)}
            >
              {isDark ? "Light mode" : "Dark mode"}
            </ToggleButton>
            <Button
              appearance={chatOpen ? "primary" : "secondary"}
              size="small"
              onClick={() => setChatOpen((v) => !v)}
            >
              ✦ AI
            </Button>
            <Button
              appearance="secondary"
              size="small"
              onClick={() => setImportOpen(true)}
            >
              Import Schema
            </Button>
            <Button
              appearance="secondary"
              size="small"
              onClick={() => setMockOpen(true)}
            >
              Mock Data
            </Button>
          </div>
        </div>

        <div className="app-body" ref={containerRef}>
          <Palette width={widths[0]} />
          <Resizer onMouseDown={startResize(0)} />
          <Canvas
            fields={fields}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={handleDelete}
            onClear={() => {
              setFields([]);
              setSelectedId(null);
              clearRaw();
              setPreviewData({});
            }}
            schemaMeta={schemaMeta}
            onSchemaMetaChange={setSchemaMeta}
            width={widths[1]}
          />
          <Resizer onMouseDown={startResize(1)} />
          <EditorPanel
            fields={fields}
            selectedId={selectedId}
            onChange={handleFieldChange}
            width={widths[2]}
          />
          <Resizer onMouseDown={startResize(2)} />
          <PreviewPanel
            fields={fields}
            schemaMeta={schemaMeta}
            rawSchema={rawSchema}
            rawUiSchema={rawUiSchema}
            onClearRaw={clearRaw}
            formData={previewData}
            onFormDataChange={setPreviewData}
            width={widths[3]}
          />
          {chatOpen && (
            <>
              <Resizer onMouseDown={startResize(3)} />
              <ChatPanel
                fields={fields}
                schemaMeta={schemaMeta}
                rawSchema={rawSchema}
                onImport={handleImport}
                onClose={() => setChatOpen(false)}
                width={widths[4]}
              />
            </>
          )}
        </div>

        <ImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />

        <MockDataDialog
          open={mockOpen}
          onClose={() => setMockOpen(false)}
          fields={fields}
          rawUiSchema={rawUiSchema}
        />

        <DragOverlay>
          {activeType && (
            <div
              style={{
                padding: "7px 14px",
                background: "var(--colorNeutralBackground1)",
                border: "1px solid var(--colorBrandBackground)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--colorNeutralForeground1)",
                boxShadow: "0 8px 24px rgba(0,0,0,.5)",
                cursor: "grabbing",
              }}
            >
              + {activeType}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </FluentProvider>
  );
}
