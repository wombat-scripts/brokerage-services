import { deskGatePassword } from "@/lib/auth";
import { signIn } from "./actions";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const gated = deskGatePassword() !== undefined;

  return (
    <div className="login-wrap">
      <form className="login-card" action={signIn}>
        <div className="brand-kicker">Wombat Home Loans</div>
        <h1>Wombat Desk</h1>
        <p>
          Tom-only gate. No client magic links.{" "}
          {gated
            ? "Enter the desk password from DESK_GATE_PASSWORD."
            : "No desk password is set, so the gate is open."}
        </p>
        {error === "bad_password" ? <p className="error">That password did not match.</p> : null}
        <input type="hidden" name="next" value={next ?? "/"} />
        {gated ? (
          <>
            <label htmlFor="password">Desk password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </>
        ) : null}
        <button type="submit">Open desk as Tom</button>
      </form>
    </div>
  );
}
