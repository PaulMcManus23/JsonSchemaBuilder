import * as React from 'react'
import {
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Text,
  Divider,
} from '@fluentui/react-components'
import type { SchemaField, FieldType } from '../types'

const ALL_TYPES: FieldType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object']
const ITEM_TYPES: FieldType[] = ['string', 'number', 'integer', 'boolean', 'object']
const STRING_FORMATS = ['', 'date', 'date-time', 'email', 'uri', 'uuid', 'hostname', 'ipv4', 'ipv6', 'password']

const KNOWN_WIDGETS = [
  'CheckboxWidget', 'CheckboxesWidget', 'EntityLookupWidget', 'EntityLookupArrayWidget',
  'OptionSetWidget', 'TextWidget', 'ReadOnlyTextWidget', 'FormattedIntegerWidget',
  'SelectWidget', 'ColourPickerWidget',
]

interface Props {
  field: SchemaField | null
  onChange: (updated: SchemaField) => void
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{ margin: '16px 0 10px' }}>
      <Divider>
        <Text size={100} weight="semibold" style={{ color: 'var(--colorNeutralForeground3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {children}
        </Text>
      </Divider>
    </div>
  )
}

export default function FieldEditor({ field, onChange }: Props) {
  if (!field) {
    return (
      <div className="editor-empty">
        <div style={{ fontSize: 28, opacity: .25, marginBottom: 8 }}>✎</div>
        <Text size={200} style={{ color: 'var(--colorNeutralForeground3)' }}>
          Select a field to edit its properties
        </Text>
      </div>
    )
  }

  const set = (key: keyof SchemaField, value: unknown) =>
    onChange({ ...field, [key]: value })

  const uiOptionsValid = !field.uiOptions || (() => {
    try { JSON.parse(field.uiOptions); return true } catch { return false }
  })()

  return (
    <div className="editor">
      {/* ── Core ── */}
      <div className="field-stack">
        <Field label="Field Name (key)" size="small">
          <Input
            size="small"
            value={field.name}
            onChange={(_, d) => set('name', d.value)}
            placeholder="fieldName"
          />
        </Field>

        <Field label="Type" size="small">
          <Select
            size="small"
            value={field.type}
            onChange={(_, d) => set('type', d.value as FieldType)}
          >
            {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>

        <Field label="Title" size="small">
          <Input
            size="small"
            value={field.title ?? ''}
            onChange={(_, d) => set('title', d.value)}
            placeholder="Human-readable title"
          />
        </Field>

        <Field label="Description" size="small">
          <Textarea
            size="small"
            value={field.description ?? ''}
            onChange={(_, d) => set('description', d.value)}
            placeholder="Optional description"
            style={{ minHeight: 52 }}
          />
        </Field>

        <Checkbox
          label="Required"
          size="medium"
          checked={!!field.required}
          onChange={(_, d) => set('required', Boolean(d.checked))}
        />
      </div>

      {/* ── String ── */}
      {field.type === 'string' && (
        <>
          <SectionHeading>String Options</SectionHeading>
          <div className="field-stack">
            <Field label="Format" size="small">
              <Select
                size="small"
                value={field.format ?? ''}
                onChange={(_, d) => set('format', d.value || undefined)}
              >
                {STRING_FORMATS.map(f => <option key={f} value={f}>{f || '(none)'}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Min Length" size="small">
                <Input size="small" type="number" value={field.minLength?.toString() ?? ''} onChange={(_, d) => set('minLength', d.value === '' ? undefined : +d.value)} />
              </Field>
              <Field label="Max Length" size="small">
                <Input size="small" type="number" value={field.maxLength?.toString() ?? ''} onChange={(_, d) => set('maxLength', d.value === '' ? undefined : +d.value)} />
              </Field>
            </div>
            <Field label="Pattern (regex)" size="small">
              <Input size="small" value={field.pattern ?? ''} onChange={(_, d) => set('pattern', d.value || undefined)} placeholder="^[a-z]+$" />
            </Field>
            <Field label="Enum values (comma-separated)" size="small">
              <Input
                size="small"
                value={(field.enum ?? []).join(', ')}
                onChange={(_, d) => {
                  const vals = d.value.split(',').map(s => s.trim()).filter(Boolean)
                  set('enum', vals.length ? vals : undefined)
                }}
                placeholder="opt1, opt2, opt3"
              />
            </Field>
          </div>
        </>
      )}

      {/* ── Number / Integer ── */}
      {(field.type === 'number' || field.type === 'integer') && (
        <>
          <SectionHeading>Numeric Options</SectionHeading>
          <div className="field-stack">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Minimum" size="small">
                <Input size="small" type="number" value={field.minimum?.toString() ?? ''} onChange={(_, d) => set('minimum', d.value === '' ? undefined : +d.value)} />
              </Field>
              <Field label="Maximum" size="small">
                <Input size="small" type="number" value={field.maximum?.toString() ?? ''} onChange={(_, d) => set('maximum', d.value === '' ? undefined : +d.value)} />
              </Field>
            </div>
          </div>
        </>
      )}

      {/* ── Array ── */}
      {field.type === 'array' && (
        <>
          <SectionHeading>Array Items</SectionHeading>
          <div className="field-stack">
            <Field label="Item Type" size="small">
              <Select
                size="small"
                value={field.itemType ?? 'string'}
                onChange={(_, d) => {
                  const t = d.value as FieldType
                  set('itemType', t)
                  if (t !== 'object') set('itemFields', undefined)
                }}
              >
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>

            {field.itemType === 'object' && (
              <Text size={100} style={{ color: 'var(--colorNeutralForeground3)', lineHeight: '1.5' }}>
                Drop fields into the item schema zone on the canvas to add nested properties.
              </Text>
            )}
          </div>
        </>
      )}

      {/* ── Object ── */}
      {field.type === 'object' && (
        <div style={{ marginTop: 12 }}>
          <Text size={100} style={{ color: 'var(--colorNeutralForeground3)', lineHeight: '1.5' }}>
            Drop fields into the object zone on the canvas to add nested properties.
          </Text>
        </div>
      )}

      {/* ── UI Options ── */}
      <SectionHeading>UI Options</SectionHeading>
      <div className="field-stack">

        <Field label="Widget" size="small">
          <Input
            size="small"
            value={field.uiWidget ?? ''}
            onChange={(_, d) => set('uiWidget', d.value || undefined)}
            placeholder="Default"
            input={{ list: 'kaizen-widget-list' } as React.InputHTMLAttributes<HTMLInputElement>}
          />
          <datalist id="kaizen-widget-list">
            {KNOWN_WIDGETS.map(w => <option key={w} value={w} />)}
          </datalist>
        </Field>

        <Checkbox
          label="Full width"
          size="medium"
          checked={!!field.uiFullWidth}
          onChange={(_, d) => set('uiFullWidth', d.checked || undefined)}
        />

        {field.type === 'array' && (
          <Field label="Array display" size="small">
            <Select
              size="small"
              value={field.uiArrayDisplay ?? 'default'}
              onChange={(_, d) => set('uiArrayDisplay', d.value === 'default' ? undefined : d.value)}
            >
              <option value="default">Default (expandable list)</option>
              <option value="table">Inline table</option>
              <option value="dialog">Dialog subform</option>
            </Select>
          </Field>
        )}

        <Field
          label="Widget options (JSON)"
          size="small"
          validationState={uiOptionsValid ? 'none' : 'error'}
          validationMessage={uiOptionsValid ? undefined : 'Invalid JSON'}
        >
          <Textarea
            size="small"
            value={field.uiOptions ?? ''}
            onChange={(_, d) => set('uiOptions', d.value || undefined)}
            placeholder={'{\n  "endPoint": "contacts?$select=fullname,contactid",\n  "label": "Contact"\n}'}
            style={{ minHeight: 72, fontFamily: 'Consolas, monospace', fontSize: 11 }}
          />
        </Field>
      </div>
    </div>
  )
}
