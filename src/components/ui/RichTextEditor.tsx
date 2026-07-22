import { memo, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TOOLBAR_MODULES = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "clean"],
] as const;

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * RichTextEditor — React 19 compatible Quill editor instance.
 * Supports bold, italic, underline, strike, bullet dots, numbered lists, alignment, and links.
 */
function RichTextEditorComponent({
  value,
  onChange,
  placeholder = "Write description here...",
  className = "",
}: RichTextEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const quill = new Quill(host, {
      theme: "snow",
      placeholder,
      modules: { toolbar: TOOLBAR_MODULES as unknown },
    });

    if (value && value.trim()) {
      const delta = quill.clipboard.convert({ html: value });
      quill.setContents(delta, Quill.sources.SILENT);
    }

    const onTextChange = () => {
      const html = quill.root.innerHTML;
      const cleaned = html === "<p><br></p>" ? "" : html;
      onChangeRef.current(cleaned);
    };

    quill.on(Quill.events.TEXT_CHANGE, onTextChange);

    return () => {
      quill.off(Quill.events.TEXT_CHANGE, onTextChange);
      const toolbar = host.previousElementSibling;
      if (toolbar?.classList.contains("ql-toolbar")) {
        toolbar.remove();
      }
      host.innerHTML = "";
      host.classList.remove("ql-container", "ql-snow", "ql-disabled");
    };
    // Intentionally run once on mount per instance key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`rich-text-editor-container ${className}`}>
      <div ref={hostRef} />
    </div>
  );
}

export const RichTextEditor = memo(RichTextEditorComponent);
