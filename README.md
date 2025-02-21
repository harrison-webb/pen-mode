# Pen Mode Plugin for Obsidian

Background: Writing is great. Writing on a computer is great, typing is pretty fast and easy, and if you use Obsidian then it is easy to link ideas together and search through your Vault at a later time to find things you've written about. Writing with pen and paper, however, is slow and does not scale well. You can't easily search for ideas or link things together. Also my handwriting is terrible.

Situation: Morning Pages (from Julia Cameron) or other flavors of stream of consciousness writing. Sitting down and just letting the thoughts fly.

Thesis: Computer good, handwriting bad. However, I think handwriting _does_ have a big advantage for stream of consciousness writing: you are ONLY writing. On a computer, I find that "writing" actually means writing+editing in rapid oscillation, which I believe is detrimental for stream of consciousness writing.

Solution: Pen Mode Plugin for Obsidian. This plugin DISABLES the delete key, arrow keys, and other stuff that some people might use to move their cursor around and change what they have written (page up / page down / etc.). The ONLY option that you have is the left arrow key, which will apply strikethrough to the last word you have typed (akin to crossing out a word in pen).

# TODO

-   add a space after strikethrough gets applied
-   don't allow for a crossed-out word to be crossed-out again
-   remove all the console logging

# stuff from the obsidian sample plugin readme

This is a sample plugin for Obsidian (https://obsidian.md).

This project uses TypeScript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in TypeScript Definition format, which contains TSDoc comments describing what it does.

This sample plugin demonstrates some of the basic functionality the plugin API can do.

-   Adds a ribbon icon, which shows a Notice when clicked.
-   Adds a command "Open Sample Modal" which opens a Modal.
-   Adds a plugin setting tab to the settings page.
-   Registers a global click event and output 'click' to the console.
-   Registers a global interval which logs 'setInterval' to the console.

## Releasing new releases

-   Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
-   Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
-   Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
-   Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
-   Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

-   Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
-   Publish an initial version.
-   Make sure you have a `README.md` file in the root of your repo.
-   Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Manually installing the plugin

-   Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)

-   [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code.
-   To use eslint with this project, make sure to install eslint from terminal:
    -   `npm install -g eslint`
-   To use eslint to analyze this project use this command:
    -   `eslint main.ts`
    -   eslint will then create a report with suggestions for code improvement by file and line number.
-   If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
    -   `eslint .\src\`
