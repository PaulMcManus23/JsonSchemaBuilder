import { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
  Button, Textarea, Text, Field, Badge, Divider,
} from '@fluentui/react-components'
import type { SchemaField } from '../types'
import { fieldsToUiSchema } from '../schemaUtils'
import { getCurrentMockStore, updateMockStore } from '../rjsf/mockStore'

interface Props {
  open: boolean
  onClose: () => void
  fields: SchemaField[]
  rawUiSchema?: Record<string, unknown> | null
}

interface Endpoint {
  key: string
  label: string
  type: 'entity' | 'optionSet'
}

function scan(
  uiSchema: Record<string, unknown>,
  pathLabel: string,
  seen: Map<string, Endpoint>,
): void {
  for (const [key, value] of Object.entries(uiSchema)) {
    if (key.startsWith('ui:') || typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const fieldUi = value as Record<string, unknown>
    const label = pathLabel ? `${pathLabel} › ${key}` : key
    const opts = fieldUi['ui:options'] as Record<string, unknown> | undefined
    if (opts?.endPoint && typeof opts.endPoint === 'string' && !seen.has(opts.endPoint))
      seen.set(opts.endPoint, { key: opts.endPoint, label, type: 'entity' })
    if (opts?.optionSetName && typeof opts.optionSetName === 'string' && !seen.has(opts.optionSetName))
      seen.set(opts.optionSetName, { key: opts.optionSetName, label, type: 'optionSet' })
    scan(fieldUi, label, seen)
  }
}

function scanUiSchema(uiSchema: Record<string, unknown>): Endpoint[] {
  const seen = new Map<string, Endpoint>()
  scan(uiSchema, '', seen)
  return Array.from(seen.values())
}

const ENTITY_PLACEHOLDER = `[\n  { "key": "abc-001", "name": "John Doe" },\n  { "key": "abc-002", "name": "Jane Smith" }\n]`
const OPTIONSET_PLACEHOLDER = `[\n  { "key": "1", "text": "Active" },\n  { "key": "2", "text": "Inactive" }\n]`

export default function MockDataDialog({ open, onClose, fields, rawUiSchema }: Props) {
  const uiSchema = useMemo(
    () => rawUiSchema ?? fieldsToUiSchema(fields),
    [rawUiSchema, fields],
  )
  const endpoints = useMemo(() => scanUiSchema(uiSchema), [uiSchema])

  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load from store whenever the dialog opens
  useEffect(() => {
    if (!open) return
    const store = getCurrentMockStore()
    const init: Record<string, string> = {}
    for (const ep of endpoints) {
      const data = ep.type === 'entity' ? store.entities[ep.key] : store.optionSets[ep.key]
      init[ep.key] = data?.length ? JSON.stringify(data, null, 2) : ''
    }
    setValues(init)
    setErrors({})
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save to store whenever a value is valid JSON
  const handleChange = (ep: Endpoint, val: string) => {
    setValues(prev => ({ ...prev, [ep.key]: val }))

    if (!val.trim()) {
      // Empty — remove from store
      const store = getCurrentMockStore()
      if (ep.type === 'entity') {
        const entities = { ...store.entities }
        delete entities[ep.key]
        updateMockStore({ ...store, entities })
      } else {
        const optionSets = { ...store.optionSets }
        delete optionSets[ep.key]
        updateMockStore({ ...store, optionSets })
      }
      setErrors(prev => { const n = { ...prev }; delete n[ep.key]; return n })
      return
    }

    try {
      const parsed = JSON.parse(val)
      const store = getCurrentMockStore()
      if (ep.type === 'entity') {
        updateMockStore({ ...store, entities: { ...store.entities, [ep.key]: parsed } })
      } else {
        updateMockStore({ ...store, optionSets: { ...store.optionSets, [ep.key]: parsed } })
      }
      setErrors(prev => { const n = { ...prev }; delete n[ep.key]; return n })
    } catch (e) {
      // Not valid JSON yet — just show error indicator, don't touch the store
      setErrors(prev => ({ ...prev, [ep.key]: (e as Error).message }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onClose() }}>
      <DialogSurface style={{ maxWidth: 680, width: '90vw' }}>
        <DialogTitle>Mock Service Data</DialogTitle>
        <DialogBody>
          <DialogContent>
            <Text size={200} as="p" block style={{ color: 'var(--colorNeutralForeground3)', marginBottom: 16 }}>
              Endpoints discovered from the current UI schema. Changes are saved automatically when the JSON is valid.
            </Text>

            {endpoints.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Text size={200} style={{ color: 'var(--colorNeutralForeground3)' }}>
                  No widget endpoints found in the current schema.
                  Add fields with <code>EntityLookupWidget</code> or <code>OptionSetWidget</code> and configure their <code>ui:options</code>.
                </Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {endpoints.map((ep, i) => (
                  <div key={ep.key}>
                    {i > 0 && <Divider style={{ margin: '4px 0' }} />}
                    <div style={{ padding: '12px 0 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text size={200} weight="semibold" style={{ color: 'var(--colorNeutralForeground2)' }}>
                          {ep.label}
                        </Text>
                        <Badge
                          appearance="tint"
                          color={ep.type === 'entity' ? 'brand' : 'success'}
                          size="small"
                        >
                          {ep.type === 'entity' ? 'Entity' : 'Option Set'}
                        </Badge>
                        {!errors[ep.key] && values[ep.key]?.trim() && (
                          <Badge appearance="tint" color="success" size="small">Saved</Badge>
                        )}
                      </div>
                      <Text
                        size={100}
                        style={{
                          display: 'block',
                          fontFamily: 'Consolas, monospace',
                          color: 'var(--colorNeutralForeground3)',
                          marginBottom: 6,
                        }}
                      >
                        {ep.key}
                      </Text>
                      <Field
                        validationState={errors[ep.key] ? 'error' : 'none'}
                        validationMessage={errors[ep.key]}
                      >
                        <Textarea
                          value={values[ep.key] ?? ''}
                          onChange={(_, d) => handleChange(ep, d.value)}
                          placeholder={ep.type === 'entity' ? ENTITY_PLACEHOLDER : OPTIONSET_PLACEHOLDER}
                          rows={5}
                          style={{ fontFamily: 'Consolas, monospace', fontSize: 12, width: '100%' }}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>

          <DialogActions>
            <Button appearance="primary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
