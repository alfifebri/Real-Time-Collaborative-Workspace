import { cn, initials } from "@/lib/utils";

type AvatarProps = {
  name: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  status?: boolean;
  ring?: boolean;
};

const sizes = {
  xs: "h-5 w-5 text-[7px]",
  sm: "h-6 w-6 text-[8px]",
  md: "h-8 w-8 text-[10px]",
  lg: "h-10 w-10 text-xs",
};

export function Avatar({
  name,
  color,
  size = "md",
  className,
  status = false,
  ring = false,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#0b0d10]",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: color,
        boxShadow: ring
          ? `0 0 0 2px rgb(var(--canvas)), 0 0 0 3px ${color}55`
          : `0 0 0 1px ${color}22`,
      }}
      title={name}
    >
      {initials(name)}
      {status && (
        <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-2 border-canvas bg-neon-emerald" />
      )}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: { id: string; name: string; color: string }[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user) => (
        <Avatar
          key={user.id}
          name={user.name}
          color={user.color}
          size={size}
          className="ring-2 ring-canvas"
        />
      ))}
      {overflow > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface-raised text-[9px] font-semibold text-ink-muted ring-2 ring-canvas">
          +{overflow}
        </span>
      )}
    </div>
  );
}
