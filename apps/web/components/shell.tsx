import Link from "next/link";
import { isDeskApiConfigured } from "@/lib/data";
import { DeskNav } from "./nav";

export function DeskShell({ children }: { children: React.ReactNode }) {
  const usingApi = isDeskApiConfigured();

  return (
    <div className="desk-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="desk-header">
        <Link className="brand" href="/">
          <span className="brand-kicker">Wombat Home Loans</span>
          <span className="brand-name">Wombat Desk</span>
        </Link>
        <DeskNav />
        <div className="who">
          <strong>Signed in as Tom</strong>
          Tom-only stub. No client magic links.
        </div>
      </header>
      <div className="banner">
        {usingApi
          ? "Desk API. Live NAB and CoreLogic portals are off. Saving Yes is a flag for Tom, not advice."
          : "Fixture book. Live NAB and CoreLogic portals are off. Saving Yes is a flag for Tom, not advice."}
      </div>
      <main id="main">{children}</main>
      <footer className="desk-footer">
        Phase A ops console.{" "}
        {usingApi ? (
          <>
            Reading <code>GET /v1/firms/:firmId</code> from <code>DESK_API_BASE_URL</code>. Still
            not live NAB.
          </>
        ) : (
          <>
            Data is fixtures shaped like <code>@wombat/contracts</code>.
          </>
        )}{" "}
        Future host: desk.wombathomeloans.com.au.
      </footer>
    </div>
  );
}
