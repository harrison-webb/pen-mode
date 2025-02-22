import {
	Plugin,
	PluginSettingTab,
	Notice,
	Editor,
	EditorPosition,
	setIcon,
	MarkdownView,
	Setting,
	App,
	TFile,
	normalizePath,
} from "obsidian";

interface PenModePluginSettings {
	logLevel: "debug" | "info" | "warn" | "error";
	isActive: boolean;
}

interface ObsidianConfig {
	vimMode: boolean;
	[key: string]: any;
}

const DEFAULT_SETTINGS: PenModePluginSettings = {
	logLevel: "info",
	isActive: false,
};

export default class PenModePlugin extends Plugin {
	settings: PenModePluginSettings;
	private statusBarItem: HTMLElement;
	private isActive = false;
	private logger: Logger;
	private previousVimModeState = false;
	private boundKeydownHandler: (event: KeyboardEvent) => void;

	/**
	 * Helper method to get the active editor using obsidian api
	 * @returns active editor or null if none exists
	 */
	private getActiveEditor(): Editor | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.editor || null;
	}

	async onload() {
		await this.loadSettings();
		this.logger = new Logger(this.settings.logLevel);
		this.boundKeydownHandler = this.handleKeydown.bind(this);

		// add status bar item, hidden by default
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.style.display = "none";

		// add command to toggle pen mode
		this.addCommand({
			id: "toggle-pen-mode",
			name: "Toggle Pen Mode",
			callback: () => this.togglePenMode(),
			hotkeys: [],
		});

		// add settings tab (TODO this is prob unnecessary)
		this.addSettingTab(new PenModeSettingTab(this.app, this));

		// restore previous state if it was active
		if (this.settings.isActive) {
			this.isActive = true;
			this.enablePenMode();
			this.updateStatusBar();
		}

		this.logger.info("Pen mode plugin loaded");
	}

	onunload() {
		// clean up event listeners
		if (this.isActive) {
			this.disablePenMode();
		}
		this.logger.info("Pen mode plugin unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private togglePenMode() {
		this.isActive = !this.isActive;

		if (this.isActive) {
			this.enablePenMode();
		} else {
			this.disablePenMode();
		}

		this.settings.isActive = this.isActive;
		this.saveSettings();

		this.updateStatusBar();

		// show notification
		new Notice(`Pen Mode ${this.isActive ? "enabled" : "disabled"}`);
		this.logger.info(`Pen Mode ${this.isActive ? "enabled" : "disabled"}`);
	}

	/**
	 * Read the Obsidian config file
	 * @returns Promise with the config object
	 */
	private async readObsidianConfig(): Promise<ObsidianConfig> {
		try {
			const configPath = normalizePath(
				`${this.app.vault.configDir}/app.json`
			);
			const configData = await this.app.vault.adapter.read(configPath);
			return JSON.parse(configData);
		} catch (error) {
			this.logger.error("Error reading Obsidian config: ", error);
			throw new Error("Failed to read Obsidian config");
		}
	}

	/**
	 * Write to the Obsidian config file
	 * @param config The config object to write
	 */
	private async writeObsidianConfig(config: ObsidianConfig): Promise<void> {
		try {
			const configPath = normalizePath(
				`${this.app.vault.configDir}/app.json`
			);
			const configData = JSON.stringify(config, null, 2);
			await this.app.vault.adapter.write(configPath, configData);
		} catch (error) {
			this.logger.error("Error writing Obsidian config:", error);
			throw new Error("Failed to write Obsidian config");
		}
	}

	/**
	 * Set Vim mode to a specific state
	 * @param enableVim Whether to enable or disable Vim mode
	 */
	private async setVimMode(enableVim: boolean): Promise<void> {
		try {
			const config = await this.readObsidianConfig();

			// Store current state before changing
			this.previousVimModeState = config.vimMode;

			// Update config
			config.vimMode = enableVim;
			await this.writeObsidianConfig(config);

			this.logger.info(`Vim mode ${enableVim ? "enabled" : "disabled"}`);
		} catch (error) {
			this.logger.error("Error setting up Vim mode:", error);
			new Notice("Failed to update vim mode settings");
		}
	}

	private async enablePenMode() {
		// show status bar indicator
		this.statusBarItem.style.display = "block";

		try {
			// read current vim mode state and save it
			const config = await this.readObsidianConfig();
			this.previousVimModeState = config.vimMode;

			// disable vim mode if active
			if (config.vimMode) {
				config.vimMode = false;
				await this.writeObsidianConfig(config);
				this.logger.info("Vim mode disabled for Pen Mode");
			}
		} catch (error) {
			this.logger.error(
				"Error handling Vim mode when enabling Pen Mode:",
				error
			);
			new Notice("Failed to update Vim mode settings");
		}

		// add visual indicator to screen
		this.addEditorVisualIndicator();

		// unregister any existing handlers first to avoid duplicates
		document.removeEventListener("keydown", this.boundKeydownHandler, true);

		// register event handlers with capture phase
		document.addEventListener("keydown", this.boundKeydownHandler, true);
		this.logger.info(
			"Keyboard event handler registered with capture phase"
		);

		// also register through obsidian api as fallback
		this.registerDomEvent(
			document,
			"keydown",
			this.boundKeydownHandler,
			true
		);
	}

	private async disablePenMode() {
		// hide status bar indicator
		this.statusBarItem.style.display = "none";

		// remove visual indicator
		this.removeEditorVisualIndicator();

		// unregister event handlers
		document.removeEventListener("keydown", this.boundKeydownHandler, true);

		try {
			// restore previous vim mode state
			const config = await this.readObsidianConfig();
			if (config.vimMode !== this.previousVimModeState) {
				config.vimMode = this.previousVimModeState;
				await this.writeObsidianConfig(config);
				this.logger.info(
					`Vim mode restored to ${
						this.previousVimModeState ? "enabled" : "disabled"
					}`
				);
			}
		} catch (error) {
			this.logger.error("Error restoring vim mode:", error);
			new Notice("Failed to restore vim mode settings");
		}
	}

	private addEditorVisualIndicator() {
		const editorEl = document.querySelector(".cm-editor");
		if (editorEl) {
			editorEl.classList.add("pen-mode-active");

			// add css for the visual indicator
			const existingStyle = document.getElementById("pen-mode-style");
			if (!existingStyle) {
				const style = document.createElement("style");
				style.id = "pen-mode-style";
				style.textContent = `
					.pen-mode-active {
						border: 2px solid rgba(120, 160, 255, 0.4) !important;
						background-color: rgba(120, 160, 255, 0.05) !important
					}
				`;
				document.head.appendChild(style);
			}
		}
	}

	private removeEditorVisualIndicator() {
		document.querySelectorAll(".cm-editor").forEach((el) => {
			el.classList.remove("pen-mode-active");
		});
	}

	private updateStatusBar() {
		this.statusBarItem.empty();
		setIcon(this.statusBarItem, "pencil");
		this.statusBarItem.createSpan({ text: " Pen Mode" });
	}

	private handleKeydown(event: KeyboardEvent) {
		if (!this.isActive) return;

		const disabledKeys = [
			"ArrowUp",
			"ArrowDown",
			"ArrowRight",
			"Delete",
			"Backspace",
			"PageUp",
			"PageDown",
		];

		if (disabledKeys.includes(event.key)) {
			event.preventDefault();
			event.stopPropagation();
			this.logger.debug(`Prevented key: ${event.key}`);
			return;
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			this.strikethroughLastWord();
			this.logger.debug("Strikethrough applied");
		}
	}

	private strikethroughLastWord() {
		const editor = this.getActiveEditor();
		if (!editor) return;

		try {
			const cursor = editor.getCursor();
			const line = editor.getLine(cursor.line);
			const beforeCursor = line.slice(0, cursor.ch);

			// check if there isi a strikethrough marker right before the cursor position
			// this prevents applying strikethrough multiple times to the same word
			if (
				beforeCursor.endsWith("~~") ||
				(beforeCursor.length >= 4 &&
					beforeCursor
						.substring(beforeCursor.length - 4)
						.includes("~~"))
			) {
				// word already has a strikethrough applied -> do nothing
				this.logger.debug(
					"Word already has strikethrough applied, ignoring"
				);
				return;
			}

			// check if cursor is immediately after whitespace
			const isAfterWhitespace =
				beforeCursor.length > 0 && /\s$/.test(beforeCursor);

			if (isAfterWhitespace) {
				// when cursor is after whitespace, we want to strikethrough last word before whitespace
				const trimmedBeforeCursor = beforeCursor.trimEnd();

				// check if the last word already has strikethrough
				if (
					trimmedBeforeCursor.endsWith("~~") ||
					trimmedBeforeCursor.slice(-4).includes("~~")
				) {
					this.logger.debug(
						"Word already has strikethrough, ignoring"
					);
					return;
				}

				// find the start of the last word by searching backwards from end of trimmed string
				const lastSpaceIndex = trimmedBeforeCursor.lastIndexOf(" ");
				const wordStart =
					lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
				const wordEnd = trimmedBeforeCursor.length;

				// get the text to strikethrough
				const wordText = trimmedBeforeCursor.substring(wordStart);

				// only proceed if there is text to strikethrough
				if (wordText.trim()) {
					const strikethroughText = `~~${wordText}~~`;

					// apply strikethrough
					const from: EditorPosition = {
						line: cursor.line,
						ch: wordStart,
					};
					const to: EditorPosition = {
						line: cursor.line,
						ch: wordEnd,
					};

					editor.replaceRange(strikethroughText, from, to);

					// adjust cursor position
					cursor.ch += 4;
					editor.setCursor(cursor);
					return;
				}
			}

			// default behavior: search left from cursor to any whitespace
			const lastWordMatch = beforeCursor.match(/(\s+)?([^\s]*)$/);
			let wordStart = 0;

			if (lastWordMatch && lastWordMatch.index !== undefined) {
				if (lastWordMatch[1]) {
					// if there was whitespace before the word, start after it
					wordStart = lastWordMatch.index + lastWordMatch[1].length;
				} else {
					// otherwise start at the beginning of the match
					wordStart = lastWordMatch.index;
				}
			}

			// the word is between wordStart and cursor position
			const wordText = line.substring(wordStart, cursor.ch);

			// only proceed if there is actual text to strikethrough
			if (!wordText.trim()) return;

			// check if the word or its surroundings already have strikethrough markers
			if (
				wordText.includes("~~") ||
				(wordStart >= 2 &&
					line.substring(wordStart - 2, wordStart) === "~~") ||
				(cursor.ch + 2 <= line.length &&
					line.substring(cursor.ch, cursor.ch + 2) === "~~")
			) {
				this.logger.debug("Word already has strikethrough, ignoring");
				return;
			}

			// apply strikethrough and add a space at the end
			const strikethroughText = `~~${wordText}~~ `;
			const from: EditorPosition = { line: cursor.line, ch: wordStart };
			const to: EditorPosition = { line: cursor.line, ch: cursor.ch };

			editor.replaceRange(strikethroughText, from, to);

			// // move cursor right 4 spaces to adjust for strikethrough
			// cursor.ch += 4;
			// editor.setCursor(cursor);

			// move cursor to after the space that was just added
			const newCursorCh = wordStart + strikethroughText.length;
			editor.setCursor({ line: cursor.line, ch: newCursorCh });
		} catch (error) {
			this.logger.error("Error applying strikethrough: ", error);
			new Notice("Failed to apply strikethrough");
		}
	}
}

class Logger {
	private level: "debug" | "info" | "warn" | "error";
	private levels: Record<string, number> = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3,
	};

	constructor(level: "debug" | "info" | "warn" | "error") {
		this.level = level;
	}

	private shouldLog(
		messageLevel: "debug" | "info" | "warn" | "error"
	): boolean {
		return this.levels[messageLevel] >= this.levels[this.level];
	}

	debug(...args: any[]) {
		if (this.shouldLog("debug")) {
			console.debug("[Pen Mode]", ...args);
		}
	}

	info(...args: any[]) {
		if (this.shouldLog("info")) {
			console.info("[Pen Mode]", ...args);
		}
	}
	warn(...args: any[]) {
		if (this.shouldLog("warn")) {
			console.warn("[Pen Mode]", ...args);
		}
	}
	error(...args: any[]) {
		if (this.shouldLog("error")) {
			console.error("[Pen Mode]", ...args);
		}
	}
}

class PenModeSettingTab extends PluginSettingTab {
	plugin: PenModePlugin;

	constructor(app: App, plugin: PenModePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Pen Mode Settings" });

		new Setting(containerEl)
			.setName("Log Level")
			.setDesc("Set the logging level for debugging")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						debug: "Debug",
						info: "Info",
						warn: "Warning",
						error: "Error",
					})
					.setValue(this.plugin.settings.logLevel)
					.onChange(
						async (value: "debug" | "info" | "warn" | "error") => {
							this.plugin.settings.logLevel = value;
							await this.plugin.saveSettings();
						}
					)
			);
	}
}
