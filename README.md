# Google AI Edge Gallery skills

## Read and explain

The `read-and-explain` Gallery Agent Skill reads one public HTTPS webpage and
returns a compact text excerpt with its source URL for Gallery's model to explain.
It uses no API key, paid search API, proxy, or cloud LLM.

Enable GitHub Pages for this repository using the main branch and root folder.
In Gallery's **Load skill from URL**, enter your published folder URL:

`https://YOUR-USERNAME.github.io/ai-edge-gallery-skills/read-and-explain/`

Replace YOUR-USERNAME with your GitHub username. Keep `.nojekyll` at this
repository's root so `read-and-explain/SKILL.md` remains raw Markdown.
The hidden runner is `read-and-explain/scripts/index.html`.

Try: `Read and explain https://httpbin.org/html in two sentences.`

Many webpages block cross-origin retrieval. Failures must be reported instead
of inventing page content. Local desktop tests passed; successful Gallery iOS
execution, model behavior, microphone input, and read-aloud are still unverified.
