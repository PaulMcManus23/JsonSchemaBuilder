import { useState, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Input,
  Select,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { v4 as uuidv4 } from "uuid";
import type { SchemaField } from "../types";
import {
  fieldsToJsonSchema,
  fieldsToUiSchema,
  jsonSchemaToFields,
  applyUiSchemaToFields,
} from "../schemaUtils";

// ── Constants ─────────────────────────────────────────────

const LS_KEY = "jsb_anthropic_key";
const LS_MESSAGES_KEY = "jsb_chat_messages";
const MAX_STORED_MESSAGES = 50;

// Fallback shown only if the API call to /v1/models fails
const FALLBACK_MODELS = [
  { id: "claude-3-5-haiku-20241022", display_name: "Claude 3.5 Haiku" },
  { id: "claude-3-5-sonnet-20241022", display_name: "Claude 3.5 Sonnet" },
];

interface AnthropicModel {
  id: string;
  display_name: string;
}

const ANTHROPIC_HEADERS = (key: string) => ({
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
});

const CHAT_SYSTEM_PROMPT = `You are an expert JSON Schema assistant helping a user iteratively design forms and data structures.

For EVERY message, regardless of what the user asks:
1. Read the CURRENT SCHEMA provided at the top of the message
2. Apply the requested changes, or create a schema from scratch if it is empty
3. Return ONLY this JSON object (no markdown fences, no text outside the JSON):

{
  "message": "Brief 1-2 sentence summary of what changed",
  "schema": { ...complete updated JSON Schema... },
  "uiSchema": { ...include only when there are meaningful widget/display hints... }
}

The "schema" value must ALWAYS be the complete, updated JSON Schema — never a partial diff.
The "uiSchema" key is optional; omit it entirely if there are no UI hints.

── SCHEMA FORMAT ─────────────────────────────────────────────────────────────

Root: { "type": "object", "title": "...", "properties": { ... }, "required": [...] }

Field types: string | number | integer | boolean | array | object

string constraints: format (date, date-time, email, uri, uuid, password, hostname, ipv4, ipv6),
                   minLength, maxLength, pattern, enum

  Enum: omit "type", use only "enum": ["a", "b", "c"]

number/integer constraints: minimum, maximum

array: must have "items": { "type": "scalar" }
       or "items": { "type": "object", "properties": {...}, "required": [...] }

object: must have "properties": { ... }

required: add property keys to the parent "required": [...] array

── UI SCHEMA ────────────────────────────────────────────────────────────────

"ui:widget": CheckboxWidget | CheckboxesWidget | SelectWidget | OptionSetWidget |
             TextWidget | ReadOnlyTextWidget | FormattedIntegerWidget |
             ColourPickerWidget | EntityLookupWidget | EntityLookupArrayWidget

"fullWidth": true
"useArrayInlineTable": true   — table view for array of objects
"useArrayItemDialog": true    — dialog subform for array of objects
"ui:options": { ...widget config... }

For array item fields, nest under "items": { "fieldName": { "ui:widget": "..." } }

── NAMING ──────────────────────────────────────────────────────────────────

Property keys: camelCase. Title: human-readable with spaces.
Never include $ref, $defs, $schema, oneOf, anyOf, allOf, if/then.
Max nesting depth: 2 levels.`;

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

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LS_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m &&
        typeof m.id === "string" &&
        typeof m.text === "string" &&
        (m.role === "user" || m.role === "assistant" || m.role === "error"),
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]): void {
  try {
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(trimmed));
  } catch {}
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(fenced);
  } catch {}
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  fieldCount?: number;
}

interface Props {
  fields: SchemaField[];
  schemaMeta?: { title?: string; description?: string };
  rawSchema?: Record<string, unknown> | null;
  onImport: (
    fields: SchemaField[],
    uiSchema: Record<string, unknown> | undefined,
    rawSchema: Record<string, unknown>,
  ) => void;
  onClose: () => void;
}

// ── Sub-components ────────────────────────────────────────

function EmptyState() {
  return (
    <div className="chat-panel__empty">
      <div className="chat-panel__empty-icon">✦</div>
      <Text size={200} className="chat-panel__empty-title">
        AI Schema Assistant
      </Text>
      <Text size={100} className="chat-panel__empty-desc">
        Describe the form or data structure you need, or ask me to modify the
        current schema.
      </Text>
      <ul className="chat-panel__examples">
        <li>"Create a customer profile with name, email, and address"</li>
        <li>"Add a required phone field"</li>
        <li>"Make status a dropdown: active, inactive, pending"</li>
        <li>"Add a line items array with product and quantity"</li>
      </ul>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`chat-panel__bubble chat-panel__bubble--${msg.role}`}>
      <Text size={200} className="chat-panel__bubble-text">
        {msg.text}
      </Text>
      {msg.role === "assistant" && msg.fieldCount !== undefined && (
        <Text size={100} className="chat-panel__bubble-meta">
          {msg.fieldCount} field{msg.fieldCount !== 1 ? "s" : ""} on canvas
        </Text>
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="chat-panel__bubble chat-panel__bubble--thinking">
      <Spinner size="tiny" />
      <Text size={100}>Thinking…</Text>
    </div>
  );
}

function KeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [draft, setDraft] = useState("");
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="chat-panel__setup">
      <div className="chat-panel__setup-icon">🔑</div>
      <Text size={300} weight="semibold" className="chat-panel__setup-title">
        Connect your Anthropic key
      </Text>
      <Text size={100} className="chat-panel__setup-desc">
        Your key is stored only in this browser and sent directly to
        api.anthropic.com — never to any server.
      </Text>
      <div className="chat-panel__setup-row">
        <Input
          type={showKey ? "text" : "password"}
          value={draft}
          onChange={(_, d) => setDraft(d.value)}
          placeholder="sk-ant-api03-…"
          className="chat-panel__setup-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) onSave(draft.trim());
          }}
        />
        <Button
          appearance="subtle"
          size="small"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? "Hide" : "Show"}
        </Button>
      </div>
      <Button
        appearance="primary"
        size="small"
        disabled={!draft.trim()}
        onClick={() => onSave(draft.trim())}
        className="chat-panel__setup-btn"
      >
        Save &amp; Start Chatting
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export default function ChatPanel({
  fields,
  schemaMeta,
  rawSchema,
  onImport,
  onClose,
}: Props) {
  const [apiKey, setApiKey] = useState<string>(loadKey);
  const [showSetup, setShowSetup] = useState<boolean>(() => !loadKey());
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<AnthropicModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const fetchModels = useCallback(async (key: string) => {
    setModelsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: ANTHROPIC_HEADERS(key),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { data: AnthropicModel[] };
      const list = (data.data ?? []).filter((m) => m.id.startsWith("claude-"));
      if (list.length === 0) throw new Error("empty");
      setModels(list);
      // Prefer haiku (fast) as default; otherwise pick first
      const preferred =
        list.find((m) => m.id.toLowerCase().includes("haiku")) ?? list[0];
      setModel((prev) => prev || preferred.id);
    } catch {
      setModels(FALLBACK_MODELS);
      setModel((prev) => prev || FALLBACK_MODELS[0].id);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Fetch models whenever we have a key and are in chat mode
  useEffect(() => {
    if (apiKey && !showSetup) fetchModels(apiKey);
  }, [apiKey, showSetup, fetchModels]);

  const handleSaveKey = useCallback(
    (key: string) => {
      saveKey(key);
      setApiKey(key);
      setShowSetup(false);
      fetchModels(key);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [fetchModels],
  );

  const handleClearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const handleClearKey = useCallback(() => {
    saveKey("");
    setApiKey("");
    setShowSetup(true);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { id: uuidv4(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build current schema context — prefer rawSchema (imported/AI-generated) if present
      const currentSchema =
        rawSchema ??
        (fieldsToJsonSchema(fields, schemaMeta) as Record<string, unknown>);
      const currentUiSchema = fieldsToUiSchema(fields);
      const hasUi = Object.keys(currentUiSchema).length > 0;
      const schemaContext = [
        "Current schema:",
        JSON.stringify(currentSchema, null, 2),
        ...(hasUi
          ? ["\nCurrent uiSchema:", JSON.stringify(currentUiSchema, null, 2)]
          : []),
        "\n---\n",
        text,
      ].join("\n");

      // Conversation history — keep last 14 turns (7 pairs), skip error messages
      const history = messages
        .filter((m) => m.role !== "error")
        .slice(-14)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.text,
        }));

      const apiMessages = [
        ...history,
        { role: "user" as const, content: schemaContext },
      ];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          ...ANTHROPIC_HEADERS(apiKey),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: CHAT_SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const errMsg = (body?.error as Record<string, unknown> | undefined)
          ?.message as string | undefined;
        throw new Error(errMsg ?? `API error ${res.status}`);
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
      };
      const responseText =
        data.content.find((c) => c.type === "text")?.text ?? "";
      if (!responseText) throw new Error("Empty response from model.");

      const parsed = extractJson(responseText) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Model did not return a JSON object.");
      }

      // Extract envelope: { message, schema, uiSchema? }
      const assistantMessage =
        typeof parsed.message === "string" ? parsed.message : "Schema updated.";
      const rawNewSchema = (
        parsed.schema &&
        typeof parsed.schema === "object" &&
        !Array.isArray(parsed.schema)
          ? parsed.schema
          : parsed
      ) as Record<string, unknown>; // fallback: the whole object IS the schema

      const rawNewUiSchema =
        parsed.uiSchema &&
        typeof parsed.uiSchema === "object" &&
        !Array.isArray(parsed.uiSchema)
          ? (parsed.uiSchema as Record<string, unknown>)
          : undefined;

      const newFields = jsonSchemaToFields(rawNewSchema);
      if (newFields.length === 0)
        throw new Error("Schema parsed but no fields found. Try rephrasing.");

      const finalFields = rawNewUiSchema
        ? applyUiSchemaToFields(newFields, rawNewUiSchema)
        : newFields;

      onImport(finalFields, rawNewUiSchema, rawNewSchema);

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          text: assistantMessage,
          fieldCount: finalFields.length,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: "error", text: msg },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, apiKey, model, fields, rawSchema, messages, onImport]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel__header">
        <span className="chat-panel__header-title">✦ AI</span>
        {!showSetup && (
          <Select
            size="small"
            value={model}
            onChange={(_, d) => setModel(d.value)}
            className="chat-panel__model-select"
            disabled={modelsLoading}
          >
            {modelsLoading ? (
              <option value="">Loading models…</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))
            )}
          </Select>
        )}
        <div className="chat-panel__header-actions">
          {!showSetup && messages.length > 0 && (
            <Button
              appearance="subtle"
              size="small"
              title="Clear chat history"
              onClick={handleClearMessages}
            >
              🗑
            </Button>
          )}
          {!showSetup && (
            <Button
              appearance="subtle"
              size="small"
              title="Change API key"
              onClick={() => setShowSetup(true)}
            >
              🔑
            </Button>
          )}
          <Button
            appearance="subtle"
            size="small"
            onClick={onClose}
            title="Close AI panel"
          >
            ✕
          </Button>
        </div>
      </div>

      {showSetup ? (
        <>
          <KeySetup onSave={handleSaveKey} />
          {apiKey && (
            <div className="chat-panel__setup-footer">
              <Button
                appearance="subtle"
                size="small"
                onClick={() => setShowSetup(false)}
              >
                ← Back to chat
              </Button>
              <Button appearance="subtle" size="small" onClick={handleClearKey}>
                Clear key
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Messages */}
          <div className="chat-panel__messages">
            {messages.length === 0 && !loading && <EmptyState />}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && <ThinkingBubble />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-panel__input-area">
            <textarea
              ref={inputRef}
              className="chat-panel__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe changes… (Enter to send, Shift+Enter for newline)"
              rows={2}
              disabled={loading}
            />
            <Button
              appearance="primary"
              size="small"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="chat-panel__send-btn"
              icon={loading ? <Spinner size="tiny" /> : undefined}
            >
              {loading ? "" : "Send"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
