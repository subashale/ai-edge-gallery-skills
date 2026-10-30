"""Build the two-file Gallery skill ZIPs and the complete source upload ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("read-and-explain", "key-details-extractor")
SKILL_FILES = tuple(f"skills/{name}/{file}" for name in SKILLS
                    for file in ("SKILL.md", "scripts/index.html"))
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
for name in SKILLS:
    if not (ROOT / f"skills/{name}/SKILL.md").read_text().startswith(f"---\nname: {name}\n"):
        raise ValueError(f"Skill name/frontmatter does not match folder: {name}")
    if "window.ai_edge_gallery_get_result" not in (ROOT / f"skills/{name}/scripts/index.html").read_text():
        raise ValueError(f"Gallery bridge entry point missing: {name}")

dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
skill_archives = []
for name in SKILLS:
    archive = dist / f"{name}.zip"
    with ZipFile(archive, "w", ZIP_DEFLATED) as output:
        for relative in SKILL_FILES:
            if relative.startswith(f"skills/{name}/"):
                output.write(ROOT / relative, Path(relative).relative_to("skills"))
    skill_archives.append(archive)

upload_archive = dist / "ai-edge-gallery-skills-upload.zip"
with ZipFile(upload_archive, "w", ZIP_DEFLATED) as output:
    for relative in UPLOAD_FILES:
        output.write(ROOT / relative, f"ai-edge-gallery-skills/{relative}")

(dist / "UPLOAD-FILES.txt").write_text("\n".join(UPLOAD_FILES) + "\n")
(dist / "SHA256SUMS").write_text("".join(
    f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n"
    for path in [*skill_archives, upload_archive]
))
for archive in skill_archives:
    print(f"Created {archive} (two-file Gallery payload)")
print(f"Created {upload_archive} ({len(UPLOAD_FILES)} source files)")
print("Extract the upload ZIP into a fresh folder; upload its contents to the repository root.")
for name in SKILLS:
    print(f"Gallery URL after publishing: https://subashale.github.io/ai-edge-gallery-skills/skills/{name}/")
print("Nothing was published or deployed.")
