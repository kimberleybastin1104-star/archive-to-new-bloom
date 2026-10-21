<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
# Project rules
- The diary is one client-only component (src/components/GymDiary.tsx) rendered by "/" and a catch-all route; it picks the section from the URL. Why: faithful port of the original single-file app.
- Diary data is saved in the browser (localStorage key gym-diary-planner-v1) and the app renders client-only. Why: original "saved on this device" design and avoids SSR mismatches.
- CycleInsights is a focused child of the diary; it sends only consented saved cycle records to a same-origin streaming AI route and keeps results ephemeral. Why: preserve device-only diary storage and minimize sensitive data sharing.
- AI helpers live under src/lib/ai and are imported only server-side; provider denials persist in a service-only access-state table. Why: protect secrets and prevent replaying denied requests across restarts.
