import * as React from "react";
import {
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Text,
  Divider,
  Button,
} from "@fluentui/react-components";
import type { SchemaField, FieldType } from "../types";

const ALL_TYPES: FieldType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
];
const ITEM_TYPES: FieldType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
];
const STRING_FORMATS = [
  "",
  "date",
  "date-time",
  "email",
  "uri",
  "uuid",
  "hostname",
  "ipv4",
  "ipv6",
  "password",
];

const KNOWN_WIDGETS = [
  "textarea",
  "CheckboxWidget",
  "CheckboxesWidget",
  "EntityLookupWidget",
  "EntityLookupArrayWidget",
  "OptionSetWidget",
  "TextWidget",
  "ReadOnlyTextWidget",
  "FormattedIntegerWidget",
  "SelectWidget",
  "ColourPickerWidget",
];

// ── Widget option specs ─────────────────────────────────────
// Describes the ui:options fields each known widget actually reads, so the
// editor can render typed controls instead of a raw JSON blob. Anything the
// user sets outside this list (or for widgets not listed here) is preserved
// as "extra" JSON so nothing is lost.

type OptionFieldSpec =
  | { key: string; label: string; kind: "string"; placeholder?: string }
  | { key: string; label: string; kind: "boolean"; default?: boolean }
  | { key: string; label: string; kind: "number" }
  | { key: string; label: string; kind: "stringlist" };

const ENTITY_LOOKUP_OPTIONS: OptionFieldSpec[] = [
  {
    key: "endPoint",
    label: "Endpoint",
    kind: "string",
    placeholder: "contacts?$select=fullname,contactid",
  },
  { key: "nameField", label: "Name field", kind: "string" },
  { key: "nameFieldPath", label: "Name field path", kind: "string" },
  { key: "valueField", label: "Value field", kind: "string" },
  {
    key: "additionalSearchFilter",
    label: "Additional search filter",
    kind: "string",
  },
  { key: "consumer", label: "Consumer field", kind: "string" },
  { key: "provider", label: "Is provider", kind: "boolean", default: false },
  {
    key: "supportsContains",
    label: "Supports contains search",
    kind: "boolean",
    default: true,
  },
  {
    key: "supportOrderBy",
    label: "Supports order-by",
    kind: "boolean",
    default: true,
  },
  {
    key: "supportTop",
    label: "Supports top (limit)",
    kind: "boolean",
    default: true,
  },
  {
    key: "localizedLabels",
    label: "Localized labels",
    kind: "boolean",
    default: false,
  },
  { key: "readOnlyItems", label: "Read-only items", kind: "stringlist" },
];

const WIDGET_OPTION_SPECS: Record<string, OptionFieldSpec[]> = {
  EntityLookupWidget: ENTITY_LOOKUP_OPTIONS,
  EntityLookupArrayWidget: ENTITY_LOOKUP_OPTIONS,
  OptionSetWidget: [
    { key: "optionSetName", label: "Option set name", kind: "string" },
    {
      key: "entity",
      label: "Entity (for local option sets)",
      kind: "string",
    },
    {
      key: "global",
      label: "Global option set",
      kind: "boolean",
      default: true,
    },
  ],
  FormattedIntegerWidget: [
    { key: "displayPrefix", label: "Display prefix", kind: "string" },
    { key: "displaySuffix", label: "Display suffix", kind: "string" },
  ],
  CheckboxesWidget: [
    { key: "inline", label: "Inline layout", kind: "boolean", default: false },
  ],
  TextWidget: [{ key: "rows", label: "Rows (multiline)", kind: "number" }],
  textarea: [{ key: "rows", label: "Rows", kind: "number" }],
};

interface Props {
  field: SchemaField | null;
  onChange: (updated: SchemaField) => void;
}

function EnumEditor({
  values,
  onChange,
  inputType = "text",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  inputType?: "text" | "number";
}) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    if (inputType === "number" && isNaN(Number(v))) return;
    onChange([...values, v]);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--colorNeutralBackground4)",
            border: "1px solid var(--colorNeutralStroke2)",
            borderRadius: 4,
            padding: "3px 6px 3px 8px",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 12,
              color: "var(--colorNeutralForeground1)",
            }}
          >
            {v}
          </span>
          <button
            title="Remove"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--colorNeutralForeground3)",
              fontSize: 11,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <div
        style={{ display: "flex", gap: 4, marginTop: values.length ? 2 : 0 }}
      >
        <Input
          size="small"
          type={inputType}
          value={draft}
          onChange={(_, d) => setDraft(d.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={inputType === "number" ? "0" : "Add value…"}
          style={{ flex: 1 }}
        />
        <Button
          size="small"
          appearance="subtle"
          onClick={add}
          disabled={!draft.trim()}
        >
          +
        </Button>
      </div>
    </div>
  );
}

function parseOptions(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function renderSpecField(
  spec: OptionFieldSpec,
  values: Record<string, unknown>,
  update: (key: string, value: unknown) => void,
) {
  const raw = values[spec.key];
  switch (spec.kind) {
    case "string":
      return (
        <Field key={spec.key} label={spec.label} size="small">
          <Input
            size="small"
            value={(raw as string) ?? ""}
            placeholder={spec.placeholder}
            onChange={(_, d) => update(spec.key, d.value || undefined)}
          />
        </Field>
      );
    case "number":
      return (
        <Field key={spec.key} label={spec.label} size="small">
          <Input
            size="small"
            type="number"
            value={raw !== undefined && raw !== null ? String(raw) : ""}
            onChange={(_, d) =>
              update(spec.key, d.value === "" ? undefined : +d.value)
            }
          />
        </Field>
      );
    case "boolean":
      return (
        <Checkbox
          key={spec.key}
          label={spec.label}
          size="medium"
          checked={raw !== undefined ? !!raw : !!spec.default}
          onChange={(_, d) => {
            const checked = !!d.checked;
            update(spec.key, checked === spec.default ? undefined : checked);
          }}
        />
      );
    case "stringlist":
      return (
        <Field key={spec.key} label={spec.label} size="small">
          <EnumEditor
            values={(raw as string[]) ?? []}
            onChange={(vals) => update(spec.key, vals.length ? vals : undefined)}
          />
        </Field>
      );
  }
}

function WidgetOptionsEditor({
  field,
  set,
}: {
  field: SchemaField;
  set: (key: keyof SchemaField, value: unknown) => void;
}) {
  const parsed = parseOptions(field.uiOptions);
  const spec = WIDGET_OPTION_SPECS[field.uiWidget ?? ""] ?? [];
  const knownKeys = new Set(spec.map((s) => s.key));
  const extraEntries = Object.entries(parsed).filter(
    ([k]) => !knownKeys.has(k),
  );
  const extraJson = extraEntries.length
    ? JSON.stringify(Object.fromEntries(extraEntries), null, 2)
    : "";
  const [extraDraft, setExtraDraft] = React.useState(extraJson);
  const [extraTouched, setExtraTouched] = React.useState(false);
  const displayedExtra = extraTouched ? extraDraft : extraJson;

  const extraValid =
    !displayedExtra.trim() ||
    (() => {
      try {
        const v = JSON.parse(displayedExtra);
        return !!v && typeof v === "object" && !Array.isArray(v);
      } catch {
        return false;
      }
    })();

  const writeOptions = (next: Record<string, unknown>) => {
    const keys = Object.keys(next);
    set("uiOptions", keys.length ? JSON.stringify(next, null, 2) : undefined);
  };

  const updateSpecValue = (key: string, value: unknown) => {
    const next: Record<string, unknown> = { ...parsed };
    if (value === undefined) delete next[key];
    else next[key] = value;
    writeOptions(next);
  };

  const commitExtra = (text: string) => {
    setExtraDraft(text);
    setExtraTouched(true);
    let extra: Record<string, unknown> = {};
    try {
      const v = text.trim() ? JSON.parse(text) : {};
      if (v && typeof v === "object" && !Array.isArray(v)) extra = v;
      else return; // invalid shape — don't clobber known fields yet
    } catch {
      return; // invalid JSON — wait for a valid edit before writing
    }
    const known: Record<string, unknown> = {};
    for (const k of knownKeys) if (k in parsed) known[k] = parsed[k];
    writeOptions({ ...known, ...extra });
  };

  if (spec.length === 0) {
    // Unknown / custom widget name — fall back to a single raw JSON editor.
    const raw = field.uiOptions ?? "";
    const valid =
      !raw ||
      (() => {
        try {
          JSON.parse(raw);
          return true;
        } catch {
          return false;
        }
      })();
    return (
      <Field
        label="Widget options (JSON)"
        size="small"
        validationState={valid ? "none" : "error"}
        validationMessage={valid ? undefined : "Invalid JSON"}
      >
        <Textarea
          size="small"
          value={raw}
          onChange={(_, d) => set("uiOptions", d.value || undefined)}
          placeholder={
            '{\n  "endPoint": "contacts?$select=fullname,contactid",\n  "label": "Contact"\n}'
          }
          style={{
            minHeight: 72,
            fontFamily: "Consolas, monospace",
            fontSize: 11,
          }}
        />
      </Field>
    );
  }

  return (
    <>
      {spec.map((s) => renderSpecField(s, parsed, updateSpecValue))}
      <Field
        label="Additional options (JSON)"
        size="small"
        validationState={extraValid ? "none" : "error"}
        validationMessage={extraValid ? undefined : "Invalid JSON"}
      >
        <Textarea
          size="small"
          value={displayedExtra}
          onChange={(_, d) => commitExtra(d.value)}
          placeholder={'{\n  "customProp": "value"\n}'}
          style={{
            minHeight: 52,
            fontFamily: "Consolas, monospace",
            fontSize: 11,
          }}
        />
      </Field>
    </>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{ margin: "16px 0 10px" }}>
      <Divider>
        <Text
          size={100}
          weight="semibold"
          style={{
            color: "var(--colorNeutralForeground3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {children}
        </Text>
      </Divider>
    </div>
  );
}

export default function FieldEditor({ field, onChange }: Props) {
  if (!field) {
    return (
      <div className="editor-empty">
        <div style={{ fontSize: 28, opacity: 0.25, marginBottom: 8 }}>✎</div>
        <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
          Select a field to edit its properties
        </Text>
      </div>
    );
  }

  const set = (key: keyof SchemaField, value: unknown) =>
    onChange({ ...field, [key]: value });

  return (
    <div className="editor">
      {/* ── Core ── */}
      <div className="field-stack">
        <Field label="Field Name (key)" size="small">
          <Input
            size="small"
            value={field.name}
            onChange={(_, d) => set("name", d.value)}
            placeholder="fieldName"
          />
        </Field>

        <Field label="Type" size="small">
          <Select
            size="small"
            value={field.type}
            onChange={(_, d) => set("type", d.value as FieldType)}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title" size="small">
          <Input
            size="small"
            value={field.title ?? ""}
            onChange={(_, d) => set("title", d.value)}
            placeholder="Human-readable title"
          />
        </Field>

        <Field label="Description" size="small">
          <Textarea
            size="small"
            value={field.description ?? ""}
            onChange={(_, d) => set("description", d.value)}
            placeholder="Optional description"
            style={{ minHeight: 52 }}
          />
        </Field>

        <Checkbox
          label="Required"
          size="medium"
          checked={!!field.required}
          onChange={(_, d) => set("required", Boolean(d.checked))}
        />
      </div>

      {/* ── String ── */}
      {field.type === "string" && (
        <>
          <SectionHeading>String Options</SectionHeading>
          <div className="field-stack">
            <Field label="Format" size="small">
              <Select
                size="small"
                value={field.format ?? ""}
                onChange={(_, d) => set("format", d.value || undefined)}
              >
                {STRING_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f || "(none)"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Min Length" size="small">
              <Input
                size="small"
                type="number"
                value={field.minLength?.toString() ?? ""}
                onChange={(_, d) =>
                  set("minLength", d.value === "" ? undefined : +d.value)
                }
              />
            </Field>
            <Field label="Max Length" size="small">
              <Input
                size="small"
                type="number"
                value={field.maxLength?.toString() ?? ""}
                onChange={(_, d) =>
                  set("maxLength", d.value === "" ? undefined : +d.value)
                }
              />
            </Field>
            <Field label="Pattern (regex)" size="small">
              <Input
                size="small"
                value={field.pattern ?? ""}
                onChange={(_, d) => set("pattern", d.value || undefined)}
                placeholder="^[a-z]+$"
              />
            </Field>
            <Field label="Enum values" size="small">
              <EnumEditor
                values={field.enum ?? []}
                onChange={(vals) => set("enum", vals.length ? vals : undefined)}
              />
            </Field>
            <Checkbox
              label="Multiline (textarea)"
              size="medium"
              checked={field.uiWidget === "textarea"}
              onChange={(_, d) =>
                set("uiWidget", d.checked ? "textarea" : undefined)
              }
            />
          </div>
        </>
      )}

      {/* ── Number / Integer ── */}
      {(field.type === "number" || field.type === "integer") && (
        <>
          <SectionHeading>Numeric Options</SectionHeading>
          <div className="field-stack">
            <Field label="Minimum" size="small">
              <Input
                size="small"
                type="number"
                value={field.minimum?.toString() ?? ""}
                onChange={(_, d) =>
                  set("minimum", d.value === "" ? undefined : +d.value)
                }
              />
            </Field>
            <Field label="Maximum" size="small">
              <Input
                size="small"
                type="number"
                value={field.maximum?.toString() ?? ""}
                onChange={(_, d) =>
                  set("maximum", d.value === "" ? undefined : +d.value)
                }
              />
            </Field>
            <Field label="Enum values" size="small">
              <EnumEditor
                inputType="number"
                values={field.enum ?? []}
                onChange={(vals) => set("enum", vals.length ? vals : undefined)}
              />
            </Field>
          </div>
        </>
      )}

      {/* ── Array ── */}
      {field.type === "array" && (
        <>
          <SectionHeading>Array Items</SectionHeading>
          <div className="field-stack">
            <Field label="Item Type" size="small">
              <Select
                size="small"
                value={field.itemType ?? "string"}
                onChange={(_, d) => {
                  const t = d.value as FieldType;
                  set("itemType", t);
                  if (t !== "object") set("itemFields", undefined);
                }}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>

            {field.itemType === "object" && (
              <Text
                size={100}
                style={{
                  color: "var(--colorNeutralForeground3)",
                  lineHeight: "1.5",
                }}
              >
                Drop fields into the item schema zone on the canvas to add
                nested properties.
              </Text>
            )}
          </div>
        </>
      )}

      {/* ── Object ── */}
      {field.type === "object" && (
        <div style={{ marginTop: 12 }}>
          <Text
            size={100}
            style={{
              color: "var(--colorNeutralForeground3)",
              lineHeight: "1.5",
            }}
          >
            Drop fields into the object zone on the canvas to add nested
            properties.
          </Text>
        </div>
      )}

      {/* ── UI Options ── */}
      <SectionHeading>UI Options</SectionHeading>
      <div className="field-stack">
        <Field label="Widget" size="small">
          <Input
            size="small"
            value={field.uiWidget ?? ""}
            onChange={(_, d) => set("uiWidget", d.value || undefined)}
            placeholder="Default"
            input={
              {
                list: "kaizen-widget-list",
              } as React.InputHTMLAttributes<HTMLInputElement>
            }
          />
          <datalist id="kaizen-widget-list">
            {KNOWN_WIDGETS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </Field>

        <Checkbox
          label="Full width"
          size="medium"
          checked={!!field.uiFullWidth}
          onChange={(_, d) => set("uiFullWidth", d.checked || undefined)}
        />

        {field.type === "array" && (
          <Field label="Array display" size="small">
            <Select
              size="small"
              value={field.uiArrayDisplay ?? "default"}
              onChange={(_, d) =>
                set(
                  "uiArrayDisplay",
                  d.value === "default" ? undefined : d.value,
                )
              }
            >
              <option value="default">Default (expandable list)</option>
              <option value="table">Inline table</option>
              <option value="dialog">Dialog subform</option>
            </Select>
          </Field>
        )}

        <WidgetOptionsEditor
          key={`${field.id}:${field.uiWidget ?? ""}`}
          field={field}
          set={set}
        />
      </div>
    </div>
  );
}
