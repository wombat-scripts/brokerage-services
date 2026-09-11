import { DeskShell } from "@/components/shell";

/** Source is chosen at request time (`DESK_API_BASE_URL` → HTTP, else fixtures). */
export const dynamic = "force-dynamic";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <DeskShell>{children}</DeskShell>;
}
