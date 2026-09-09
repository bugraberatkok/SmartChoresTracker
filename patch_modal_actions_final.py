from pathlib import Path

ROOT = Path(__file__).resolve().parent
if not (ROOT / "frontend" / "src").exists():
    ROOT = Path.cwd()

CSS = ROOT / "frontend" / "src" / "App.css"

if not CSS.exists():
    raise FileNotFoundError(f"Could not find {CSS}")

text = CSS.read_text(encoding="utf-8")

marker = "/* === Final modal action normalization === */"

patch = r"""
/* === Final modal action normalization === */

/*
 * All two-action modals use the same footer geometry:
 * equal width, equal height, no wrapping.
 */
.title-modal-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 0.85rem;
  width: 100%;
  margin-top: 1.5rem;
}

.title-modal-actions .member-secondary-action,
.title-modal-actions .submit-button {
  width: 100%;
  min-width: 0;
  height: 56px;
  min-height: 56px;
  padding: 0 1rem;
  border-radius: 13px;
  white-space: nowrap;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Override the older primary-button min-width rule. */
.title-modal-actions .submit-button {
  min-width: 0;
}

/* Slightly smaller text only where long management labels need it. */
.title-modal-actions .submit-button {
  font-size: 0.98rem;
}

@media (max-width: 520px) {
  .title-modal-actions {
    grid-template-columns: 1fr;
  }

  .title-modal-actions .member-secondary-action,
  .title-modal-actions .submit-button {
    width: 100%;
  }
}
"""

if marker in text:
    print("Final modal action patch already exists; nothing changed.")
else:
    CSS.write_text(text.rstrip() + "\n\n" + patch.strip() + "\n", encoding="utf-8")
    print("✓ App.css updated")
    print("✓ Modal buttons normalized")
