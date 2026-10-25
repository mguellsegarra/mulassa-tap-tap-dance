---
name: mulassacat-revisio-amb-marc
description: "Mulassa project only. How to run a review round with the project's owner: proposals to choose from, review pages they can annotate, prototypes in a worktree, short decisions, reverting what they reject, and reporting. Use whenever a design, model, song, dance or effect needs the owner's choice or approval."
---

# Review rounds with the owner

Apply only to Mulassa and its checkouts. The global CLAUDE/AGENTS instructions (approvals in chat, `resum` reports, `unslop` prose, `uipolish`) and the project's AGENTS.md (no messages between agents, one-server rules) still apply; this skill adds what the owner keeps asking for on this project.

## Proposals

- When a design is open (a button, a card, a banner, an icon, a model's head, a festa effect, a banknote), show **3–5 visibly different proposals** side by side, labelled with letters, in one HTML page or a preview the owner can open. They answer "the B, with…".
- Proposals use the game's real assets: render the real 3D models, the real note lane and buttons, the real palette. Generated images are for exploration only, and never for art that ends up in the game unless asked.
- Check each proposal yourself before showing it; leave out the ones you would reject.

## Review pages the owner can annotate

For anything with many items (screens, thumbnails, posts, a song's phrases, a dance's sections) build a small HTML page that shows each item with a stable code and lets the owner give feedback per item: a notes field, a mark (`refer`, `ok`), editable text, or drawing on a capture. It exports one block (JSON or text) to paste back. Examples already made: the UI inventory PDF with scene codes, the thumbnail review with `{mark, note}`, `tools/dev/bou-review.html` (what the figure does per section of the song), the shortened-versions page for a song, `tools/dev/notes.html` (point at a note in the score).

## Prototypes and integration

- Try open ideas in a separate worktree based on the main game worktree (uncommitted changes included when needed), behind a dev URL parameter when possible, with the previous version still reachable.
- Once approved, apply it to the main worktree; check nothing else was overwritten, then remove the prototype worktree when the owner agrees.
- If the owner rejects a change, undo it completely; do not keep patching the rejected idea. Restore the earlier version they liked when they say so.
- What the owner approved stays as it is in later work.

## Decisions and reports

- Collect decisions with short AskUserQuestion prompts, each with the context needed to answer and a recommended option. The owner does not want long reports ("no vull llegir un totxo") and usually reads only the question.
- Before asking, check the conversation for anything they already decided or asked that is still pending; they often ask "what is left?".
- When work is meant for another agent, hand over a self-contained prompt in Markdown with full paths to the worktree, files, captures and research, ready to paste.
- Report where the change lives (which worktree, which port), with a clickable phone link (see `mulassacat-validacio-visual`).

## Wording

- Catalan for anything the owner reads; plain words, first person singular.
- No names, dates or tool names as the source of a rule in repo text; state the rule plainly.
- Loader jokes, chants and social copy are curated by the owner line by line: offer several, keep their exact wording once chosen, and keep community contributions as sent.
