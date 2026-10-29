import {
  BarChart3,
  BookOpen,
  Box,
  Brain,
  Calendar,
  CalendarDays,
  CircleDot,
  Code2,
  Command,
  Compass,
  Component,
  Diamond,
  FilePlus2,
  FileText,
  Flame,
  Frame,
  Grid2X2,
  Hexagon,
  Layers,
  LayoutGrid,
  Lightbulb,
  Map,
  Palette,
  PenLine,
  Pin,
  Puzzle,
  Ship,
  Sprout,
  Target,
  Telescope,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "bar-chart": BarChart3,
  "bar-chart-3": BarChart3,
  "book-open": BookOpen,
  box: Box,
  brain: Brain,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  "circle-dot": CircleDot,
  code: Code2,
  command: Command,
  compass: Compass,
  component: Component,
  diamond: Diamond,
  file: FileText,
  "file-plus": FilePlus2,
  "file-text": FileText,
  flame: Flame,
  frame: Frame,
  "grid-2x2": Grid2X2,
  hexagon: Hexagon,
  layers: Layers,
  "layout-grid": LayoutGrid,
  lightbulb: Lightbulb,
  map: Map,
  palette: Palette,
  "pen-line": PenLine,
  pin: Pin,
  puzzle: Puzzle,
  ship: Ship,
  sprout: Sprout,
  target: Target,
  telescope: Telescope,
  zap: Zap,
};

const LEGACY_ICONS: Record<string, string> = {
  "⌘": "command",
  "✦": "layers",
  "◇": "diamond",
  "◈": "component",
  "◎": "circle-dot",
  "✺": "hexagon",
  "❖": "box",
  "⬡": "hexagon",
  "✷": "frame",
  "📄": "file-text",
  "🚀": "compass",
  "🗺": "map",
  "🗺️": "map",
  "🎨": "palette",
  "🗓": "calendar",
  "🗓️": "calendar",
  "✍": "pen-line",
  "✍️": "pen-line",
  "🚢": "ship",
  "🧩": "puzzle",
  "💡": "lightbulb",
  "🔥": "flame",
  "📌": "pin",
  "🌱": "sprout",
  "⚡": "zap",
  "🧠": "brain",
  "🔭": "telescope",
  "📊": "bar-chart-3",
  "🪞": "frame",
};

export function resolveIconName(name: string | null | undefined): string {
  if (!name) return "file-text";
  return LEGACY_ICONS[name] ?? name;
}

export function IconGlyph({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = ICONS[resolveIconName(name)] ?? FileText;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  );
}
