export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  {
    email: "ava@collabspace.dev",
    name: "Ava Chen",
    title: "Lead Product Designer",
    color: "#22D3EE",
    role: "Owner",
  },
  {
    email: "marcus@collabspace.dev",
    name: "Marcus Reed",
    title: "Staff Engineer",
    color: "#FB7185",
    role: "Admin",
  },
  {
    email: "priya@collabspace.dev",
    name: "Priya Nair",
    title: "Product Manager",
    color: "#A78BFA",
    role: "Editor",
  },
  {
    email: "noah@collabspace.dev",
    name: "Noah Williams",
    title: "Design Engineer",
    color: "#34D399",
    role: "Editor",
  },
  {
    email: "sam@collabspace.dev",
    name: "Sam Ortiz",
    title: "Research Partner",
    color: "#FBBF24",
    role: "Viewer",
  },
] as const;

export const CURSOR_COLORS = [
  "#22D3EE",
  "#FB7185",
  "#A78BFA",
  "#34D399",
  "#FBBF24",
  "#60A5FA",
] as const;

export const DOC_ICONS = [
  "file-text",
  "compass",
  "map",
  "palette",
  "calendar",
  "pen-line",
  "ship",
  "puzzle",
  "lightbulb",
  "flame",
  "pin",
  "sprout",
  "zap",
  "brain",
  "telescope",
  "bar-chart-3",
] as const;

export const WORKSPACE_ICONS = [
  "layers",
  "diamond",
  "component",
  "circle-dot",
  "hexagon",
  "box",
  "frame",
  "grid-2x2",
] as const;

export const SLASH_GROUPS = [
  { label: "Basic blocks", keys: ["text", "heading1", "heading2", "heading3", "bullet", "numbered", "todo"] },
  { label: "Advanced", keys: ["code", "callout", "quote", "table", "image", "divider"] },
] as const;
