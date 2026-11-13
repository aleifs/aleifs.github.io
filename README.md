# aleisantos.com

Personal academic website of **Alei Fernandes Santos** — Assistant Professor at the
São Paulo School of Business Administration (FGV-EAESP).

Plain HTML, CSS and JavaScript. **No build step and no dependencies**: what is in the
repository is exactly what is served. Published with GitHub Pages from the `master`
branch, at the custom domain in `CNAME`.

## Structure

```
index.html              Home / about
publications/           Research — published, working papers, work in progress
teaching/               Courses taught
talks/                  Conference presentations, seminars, panels
cv/                     Curriculum vitae (summary + link to the PDF)
contact/                Contact details
404.html                Not-found page
private/                Password-protected files (unlinked; see "Private files" below)

css/style.css           All styling; design tokens at the top of the file
js/main.js              Theme toggle, mobile nav, active link, e-mail obfuscation
js/private.js           Decrypts the private files in the browser
tools/publish_private.py  Encrypts the private files and commits them
files/                  PDFs (papers, CV)
images/                 Profile photo
favicon.svg             Monogram favicon (+ favicon-32.png, apple-touch-icon.png)
.nojekyll               Tells GitHub Pages to serve the files as-is
```

## Editing

Everything is hand-edited HTML — open the relevant file and change the markup.

- **Add a paper** — copy an existing `<li class="pub">` block in
  [`publications/index.html`](publications/index.html) into the right section and edit
  it. `<span class="tag">` is the label (Published / Working paper / In progress); the
  optional `<details class="abstract">` block holds the abstract. Put the PDF in
  `files/` and point the `.link-btn` at it.
- **Add a talk** — copy an `<li class="talk">` block in
  [`talks/index.html`](talks/index.html); the list is newest first.
- **Add a course** — copy an `<li>` in the relevant `<ul class="course-list">` in
  [`teaching/index.html`](teaching/index.html).
- **Change colours or spacing** — edit the custom properties in the `:root` and
  `:root[data-theme="dark"]` blocks at the top of `css/style.css`. Both themes must be
  updated together.
- **The header and footer are duplicated in every page.** If you change the navigation,
  change it in all seven HTML files.

## Private files

`aleisantos.com/private/` lists documents meant only for Alei (presentations and
others) behind a password. The page is not in the menu or the sitemap and carries
`noindex`.

GitHub Pages has no server, so the files are encrypted before they enter the
repository and decrypted in the browser after the password is typed (PBKDF2-SHA256
with 600,000 iterations, AES-256-GCM). File names, folders and dates are encrypted
too, and every commit carries the same message.

The originals live in the Drive folder `gdrive_work:Site privado`, mounted on the
server at `~/Cloud/Site privado` (unit `cloud-mount@site-privado`). Subfolders become
headings on the page. To publish, from any folder:

```bash
update-private --dry-run   # what would change
update-private             # encrypt, commit private/vault.json and private/blobs/, push
```

`update-private` is `tools/update-private`, linked from `~/.local/bin`. It runs
`tools/publish_private.py` and pushes only when that run made a new commit.

The script asks for the password every time and never stores it. The first run sets
it (at least 16 characters). It adds new and changed files, drops the ones removed
from the folder, and refuses to run when the mount is down or the folder is empty.

- **The repository is public.** Anyone can copy the encrypted files and try passwords
  offline, so the password must be long. A passphrase of four or five random words is
  enough.
- **Removed files stay in the git history**, encrypted. So does every old version of
  a file.
- **Size.** Files above 95 MB are skipped (GitHub refuses 100 MB). Pages caps the
  whole site at 1 GB, and every version counts.
- **Changing the password** means deleting `private/vault.json` and running the
  script again: it asks for a new password, re-encrypts every file and removes the old
  blobs. The old ciphertexts stay in the history under the old password.
- `tools/publish_private.py` and `js/private.js` share the format and change together.

## Preview locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

A plain file:// open also mostly works, but the root-relative paths (`/css/style.css`)
need a server.

## History

The site previously used Jekyll (a fork of
[academicpages](https://github.com/academicpages/academicpages.github.io) /
minimal-mistakes). That version is preserved on the **`jekyll-backup`** branch.

## License

Site content © Alei Fernandes Santos. The original template's MIT license is retained
in [LICENSE](LICENSE).
