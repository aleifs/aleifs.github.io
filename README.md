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

css/style.css           All styling; design tokens at the top of the file
js/main.js              Theme toggle, mobile nav, active link, e-mail obfuscation
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
