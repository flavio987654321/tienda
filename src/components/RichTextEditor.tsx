"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Link2, Unlink, RemoveFormatting, Palette,
} from "lucide-react";
import { DESCRIPTION_TEXT_COLORS } from "@/lib/richTextColors";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
};

function ToolbarBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-8 min-w-[32px] px-2 rounded-lg text-sm flex items-center justify-center transition-colors ${
        disabled
          ? "text-gray-300 cursor-not-allowed"
          : active
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function ColorPickerButton({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = editor.getAttributes("textStyle").color as string | undefined;

  return (
    <div ref={ref} className="relative">
      <ToolbarBtn active={open || !!current} onClick={() => setOpen((o) => !o)} title="Color de texto">
        <span className="flex flex-col items-center leading-none">
          <Palette className="h-3.5 w-3.5" />
          <span className="w-4 h-[3px] rounded-full mt-0.5" style={{ background: current || "#9ca3af" }} />
        </span>
      </ToolbarBtn>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5 w-40">
          <div className="grid grid-cols-4 gap-1.5">
            {DESCRIPTION_TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(c.value).run();
                  setOpen(false);
                }}
                className={`w-7 h-7 rounded-full border-2 ${current === c.value ? "border-indigo-500" : "border-transparent"}`}
                style={{ background: c.value }}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setOpen(false); }}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 text-center py-1 rounded-lg hover:bg-gray-50"
          >
            Quitar color
          </button>
        </div>
      )}
    </div>
  );
}

function LinkButton({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const isActive = editor.isActive("link");
  const ref = useClickOutside(() => setOpen(false));

  function openPopover() {
    setUrl(editor.getAttributes("link").href || "");
    setOpen(true);
  }

  function applyLink() {
    const href = url.trim();
    if (!href) { editor.chain().focus().unsetLink().run(); }
    else {
      const withProtocol = /^([a-z][a-z0-9+.-]*:|\/)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: withProtocol }).run();
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <ToolbarBtn active={isActive || open} onClick={() => (open ? setOpen(false) : openPopover())} title="Insertar link">
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5 w-64">
          <input
            autoFocus
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") setOpen(false); }}
            placeholder="https://..."
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-1.5 mt-2">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
              className="flex-1 text-xs font-medium bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700">
              Aplicar
            </button>
            {isActive && (
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setOpen(false); }}
                title="Quitar link" className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50">
                <Unlink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = "Describí tu producto...", maxLength }: Props) {
  const editor = useEditor({
    extensions: [
      // gapcursor y trailingNode desactivados: trailingNode inserta automáticamente un
      // <p></p> después de una lista (para poder "salir" de ella y seguir escribiendo
      // texto normal debajo) y gapcursor permite ubicar el cursor ahí. Con una lista
      // recién creada y vacía, ese <p> extra terminaba siendo justo donde caía el click
      // y lo que se tipeaba, dejando todo el texto AFUERA del <ul>/<ol>. Este editor no
      // tiene imágenes ni otros bloques no editables donde estas dos extensiones sean
      // necesarias, así que se sacan en vez de convivir con el bug.
      //
      // link/underline desactivados en StarterKit porque los registramos aparte
      // abajo con nuestra propia config — StarterKit v3 ya los incluye, y tenerlos
      // dos veces tira un warning de "duplicate extension" y hace que gane una
      // config indeterminada. Así la nuestra (openOnClick:false, rel seguro) siempre gana.
      StarterKit.configure({ gapcursor: false, trailingNode: false, link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Tiptap retorna "<p></p>" para contenido vacío — normalizar a ""
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        // "product-rte" ya trae los estilos de ul/ol/li/strong/em/u/a que usa la
        // tienda al renderizar la descripción guardada — así el editor se ve igual
        // a como va a quedar publicado. Sin esto, el reset de Tailwind le saca el
        // list-style a los <ul>/<ol> y las viñetas/números no se ven al tipear.
        class: "product-rte max-w-none focus:outline-none min-h-[80px] px-4 py-3 text-sm text-gray-700 leading-relaxed",
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
        <ToolbarBtn disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <Undo2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <Redo2 className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          <BoldIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          <ItalicIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ColorPickerButton editor={editor} />

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista con viñetas">
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinear izquierda">
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrar">
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinear derecha">
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificar">
          <AlignJustify className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <LinkButton editor={editor} />

        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpiar formato">
          <RemoveFormatting className="h-4 w-4" />
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
