# Files to upload

Use this source layout for `subashale/ai-edge-gallery-skills`. All 17 files are
included in `dist/ai-edge-gallery-skills-upload.zip` after `npm run package`.
Extract that ZIP into a fresh folder, then upload the contents of its
`ai-edge-gallery-skills/` folder to the GitHub repository root.

```text
.gitignore
.nojekyll
README.md
package.json
package-lock.json
docs/
  UPLOAD-FILES.md
  UPSTREAM-NOTES.md
  LOCAL-TEST-RESULTS.md
  HOSTING-STATUS.md
  IOS-VALIDATION.md
skills/
  read-and-explain/
    SKILL.md
    scripts/
      index.html
tests/
  browser.mjs
  https-fixture.mjs
  live.mjs
  reader.test.mjs
tools/
  package_skill.py
```

Keep `.nojekyll` empty and at the root. On macOS, Command+Shift+Period reveals
hidden files in Finder. If uploading through GitHub's web interface, select
only the files above; `.gitignore` does not filter a manual browser upload.

Leave `upstream/`, `node_modules/`, `test-results/`, `dist/`, `.DS_Store`,
`__pycache__/`, and `.git/` out of the upload. Curated test findings are already
in `docs/`; raw reports and the Google reference checkout remain local.

Configure Pages to publish **main → /(root)**. After deployment, Gallery's
**Load skill from URL** should receive:

`https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/`

Verify the two file URLs ending in `/SKILL.md` and `/scripts/index.html` before
re-adding the skill in Gallery. This differs from the older payload-only URL,
which did not include `/skills/`. The old root-level `read-and-explain/` folder
is not part of this new upload; update Gallery to the new URL rather than
continuing to use that older copy.

The folder itself can show a browser 404 when no homepage index exists. Gallery
needs the two actual skill files, not a rendered folder page. Successful Pages
hosting does not prove iOS retrieval or speech compatibility.
