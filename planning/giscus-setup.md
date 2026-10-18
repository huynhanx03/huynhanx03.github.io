# GitHub comments for notes

Notes use [giscus](https://giscus.app), backed by GitHub Discussions. English and Vietnamese versions share a discussion through each note pair's `translationKey`.

To activate the widget:

1. Enable Discussions for `huynhanx03/huynhanx03.github.io`.
2. Install the giscus GitHub App for that repository.
3. Select the repository on giscus.app and choose the **Announcements** category and **specific term** mapping.
4. Copy the generated repository ID and category ID into `src/data/note-comments.ts`.

Those IDs are public configuration values, not secrets. Until both IDs are filled in, the note pages omit the widget.
