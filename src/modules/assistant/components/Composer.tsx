import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, IconButton } from "../../../shared/ui/Button";
import { Textarea } from "../../../shared/ui/Field";

export const QUICK_PROMPTS = [
  "Explain this screen",
  "Log a reading",
  "What does the evidence say about bone loss?",
] as const;

export interface ComposerProps {
  disabled: boolean;
  disabledHint: string;
  onSend: (text: string) => void;
}

/** Enter sends, Shift+Enter adds a new line. */
export function Composer({ disabled, disabledHint, onSend }: ComposerProps) {
  // Module 4: reviewed library questions prefill the composer; never auto-send.
  const [params] = useSearchParams();
  const [text, setText] = useState(() => params.get("question") ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = (value: string) => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-line px-5 py-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick prompts">
        {QUICK_PROMPTS.map((p) => (
          <Button key={p} size="sm" variant="secondary" disabled={disabled} onClick={() => send(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="assistant-composer" className="sr-only">
            Message the assistant
          </label>
          <Textarea
            ref={ref}
            id="assistant-composer"
            rows={2}
            value={text}
            placeholder={disabled ? disabledHint : "Type a message. Enter sends, Shift+Enter adds a line."}
            aria-describedby="assistant-composer-hint"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <IconButton type="submit" icon={Send} label="Send message" variant="secondary" disabled={disabled || !text.trim()} tooltipSide="top" />
      </div>
      <p id="assistant-composer-hint" className="text-xs text-ink-3">
        {disabled ? disabledHint : "Typed messages go through the same local model as speech."}
      </p>
    </form>
  );
}
