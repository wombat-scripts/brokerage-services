import Link from "next/link";
import { DeskNav } from "./nav";

export function DeskShell({ children }: { children: React.ReactNode }) {
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
        Fixture book. Live NAB and CoreLogic portals are off. Saving Yes is a flag for Tom, not
        advice.
      </div>
      <main id="main">{children}</main>
      <footer className="desk-footer">
        Phase A ops console. Data is fixtures shaped like{" "}
        <code>@wombat/contracts</code>. Future host: desk.wombathomeloans.com.au.
      </footer>
    </div>
  );
}
