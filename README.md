# Dwain Browne Personal Website

Static personal profile site for Dwain Browne.

## Overview

The site is built with plain HTML, CSS, and existing static assets. It presents Dwain's profile, founder story, companies, consultation offer, Vibe Code to Profit community, speaking/keynote availability, live content, blog posts, and social links.

## Main Pages

- `index.html` - homepage and profile overview
- `about.html` - About Me story and background
- `companies.html` - overview of Dwain's companies
- `snapsuite.html` - SnapSuite company page
- `leadscore.html` - LeadScore AI company page
- `affordly.html` - Affordly company page
- `vibe-code-to-profit.html` - Vibe Code to Profit company/community page
- `consultation.html` - free consultation call-to-action
- `community.html` - Vibe Code to Profit community
- `speaking.html` - keynote and workshop booking
- `live.html` - YouTube, TikTok, and Friday live content hub
- `connect.html` - social and platform links
- `blog.html` - blog index
- `blog/*.html` - individual static blog posts

Legacy template routes such as `about.html`, `contact.html`, `portfolio.html`, and `portfolio-single.html` have been replaced with current site content.

## Assets

- Source styles live in `assets/css/style.css`.
- Source images live in `assets/images/`.
- The `dist/` folder mirrors the static pages and CSS for deployment workflows that use `dist`.

When editing source HTML or CSS, mirror the relevant changes into `dist/` before deploying.

## Local Preview

From the repository root:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Publishing Content

To add a blog post:

1. Add a new HTML file under `blog/`.
2. Add the post card to `blog.html`.
3. Copy the new post and updated `blog.html` into `dist/`.
4. Verify local links before committing.
