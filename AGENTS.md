<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep parameter definitions, schema validation/token assembly and React controls in separate browser-safe modules; use catalog IDs and never send parameter-generator inputs to AI or execute them.
- Keep general chat on ai-text-stream.server (Claude via AI Gateway, GPT gateway fallback on 429/5xx); PENTEST selects this Claude path or direct OpenAI via pentest-ai.server with OPENAI_API_KEY read only in the authenticated route, so explicit GPT calls never consume Lovable credits or switch providers on failure.
- Keep conversation messages in React session state only; persist nothing unless the user explicitly saves it, because the app has no account and no history feature.
- Signed-in users reach their saved scripts through owner-scoped RLS on the table; anonymous visitors cannot save or read scripts because a browser session id cannot prove ownership, so no visitor can read another's data.
- Compose chat with installed AI Elements and keep visual tokens in the global stylesheet for consistency.
- Script mode uses the existing streaming endpoint; only completed shebang-prefixed Bash blocks become client-generated downloads, never automatic local execution.
- Render the empty welcome outside the auto-scrolling conversation; reserve stick-to-bottom behavior for actual messages so mobile entry starts at the top.
- Use the shared controlled confirmation dialog for irreversible actions; keep it open during deletion and on failure to prevent duplicate requests and preserve retry context.
- Reuse CommandWorkspace across the main and dynamic tool routes, with catalog-validated tool IDs sent separately to the streaming endpoint; visible tool markers must not be the authority for AI scope.
- Keep catalog ranks, controls, examples and shell/GUI/console kinds in the shared tool catalog so tool details and navigation use one content source.
- Expose only static catalog reads through SDK-generated MCP routes, protected by Supabase OAuth (consent page at /.lovable/oauth/consent) so only signed-in app users connect agents; use a JSON projection shared with page-local WebMCP reads to exclude icons, sessions, saved scripts and model calls.
- Saved-script templates live as comment metadata inside the script (`# kalicmd-template: v1` header) and only standalone `NAME={{NAME}}` lines are replaced with validated, POSIX-quoted values; this avoids a DB migration and keeps legacy rows working, and templates are never executed.
- /pentest uses its own prompt (pentest-prompt.ts) and sign-in-required /api/pentest; the server validates confirmed authorization, scope and per-phase gates before any AI call, and Markdown/JSON export is a pure client-side function with no DB writes, so the generic generator stays untouched.
- PENTEST templates reuse owner-protected saved scripts with encoded scenario comment metadata; lab exports rebuild a fixed bounded Nmap TCP check from validated metadata, keep all AI commands as comments, and require renewed authorization plus a single private IPv4 target.
