import { type ReactNode, useEffect, useId, useRef, useState } from "react";

type FieldHelpProps = {
  label: string;
  children: ReactNode;
};

export function FieldHelp({ label, children }: FieldHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen]);

  return (
    <span className="field-help-control" ref={containerRef}>
      <button
        aria-controls={popoverId}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-label={`${label}の説明`}
        className="field-help-button"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        ?
      </button>
      <span className="field-help-popover" hidden={!isOpen} id={popoverId} role="note">
        {children}
      </span>
    </span>
  );
}
