import { memo, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"],
] as const;

export interface BlogQuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

/**
 * Quill bound with a DOM ref — works on React 19 (react-quill uses removed findDOMNode).
 */
function BlogQuillEditorComponent({
  value,
  onChange,
  className,
}: BlogQuillEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const quill = new Quill(host, {
      theme: "snow",
      modules: { toolbar: TOOLBAR as unknown },
    });
    if (value.trim()) {
      const delta = quill.clipboard.convert({ html: value });
      quill.setContents(delta, Quill.sources.SILENT);
    }

    const onTextChange = () => {
      onChangeRef.current(quill.root.innerHTML);
    };
    quill.on(Quill.events.TEXT_CHANGE, onTextChange);

    return () => {
      quill.off(Quill.events.TEXT_CHANGE, onTextChange);
      // Snow theme inserts `.ql-toolbar` as previousElementSibling of the container.
      // Clearing innerHTML alone leaves the toolbar (StrictMode remount = duplicate bars).
      const toolbar = host.previousElementSibling;
      if (toolbar?.classList.contains("ql-toolbar")) {
        toolbar.remove();
      }
      host.innerHTML = "";
      host.classList.remove("ql-container", "ql-snow", "ql-disabled");
    };
    // Intentionally once per mount; parent uses `key` when loading a different post.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value only for initial HTML
  }, []);

  return <div ref={hostRef} className={className} />;
}

export const BlogQuillEditor = memo(BlogQuillEditorComponent);
