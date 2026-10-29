import { Node, mergeAttributes } from "@tiptap/core";

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-tone") ?? "note",
        renderHTML: (attributes) => ({ "data-tone": attributes.tone }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "true",
        class: "callout",
      }),
      0,
    ];
  },
});
