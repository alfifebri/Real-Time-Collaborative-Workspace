"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Quote,
  Table2,
  Type,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SlashCommandRange = Range;

export type SlashItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  group: "Basic blocks" | "Advanced";
  command: (props: { editor: Editor; range: SlashCommandRange }) => void;
};

type SlashMenuProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

export type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    setSelected(0);
  }, [items]);

  const select = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        setSelected((current) => (current + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((current) => (current + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        select(selectedRef.current);
        return true;
      }
      return false;
    },
  }));

  const groups: SlashItem["group"][] = ["Basic blocks", "Advanced"];

  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-line-bright bg-surface/95 shadow-panel backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Insert block
        </span>
        <span className="flex items-center gap-1 text-[9px] text-ink-faint">
          <kbd className="rounded border border-line bg-tint-3 px-1 py-0.5 font-mono">↑↓</kbd>
          to navigate
        </span>
      </div>
      <div className="max-h-[340px] overflow-y-auto p-1.5">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group} className="mb-1">
              <p className="px-2 pb-1 pt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {group}
              </p>
              {groupItems.map((item) => {
                const index = items.indexOf(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => select(index)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                      selected === index
                        ? "bg-tint-4 text-ink"
                        : "text-ink-muted hover:bg-tint-3",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                        selected === index
                          ? "border-neon-emerald/20 bg-neon-emerald/[0.06] text-neon-emerald"
                          : "border-line bg-tint-2 text-ink-muted",
                      )}
                    >
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-medium">{item.title}</span>
                      <span className="block truncate text-[9px] text-ink-faint">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="border-t border-line bg-tint-1 px-3 py-1.5 text-[9px] text-ink-faint">
        Type <span className="text-ink-muted">/</span> at the start of a line
      </div>
    </div>
  );
});

export function createSlashCommand(options: {
  onRequestImage: (range: SlashCommandRange) => void;
}) {
  const items: SlashItem[] = [
    {
      title: "Text",
      description: "Plain paragraph block",
      icon: Type,
      keywords: ["paragraph", "text", "p"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      title: "Heading 1",
      description: "Large section title",
      icon: Heading1,
      keywords: ["h1", "title", "heading"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium section title",
      icon: Heading2,
      keywords: ["h2", "subtitle", "heading"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section title",
      icon: Heading3,
      keywords: ["h3", "heading"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      title: "Bulleted list",
      description: "Simple unordered list",
      icon: List,
      keywords: ["ul", "bullet", "list"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered list",
      description: "Ordered sequence of steps",
      icon: ListOrdered,
      keywords: ["ol", "number", "ordered"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "To-do list",
      description: "Tasks with checkboxes",
      icon: CheckSquare,
      keywords: ["todo", "task", "checkbox"],
      group: "Basic blocks",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: "Code block",
      description: "Syntax-highlighted code",
      icon: Code2,
      keywords: ["code", "snippet", "pre"],
      group: "Advanced",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Callout",
      description: "Highlight an important note",
      icon: Megaphone,
      keywords: ["callout", "note", "info"],
      group: "Advanced",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "callout",
            attrs: { tone: "note" },
            content: [{ type: "paragraph" }],
          })
          .run(),
    },
    {
      title: "Quote",
      description: "Capture a quote or excerpt",
      icon: Quote,
      keywords: ["quote", "blockquote"],
      group: "Advanced",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Table",
      description: "Three by three table with header",
      icon: Table2,
      keywords: ["table", "grid", "columns"],
      group: "Advanced",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: "Image",
      description: "Embed an image by URL",
      icon: ImageIcon,
      keywords: ["image", "photo", "picture"],
      group: "Advanced",
      command: ({ range }) => {
        options.onRequestImage(range);
      },
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      icon: Minus,
      keywords: ["divider", "separator", "hr"],
      group: "Advanced",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];

  const suggestion: Omit<SuggestionOptions<SlashItem>, "editor"> = {
    char: "/",
    allowSpaces: false,
    startOfLine: false,
    items: ({ query }) => {
      const needle = query.toLowerCase().trim();
      if (!needle) return items;
      return items.filter((item) => {
        const haystack = `${item.title} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(needle);
      });
    },
    command: ({ editor, range, props }) => {
      props.command({ editor, range });
    },
    render: () => {
      let component: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null;
      let popup: Instance[] | null = null;
      let currentProps: SlashMenuProps;

      return {
        onStart: (props) => {
          currentProps = props as SlashMenuProps;
          component = new ReactRenderer(SlashMenu, {
            props: currentProps,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            theme: "cowork",
            offset: [0, 8],
            animation: false,
          });
        },
        onUpdate: (props) => {
          currentProps = props as SlashMenuProps;
          component?.updateProps(currentProps);
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props.event) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
          component = null;
          popup = null;
        },
      };
    },
  };

  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...suggestion,
        }),
      ];
    },
  });
}
