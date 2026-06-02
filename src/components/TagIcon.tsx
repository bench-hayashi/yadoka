import * as LucideIcons from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

function toPascalCase(s: string): string {
  return s.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

type Props = LucideProps & {
  iconName?: string | null;
};

export default function TagIcon({ iconName, size = 16, ...rest }: Props) {
  const key = iconName ? toPascalCase(iconName) : null;
  const Icon: LucideIcon =
    key && key in LucideIcons
      ? (LucideIcons as unknown as Record<string, LucideIcon>)[key]
      : LucideIcons.Tag;

  return <Icon size={size} {...rest} />;
}
