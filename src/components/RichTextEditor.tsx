"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
};

function ToolbarBtn({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-8 min-w-[32px] px-2 rounded-lg text-sm flex items-center justify-center transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-700 font-bold"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = "Describí tu producto...", maxLength }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Tiptap retorna "<p></p>" para contenido vacío — normalizar a ""
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-4 py-3 text-sm text-gray-700 leading-relaxed",
      },
    },
  });

  // Sincronizar valor externo (ej: al cargar un producto existente)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = current === "<p></p>" ? "" : current;
    if (normalized !== value) {
      editor.commands.setContent(value || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  // Medir el HTML completo — es lo que el servidor valida con description.length > 8000
  const rawHtml = editor.getHTML();
  const htmlLength = rawHtml === "<p></p>" ? 0 : rawHtml.length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado">
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista con viñetas">
          ≡
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          ①
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinear izquierda">
          ⬛▭▭
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrar">
          ▭⬛▭
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinear derecha">
          ▭▭⬛
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpiar formato">
          ✕
        </ToolbarBtn>

        {maxLength && (
          <span className={`ml-auto text-xs ${htmlLength > maxLength * 0.9 ? "text-orange-500" : "text-gray-400"}`}>
            {htmlLength}/{maxLength}
          </span>
        )}
      </div>

      {/* Área de texto */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
