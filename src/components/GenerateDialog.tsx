import { useState, useCallback } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Text,
  MessageBar,
  MessageBarBody,
  Spinner,
  Badge,
} from "@fluentui/react-components";
import type { SchemaField } from "../types";
import { jsonSchemaToFields, applyUiSchemaToFields } from "../schemaUtils";

// ── Constants ─────────────────────────────────────────────

const LS_KEY = "jsb_anthropic_key";

const MODELS = [
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (best)" },
];

// Inline system prompt — mirrors .copilot/SKILL.md
const SYSTEM_PROMPT = `You are an expert JSON Schema author working with the JSON Schema Builder tool.

When given a natural-language description of a form or data structure, you produce a valid JSON Schema object.

OUTPUT CONTRACT — CRITICAL:
- Return ONLY the raw JSON — no markdown fences, no prose, no explanation.
- If the user requested a UI Schema, return: { "schema": { ... }, "uiSchema": { ... } }
- Otherwise return the JSON Schema object directly: { "type": "object", ... }
- Never include $schema, $ref, $defs, oneOf, anyOf, allOf, or if/then.

FIELD TYPES:
- string: supports format (date, date-time, email, uri, uuid, password), minLength, maxLength, pattern, enum
- number / integer: supports minimum, maximum
- boolean
- array: must include "items" — { "type": "scalar" } or an object schema
- object: must include "properties"

ENUM: omit "type" when using "enum": ["a","b","c"]

REQUIRED: add field names to parent "required": [...] array

ARRAY OF OBJECTS example:
{ "type": "array", "items": { "type": "object", "properties": { ... }, "required": [...] } }

UI SCHEMA directives (when requested):
- "ui:widget": one of CheckboxWidget, CheckboxesWidget, SelectWidget, OptionSetWidget, TextWidget, ReadOnlyTextWidget, FormattedIntegerWidget, ColourPickerWidget, EntityLookupWidget, EntityLookupArrayWidget
- "fullWidth": true
- "useArrayInlineTable": true  (table display for array)
- "useArrayItemDialog": true   (dialog subform for array)
- "ui:options": { ... }        (widget-specific config)

NAMING: camelCase keys, human-readable "title" values.
DEPTH: max 2 levels of nesting. No $ref, $defs, definitions, oneOf, anyOf, allOf.`;

// ── Helpers ───────────────────────────────────────────────

function loadKey(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveKey(key: string): void {
  try {
    if (key) localStorage.setItem(LS_KEY, key);
    else localStorage.removeItem(LS_KEY);
  } catch {}
}

/** Extract the first JSON object from a string — handles accidental markdown fences */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {}
  // Strip ```json ... ``` or ``` ... ```
  const fenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(fenced);
  } catch {}
  // Find first { ... } block
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  throw new Error("Could not parse a JSON object from the model response.");
}

// ── Types ─────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (
    fields: SchemaField[],
    uiSchema: Record<string, unknown> | undefined,
    rawSchema: Record<string, unknown>,
  ) => void;
}

// ── Component ─────────────────────────────────────────────

export default function GenerateDialog({ open, onClose, onImport }: Props) {
  const [apiKey, setApiKey] = useState<string>(loadKey);
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [includeUi, setIncludeUi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setPrompt("");
    setError("");
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleKeyChange = useCallback((val: string) => {
    setApiKey(val);
    saveKey(val);
  }, []);

  const handleGenerate = useCallback(async () => {
    setError("");
    setLoading(true);

    const userMessage = includeUi
      ? `${prompt}\n\nAlso return a uiSchema object with appropriate widget and display hints. Return: { "schema": { ... }, "uiSchema": { ... } }`
      : prompt;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const msg = (body?.error as Record<string, unknown> | undefined)
          ?.message as string | undefined;
        throw new Error(msg ?? `API error ${res.status}`);
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
      };
      const text = data.content.find((c) => c.type === "text")?.text ?? "";
      if (!text) throw new Error("Empty response from model.");

      const parsed = extractJson(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Model did not return a JSON object.");
      }

      const root = parsed as Record<string, unknown>;

      // Detect wrapped { schema, uiSchema } envelope
      let rawSchema: Record<string, unknown>;
      let rawUiSchema: Record<string, unknown> | undefined;

      if (
        root.schema &&
        typeof root.schema === "object" &&
        !Array.isArray(root.schema)
      ) {
        rawSchema = root.schema as Record<string, unknown>;
        if (
          root.uiSchema &&
          typeof root.uiSchema === "object" &&
          !Array.isArray(root.uiSchema)
        ) {
          rawUiSchema = root.uiSchema as Record<string, unknown>;
        }
      } else {
        rawSchema = root;
      }

      const fields = jsonSchemaToFields(rawSchema);
      if (fields.length === 0) {
        throw new Error(
          "Schema was parsed but no fields were found. Try rephrasing your prompt.",
        );
      }

      const finalFields = rawUiSchema
        ? applyUiSchemaToFields(fields, rawUiSchema)
        : fields;

      onImport(finalFields, rawUiSchema, rawSchema);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [apiKey, model, prompt, includeUi, onImport, onClose, reset]);

  const canGenerate = !!apiKey.trim() && !!prompt.trim() && !loading;

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => {
        if (!d.open) handleClose();
      }}
    >
      <DialogSurface className="generate-dialog-surface">
        <DialogTitle>
          <span className="generate-dialog-title">
            Generate Schema with AI
            <Badge appearance="tint" color="brand" size="small">
              Claude
            </Badge>
          </span>
        </DialogTitle>
        <DialogBody>
          <DialogContent>
            <Text size={200} className="generate-dialog-intro">
              Describe your form or data structure in plain English. Claude will
              generate a JSON Schema (and optional UI hints) which will be
              imported into the canvas.
            </Text>

            {/* API Key */}
            <Field
              label={
                <span className="generate-key-label">
                  Anthropic API Key
                  <Text size={100} className="generate-key-note">
                    Sent directly to api.anthropic.com — never stored on any
                    server.
                  </Text>
                </span>
              }
              required
              className="generate-field"
            >
              <div className="generate-key-row">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(_, d) => handleKeyChange(d.value)}
                  placeholder="sk-ant-api03-..."
                  className="generate-key-input"
                />
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? "Hide" : "Show"}
                </Button>
                {apiKey && (
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={() => handleKeyChange("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Field>

            {/* Prompt */}
            <Field
              label="Describe your schema"
              required
              className="generate-field"
            >
              <Textarea
                value={prompt}
                onChange={(_, d) => {
                  setPrompt(d.value);
                  setError("");
                }}
                placeholder="e.g. A contact form with first name, last name, required email, phone, and a dropdown status field (active / inactive). Mark email and first name as required."
                className="generate-prompt"
                resize="vertical"
              />
            </Field>

            {/* Options row */}
            <div className="generate-options-row">
              <Field
                label="Model"
                size="small"
                className="generate-model-field"
              >
                <Select
                  size="small"
                  value={model}
                  onChange={(_, d) => setModel(d.value)}
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Checkbox
                label="Include UI hints"
                checked={includeUi}
                onChange={(_, d) => setIncludeUi(Boolean(d.checked))}
                className="generate-ui-checkbox"
              />
            </div>

            {/* Error */}
            {error && (
              <MessageBar intent="error" className="generate-error">
                <MessageBarBody>
                  <Text size={100}>{error}</Text>
                </MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>

          <DialogActions>
            <Button
              appearance="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleGenerate}
              disabled={!canGenerate}
              icon={loading ? <Spinner size="tiny" /> : undefined}
            >
              {loading ? "Generating…" : "Generate"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
