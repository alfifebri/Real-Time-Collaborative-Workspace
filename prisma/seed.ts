import "dotenv/config";
import { PrismaClient, Role, VersionKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { prosemirrorJSONToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import type { JSONContent } from "@tiptap/core";

const prisma = new PrismaClient();

const schema = getSchema([
  StarterKit,
  TaskList,
  TaskItem,
  Table,
  TableRow,
  TableHeader,
  TableCell,
]);

function encodeDoc(json: JSONContent): Uint8Array<ArrayBuffer> {
  const ydoc = prosemirrorJSONToYDoc(schema, json, "default");
  const update = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  const bytes = new Uint8Array(update.byteLength);
  bytes.set(update);
  return bytes;
}

const text = (value: string, marks: JSONContent["marks"] = []): JSONContent => ({
  type: "text",
  text: value,
  ...(marks?.length ? { marks } : {}),
});

const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  ...(content.length ? { content } : {}),
});

const heading = (level: number, value: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

const bullet = (...items: JSONContent[][]): JSONContent => ({
  type: "bulletList",
  content: items.map((content) => ({ type: "listItem", content })),
});

const taskList = (
  items: { checked: boolean; label: string }[],
): JSONContent => ({
  type: "taskList",
  content: items.map((item) => ({
    type: "taskItem",
    attrs: { checked: item.checked },
    content: [paragraph(text(item.label))],
  })),
});

const cell = (value: string, header = false): JSONContent => ({
  type: header ? "tableHeader" : "tableCell",
  content: [paragraph(text(value))],
});

const table = (rows: string[][]): JSONContent => ({
  type: "table",
  content: rows.map((row, rowIndex) => ({
    type: "tableRow",
    content: row.map((value) => cell(value, rowIndex === 0)),
  })),
});

const gettingStarted: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Welcome to CoWork Studio"),
    paragraph(
      text("A calmer place for "),
      text("ideas", [{ type: "bold" }]),
      text(", decisions, and the people who make them happen. Everything here is "),
      text("live", [{ type: "italic" }]),
      text(" — open this page with a teammate and watch the cursors move."),
    ),
    {
      type: "blockquote",
      content: [
        paragraph(
          text("Tip: "),
          text("Press", [{ type: "code" }]),
          text(" / "),
          text("anywhere in the editor to open the block menu. Type "),
          text("@", [{ type: "code" }]),
          text(" to mention someone."),
        ),
      ],
    },
    heading(2, "The three rituals that keep us fast"),
    bullet(
      [
        paragraph(
          text("Async first. ", [{ type: "bold" }]),
          text("Write the context before the meeting. Docs are the source of truth."),
        ),
      ],
      [
        paragraph(
          text("Ship small. ", [{ type: "bold" }]),
          text("A draft in motion beats a perfect plan in a doc."),
        ),
      ],
      [
        paragraph(
          text("Close the loop. ", [{ type: "bold" }]),
          text("Every decision gets an owner, a date, and a link."),
        ),
      ],
    ),
    heading(2, "This week"),
    taskList([
      { checked: true, label: "Polish the multi-cursor presence experience" },
      { checked: true, label: "Publish the v2 design tokens" },
      { checked: false, label: "Review the commenting model with Priya" },
      { checked: false, label: "Cut the release candidate for Friday" },
    ]),
    heading(2, "Team signals"),
    table([
      ["Metric", "Now", "Target"],
      ["Median sync latency", "38 ms", "< 50 ms"],
      ["Weekly active editors", "412", "600"],
      ["Docs with comments", "68%", "75%"],
    ]),
    paragraph(
      text("Looking for the shortcuts? Open "),
      text("Keyboard shortcuts", [{ type: "bold" }]),
      text(" from the sidebar."),
    ),
  ],
};

const shortcuts: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Keyboard shortcuts"),
    paragraph(text("Fast hands, calm mind. These are the moves worth memorizing.")),
    heading(2, "Workspace"),
    table([
      ["Action", "Shortcut"],
      ["Quick search", "⌘ K"],
      ["New page", "⌘ ⇧ N"],
      ["Toggle sidebar", "⌘ \\"],
      ["Save version", "⌘ ⇧ S"],
    ]),
    heading(2, "Editor"),
    table([
      ["Action", "Shortcut"],
      ["Slash menu", "/"],
      ["Bold", "⌘ B"],
      ["Inline code", "⌘ E"],
      ["Undo", "⌘ Z"],
    ]),
  ],
};

const roadmap: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Product roadmap · Q4"),
    paragraph(
      text("Our bet for the quarter: make collaboration feel "),
      text("effortless", [{ type: "bold" }]),
      text(" at the exact moment teams need it. Fewer meetings, more momentum."),
    ),
    heading(2, "Now"),
    bullet(
      [paragraph(text("Presence v2 — live cursors, selections, and soft follows"))],
      [paragraph(text("Comment threads with anchor stability under concurrent edits"))],
      [paragraph(text("Version snapshots with a readable diff preview"))],
    ),
    heading(2, "Next"),
    bullet(
      [paragraph(text("Workspace-level permissions and audit trails"))],
      [paragraph(text("Redis-backed horizontal scaling for the sync gateway"))],
    ),
    heading(2, "Decision log"),
    table([
      ["Date", "Decision", "Owner"],
      ["Oct 21", "CRDT-first architecture, offline by default", "Marcus"],
      ["Oct 18", "Dark canvas as the default surface", "Ava"],
      ["Oct 12", "Commenters can reply but not edit body copy", "Priya"],
    ]),
  ],
};

const designSystem: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Design system"),
    paragraph(
      text("A small, opinionated system built for focus. Warm dark surfaces, crisp type, and color that only appears when it means something."),
    ),
    heading(2, "Foundations"),
    bullet(
      [paragraph(text("Canvas — #0D0F12"))],
      [paragraph(text("Surface — #151920"))],
      [paragraph(text("Hairline — #1F242D"))],
      [paragraph(text("Ink — #E8ECF3 / #8D97A8"))],
    ),
    heading(2, "Motion"),
    paragraph(
      text("Motion should explain, never perform. Use 160–240ms easing for surfaces, 320ms for overlays, and spring physics for cursors and drag interactions."),
    ),
    heading(2, "Voice"),
    {
      type: "blockquote",
      content: [
        paragraph(
          text("Clear over clever. Warm over cute. Specific over impressive."),
        ),
      ],
    },
  ],
};

const components: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Components"),
    paragraph(text("The building blocks of the studio surface.")),
    taskList([
      { checked: true, label: "Sidebar tree with nested pages" },
      { checked: true, label: "Presence avatar stack" },
      { checked: true, label: "Slash command palette" },
      { checked: false, label: "Comment density heatmap" },
    ]),
  ],
};

const weeklySync: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Weekly sync · Oct 24"),
    paragraph(text("Attendees: Ava, Marcus, Priya, Noah")),
    heading(2, "Highlights"),
    bullet(
      [paragraph(text("Realtime gateway is stable at p95 < 50ms in staging"))],
      [paragraph(text("Comment anchors now survive concurrent edits"))],
      [paragraph(text("New empty states shipped across the workspace"))],
    ),
    heading(2, "Open questions"),
    bullet(
      [paragraph(text("How do we surface comment activity without adding noise?"))],
      [paragraph(text("Should viewers be able to copy a shareable read-only link?"))],
    ),
    heading(2, "Actions"),
    taskList([
      { checked: false, label: "Marcus — benchmark 3-node Redis fanout" },
      { checked: false, label: "Ava — finalize cursor palette" },
      { checked: false, label: "Priya — interview 5 design partners" },
    ]),
  ],
};

const brandVoice: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Brand voice"),
    paragraph(text("How CoWork Studio sounds when no one is watching.")),
    bullet(
      [paragraph(text("Short sentences. Concrete nouns. Active verbs."))],
      [paragraph(text("No exclamation marks in product copy."))],
      [paragraph(text("Describe the work, not the magic."))],
    ),
  ],
};

const releaseNotes: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Release notes · v1.4"),
    heading(2, "New"),
    bullet(
      [paragraph(text("Multiplayer cursors with name tags and smooth interpolation"))],
      [paragraph(text("Inline comment threads with resolve and reply"))],
      [paragraph(text("Version history with restore preview"))],
    ),
    heading(2, "Fixes"),
    bullet(
      [paragraph(text("Comment anchors no longer drift after edits"))],
      [paragraph(text("Safari selection rendering on collaborative tables"))],
    ),
  ],
};

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 11);

  const people = [
    {
      email: "ava@collabspace.dev",
      name: "Ava Chen",
      title: "Lead Product Designer",
      color: "#22D3EE",
    },
    {
      email: "marcus@collabspace.dev",
      name: "Marcus Reed",
      title: "Staff Engineer",
      color: "#FB7185",
    },
    {
      email: "priya@collabspace.dev",
      name: "Priya Nair",
      title: "Product Manager",
      color: "#A78BFA",
    },
    {
      email: "noah@collabspace.dev",
      name: "Noah Williams",
      title: "Design Engineer",
      color: "#34D399",
    },
    {
      email: "sam@collabspace.dev",
      name: "Sam Ortiz",
      title: "Research Partner",
      color: "#FBBF24",
    },
  ];

  const users = new Map<string, { id: string; name: string; color: string }>();
  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        title: person.title,
        color: person.color,
        passwordHash,
      },
      create: {
        email: person.email,
        name: person.name,
        title: person.title,
        color: person.color,
        passwordHash,
      },
    });
    users.set(person.email, { id: user.id, name: user.name, color: user.color });
  }

  const avatar = users.get("ava@collabspace.dev")!;
  const marcus = users.get("marcus@collabspace.dev")!;
  const priya = users.get("priya@collabspace.dev")!;
  const noah = users.get("noah@collabspace.dev")!;
  const sam = users.get("sam@collabspace.dev")!;

  await prisma.workspace.deleteMany({
    where: { slug: { in: ["product-studio", "design-guild"] } },
  });

  const studio = await prisma.workspace.create({
    data: {
      name: "Product Studio",
      slug: "product-studio",
      icon: "layers",
      accent: "#22D3EE",
      ownerId: avatar.id,
      members: {
        create: [
          { userId: avatar.id, role: Role.OWNER },
          { userId: marcus.id, role: Role.ADMIN },
          { userId: priya.id, role: Role.EDITOR },
          { userId: noah.id, role: Role.EDITOR },
          { userId: sam.id, role: Role.VIEWER },
        ],
      },
    },
  });

  const guild = await prisma.workspace.create({
    data: {
      name: "Design Guild",
      slug: "design-guild",
      icon: "diamond",
      accent: "#A78BFA",
      ownerId: avatar.id,
      members: {
        create: [
          { userId: avatar.id, role: Role.OWNER },
          { userId: marcus.id, role: Role.EDITOR },
          { userId: noah.id, role: Role.EDITOR },
        ],
      },
    },
  });

  const makeDocument = async (input: {
    workspaceId: string;
    title: string;
    icon: string;
    parentId?: string;
    position: number;
    favorite?: boolean;
    createdById: string;
    content: JSONContent;
  }) => {
    return prisma.document.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title,
        icon: input.icon,
        parentId: input.parentId ?? null,
        position: input.position,
        isFavorite: input.favorite ?? false,
        createdById: input.createdById,
        ydocState: encodeDoc(input.content),
      },
    });
  };

  const gettingStartedDoc = await makeDocument({
    workspaceId: studio.id,
    title: "Getting started",
    icon: "compass",
    position: 0,
    favorite: true,
    createdById: avatar.id,
    content: gettingStarted,
  });

  await makeDocument({
    workspaceId: studio.id,
    title: "Keyboard shortcuts",
    icon: "command",
    parentId: gettingStartedDoc.id,
    position: 0,
    createdById: marcus.id,
    content: shortcuts,
  });

  const roadmapDoc = await makeDocument({
    workspaceId: studio.id,
    title: "Product roadmap · Q4",
    icon: "map",
    position: 1,
    favorite: true,
    createdById: priya.id,
    content: roadmap,
  });

  const designDoc = await makeDocument({
    workspaceId: studio.id,
    title: "Design system",
    icon: "palette",
    position: 2,
    createdById: avatar.id,
    content: designSystem,
  });

  await makeDocument({
    workspaceId: studio.id,
    title: "Components",
    icon: "puzzle",
    parentId: designDoc.id,
    position: 0,
    createdById: noah.id,
    content: components,
  });

  const weeklyDoc = await makeDocument({
    workspaceId: studio.id,
    title: "Weekly sync · Oct 24",
    icon: "calendar",
    position: 3,
    createdById: priya.id,
    content: weeklySync,
  });

  await makeDocument({
    workspaceId: studio.id,
    title: "Brand voice",
    icon: "pen-line",
    position: 4,
    createdById: avatar.id,
    content: brandVoice,
  });

  await makeDocument({
    workspaceId: studio.id,
    title: "Release notes · v1.4",
    icon: "ship",
    position: 5,
    favorite: true,
    createdById: marcus.id,
    content: releaseNotes,
  });

  await makeDocument({
    workspaceId: guild.id,
    title: "Critique rituals",
    icon: "frame",
    position: 0,
    createdById: avatar.id,
    content: {
      type: "doc",
      content: [
        heading(1, "Critique rituals"),
        paragraph(
          text("How we give feedback that makes the work better — and the room calmer."),
        ),
        bullet(
          [paragraph(text("Start with the intent, not the pixels."))],
          [paragraph(text("Name what works before what doesn't."))],
          [paragraph(text("One concern per comment. Always."))],
        ),
      ],
    },
  });

  const comment = await prisma.comment.create({
    data: {
      documentId: gettingStartedDoc.id,
      authorId: priya.id,
      body: "Love the ritual framing. Could we add an owner column to the weekly signal table so it's obvious who unblocks what?",
      quote: "The three rituals that keep us fast",
      anchorFrom: 0,
      anchorTo: 34,
    },
  });

  await prisma.comment.create({
    data: {
      documentId: gettingStartedDoc.id,
      authorId: marcus.id,
      parentId: comment.id,
      body: "Agreed. I'll wire it into the Friday review template — no new doc needed.",
      quote: "The three rituals that keep us fast",
    },
  });

  await prisma.comment.create({
    data: {
      documentId: roadmapDoc.id,
      authorId: noah.id,
      body: "Presence v2 is looking razor sharp. The soft-follow animation is the detail that sells it.",
      quote: "Presence v2",
    },
  });

  await prisma.comment.create({
    data: {
      documentId: weeklyDoc.id,
      authorId: avatar.id,
      body: "Benchmark numbers are in the doc now. Closing this thread.",
      quote: "Realtime gateway is stable",
      resolved: true,
    },
  });

  await prisma.version.createMany({
    data: [
      {
        documentId: gettingStartedDoc.id,
        createdById: avatar.id,
        label: "Initial draft",
        kind: VersionKind.MANUAL,
        content: gettingStarted as object,
        ydocState: encodeDoc(gettingStarted),
      },
      {
        documentId: gettingStartedDoc.id,
        createdById: marcus.id,
        label: "Rituals + team signals",
        kind: VersionKind.AUTO,
        content: gettingStarted as object,
        ydocState: encodeDoc(gettingStarted),
      },
    ],
  });

  console.log("✓ Seeded CoWork Studio");
  console.log("  Workspace: /w/product-studio");
  console.log("  Demo login: ava@collabspace.dev / demo1234");
  console.log("  IDs:", { studio: studio.id, gettingStarted: gettingStartedDoc.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
