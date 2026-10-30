"""Build the two-file Gallery skill ZIP and the complete source upload ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SKILL_FILES = (
    "skills/read-and-explain/SKILL.md",
    "skills/read-and-explain/scripts/index.html",
)
UPLOAD_FILES = (
    ".gitignore",
    ".nojekyll",
    "README.md",
    "package.json",
    "package-lock.json",
    "docs/UPLOAD-FILES.md",
    "docs/UPSTREAM-NOTES.md",
    "docs/LOCAL-TEST-RESULTS.md",
    "docs/HOSTING-STATUS.md",
    "docs/IOS-VALIDATION.md",
    *SKILL_FILES,
    "tests/browser.mjs",
    "tests/https-fixture.mjs",
    "tests/live.mjs",
    "tests/reader.test.mjs",
    "tools/package_skill.py",
)

for relative in UPLOAD_FILES:
    path = ROOT / relative
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Missing or unsupported upload file: {relative}")
if (ROOT / ".nojekyll").read_bytes() != b"":
    raise ValueError(".nojekyll must be an empty marker file")
if not (ROOT / SKILL_FILES[0]).read_text().startswith("---\nname: read-and-explain\n"):
    raise ValueError("Skill name/frontmatter does not match its folder")
if "window.ai_edge_gallery_get_result" not in (ROOT / SKILL_FILES[1]).read_text():
    raise ValueError("The Gallery bridge entry point is missing")

dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
skill_archive = dist / "read-and-explain.zip"
with ZipFile(skill_archive, "w", ZIP_DEFLATED) as output:
    for relative in SKILL_FILES:
        output.write(ROOT / relative, Path(relative).relative_to("skills"))

upload_archive = dist / "ai-edge-gallery-skills-upload.zip"
with ZipFile(upload_archive, "w", ZIP_DEFLATED) as output:
    for relative in UPLOAD_FILES:
        output.write(ROOT / relative, f"ai-edge-gallery-skills/{relative}")

(dist / "UPLOAD-FILES.txt").write_text("\n".join(UPLOAD_FILES) + "\n")
(dist / "SHA256SUMS").write_text("".join(
    f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n"
    for path in [skill_archive, upload_archive]
))
print(f"Created {skill_archive} (two-file Gallery payload)")
print(f"Created {upload_archive} ({len(UPLOAD_FILES)} source files)")
print("Extract the upload ZIP into a fresh folder; upload its contents to the repository root.")
print("Gallery URL after publishing: https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/")
print("Nothing was published or deployed.")
