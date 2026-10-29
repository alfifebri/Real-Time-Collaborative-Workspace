import { describe, expect, it } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

const schema = getSchema([StarterKit, TaskList, TaskItem]);
const field = "default";

const content: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Launch brief" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Ship the collaborative workspace." }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Realtime gateway" }] }],
        },
      ],
    },
  ],
};

describe("Yjs document persistence", () => {
  it("round-trips ProseMirror JSON through a Y.Doc", () => {
    const ydoc = prosemirrorJSONToYDoc(schema, content, field);
    const restored = yDocToProsemirrorJSON(ydoc, field);
    expect(restored).toEqual(content);
    ydoc.destroy();
  });

  it("encodes a snapshot that hydrates a fresh document", () => {
    const source = prosemirrorJSONToYDoc(schema, content, field);
    const snapshot = Y.encodeStateAsUpdate(source);

    const hydrated = new Y.Doc();
    Y.applyUpdate(hydrated, snapshot);

    expect(yDocToProsemirrorJSON(hydrated, field)).toEqual(content);
    source.destroy();
    hydrated.destroy();
  });

  it("applies a snapshot twice idempotently", () => {
    const source = prosemirrorJSONToYDoc(schema, content, field);
    const snapshot = Y.encodeStateAsUpdate(source);
    const hydrated = new Y.Doc();

    Y.applyUpdate(hydrated, snapshot);
    const once = Y.encodeStateAsUpdate(hydrated);
    Y.applyUpdate(hydrated, snapshot);
    const twice = Y.encodeStateAsUpdate(hydrated);

    expect(Buffer.from(twice)).toEqual(Buffer.from(once));
    source.destroy();
    hydrated.destroy();
  });

  it("merges concurrent text edits without losing either side", () => {
    const left = new Y.Doc();
    const right = new Y.Doc();
    const leftText = left.getText("shared");
    const rightText = right.getText("shared");

    leftText.insert(0, "hello ");
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left));
    rightText.insert(6, "world");
    Y.applyUpdate(left, Y.encodeStateAsUpdate(right));

    expect(leftText.toString()).toBe("hello world");
    expect(rightText.toString()).toBe("hello world");
    left.destroy();
    right.destroy();
  });
});
