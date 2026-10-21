# Remembering Cynthia J. Smith: a scrapbook site

A page-turning scrapbook. Select any photo, quote, or memory and it lifts off the page to fill the screen with a longer description. It is plain HTML, CSS, and JavaScript: no libraries, no build step.

**How it stays easy to maintain.** The scrapbook's pages live in a **Google Sheet**. Visitors add to it through a **Google Form**, and every submission lands as a *draft* that only shows up on the site after an admin marks it **Approved**. Admins only need a Google account. Nobody needs GitHub or code after the first setup.

```
index.html   page structure
styles.css   the look (colors are the variables at the top)
script.js    page turning, opening items, reading the sheet
config.js    the few settings you fill in once, plus sample pages
```

## 1. Put it on GitHub Pages
1. Create a repo and upload these four files.
2. Repo **Settings → Pages → Build and deployment**: Source "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Your site appears at `https://<username>.github.io/<repo>/`.

To preview on your computer, just open `index.html`.

## 2. Set up the form and sheet (about 15 minutes)

### The form
Create a Google Form. **Keep the questions in this order**, because the sheet's columns follow it. Do not turn on "Collect email addresses."

| # | Question | Type |
|---|----------|------|
| 1 | What are you sharing? | Dropdown: `Photo`, `Quote`, `Memory` |
| 2 | Title (for a quote, type the quote itself) | Short answer |
| 3 | Tell us more | Paragraph |
| 4 | Photo | File upload (needs a Google sign-in), **or** a short-answer link if you'd rather not require sign-in |
| 5 | Your name | Short answer |
| 6 | How did you know Cynthia? | Short answer (optional) |
| 7 | Year or date | Short answer (optional) |

Under **Responses**, choose **Link to Sheets**. Copy the form's public link into `formUrl` in `config.js`.

### The sheet
In the linked sheet, the responses tab (usually "Form Responses 1") has columns A to H. Add two admin columns to its right:

- **I1: `Approved`**. Select I2:I1000, then **Insert → Dropdown** with `Yes` and `No`. Blank means draft.
- **J1: `Order`** (optional). A number puts an item earlier in the book. Items without a number follow in the order they arrived.

Add a new tab named **Published**. Type this header row in A1:H1:

`type, title, description, photo, name, relationship, year, order`

Then paste this in A2:

```
=QUERY('Form Responses 1'!A:J, "select B,C,D,E,F,G,H,J where I = 'Yes'", 0)
```

Only approved rows appear here. Everything else stays private.

### Publish only that tab
**File → Share → Publish to web**. Choose the **Published** tab and **Comma-separated values (.csv)**, then **Publish**. Copy the link into `sheetCsvUrl` in `config.js`, commit, and you're live. The responses tab is **not** published, so drafts and names of people who haven't been approved stay private.

### Photos
Form uploads go to a Drive folder owned by the form's creator. For approved photos to show on the site, set that folder's sharing to **Anyone with the link → Viewer**. The site converts Drive links automatically. Photos can also be a link to any image that's already public.

## 3. Day to day (no code)
- **Approve a submission:** set `Approved` to `Yes`. It shows up on the site within a few minutes (Google caches published sheets).
- **Hide or remove one:** set `Approved` to `No`.
- **Fix a typo or trim a name:** edit the cell in the responses tab.
- **Add something yourself:** type a new row at the bottom of the responses tab (or submit the form) and mark it `Yes`.
- **Reorder:** use the `Order` column.

## 4. Handing it off
Share the Google Sheet with the next admins as **Editor**. Whoever owns the form and the photo folder should be someone who will stay in the group, or transfer ownership before leaving. The GitHub repo only needs to be touched if you want to change the design or the settings in `config.js`.

## Notes
- **Safe by design.** Everything people submit is inserted as plain text, never as HTML, so a submission can't add code to the page. Nothing goes live without an admin's `Yes`.
- **If the sheet is unreachable,** the site shows a small notice and falls back to the sample pages in `config.js`. When the book is mostly finished, copy the finished entries into `config.js` as a backup.
- **Before publishing,** consider checking with Cynthia's family about the dedication, the photos, and the wording on the title page. Everything in brackets in `config.js` is a placeholder for you to fill in.
- **Colors and type** are the variables at the top of `styles.css`.
