/**
 * Telegram Runtime Controls Extension
 * Zones: pi agent, telegram controls, runtime lifecycle
 *
 * Adds Telegram-native controls for safe Pi runtime operations that are not
 * built into pi-telegram's core mobile companion surface.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const TELEGRAM_COMMAND_REGISTRY_KEY = "__piTelegramCommandRegistry__";
const TELEGRAM_SECTION_REGISTRY_KEY = "__piTelegramSectionRegistry__";
const TELEGRAM_RELOAD_PI_COMMAND = "telegram-reload-runtime";
const TELEGRAM_RELOAD_COMMAND = "reload_runtime";
const TELEGRAM_RELOAD_SECTION_ID = "pi-telegram-runtime-controls/reload";

export default function telegramRuntimeControls(pi: ExtensionAPI) {
	let unregisterTelegramCommand: (() => void) | undefined;
	let unregisterTelegramSection: (() => void) | undefined;

	function ensureTelegramControls(ctx?: ExtensionContext) {
		if (!unregisterTelegramCommand) {
			try {
				unregisterTelegramCommand = registerTelegramCommandCompat({
					name: TELEGRAM_RELOAD_COMMAND,
					description: "Reload pi runtime",
					showInMenu: true,
					emoji: "🔄",
					order: 40,
					handler: async (commandCtx) => {
						await commandCtx.reply("Reload queued.");
						queuePiReload(pi);
					},
				});
			} catch (error) {
				ctx?.ui.notify(
					`Telegram reload command unavailable: ${errorMessage(error)}`,
					"warning",
				);
			}
		}

		if (!unregisterTelegramSection) {
			try {
				unregisterTelegramSection = registerTelegramSectionCompat({
					id: TELEGRAM_RELOAD_SECTION_ID,
					label: "🔄 Reload runtime",
					order: 90,
					render: (sectionCtx) =>
						buildReloadRuntimeSectionView(
							sectionCtx.callbackData("confirm"),
							sectionCtx.callbackData("cancel"),
						),
					handleCallback: async (sectionCtx) => {
						if (sectionCtx.action === "cancel") {
							await sectionCtx.edit({
								text: "Reload cancelled.",
								parseMode: "plain",
								replyMarkup: { inline_keyboard: [] },
							});
							await sectionCtx.answerCallback("Cancelled.");
							return "handled";
						}
						if (sectionCtx.action !== "confirm") return "pass";

						await sectionCtx.edit({
							text: "<b>Reload queued.</b>\n\nPi will reload after the queued command runs.",
							parseMode: "html",
							replyMarkup: { inline_keyboard: [] },
						});
						await sectionCtx.answerCallback("Reload queued.");
						queuePiReload(pi);
						return "handled";
					},
				});
			} catch (error) {
				ctx?.ui.notify(
					`Telegram reload menu unavailable: ${errorMessage(error)}`,
					"warning",
				);
			}
		}
	}

	pi.registerCommand(TELEGRAM_RELOAD_PI_COMMAND, {
		description: "Reload extensions, skills, prompts, and themes from Telegram",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Reloading pi runtime...", "info");
			await ctx.reload();
			return;
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		ensureTelegramControls(ctx);
	});

	pi.on("session_shutdown", async () => {
		unregisterTelegramCommand?.();
		unregisterTelegramCommand = undefined;
		unregisterTelegramSection?.();
		unregisterTelegramSection = undefined;
	});
}

interface TelegramExtensionCommandContext {
	name: string;
	args: string;
	reply: (text: string) => Promise<void>;
	enqueuePrompt: (prompt: string) => Promise<void>;
}

interface TelegramExtensionCommandRegistration {
	name: string;
	description?: string;
	order?: number;
	showInMenu?: boolean;
	emoji?: string;
	handler: (ctx: TelegramExtensionCommandContext) => Promise<void> | void;
}

interface RegisteredTelegramExtensionCommand {
	name: string;
	description?: string;
	order: number;
	showInMenu: boolean;
	emoji?: string;
	handler: TelegramExtensionCommandRegistration["handler"];
}

interface TelegramExtensionCommandRegistry {
	commands: Map<string, RegisteredTelegramExtensionCommand>;
}

interface TelegramSectionRegistration {
	id: string;
	label: string;
	order?: number;
	render: (ctx: {
		callbackData(action: string, payload?: string): string;
	}) => unknown;
	handleCallback?: (ctx: {
		action: string;
		edit(view: unknown): Promise<void>;
		answerCallback(text?: string): Promise<void>;
	}) => Promise<"handled" | "pass"> | "handled" | "pass";
}

interface TelegramSectionRegistry {
	register(section: TelegramSectionRegistration): () => void;
}

function queuePiReload(pi: ExtensionAPI): void {
	pi.sendUserMessage(`/${TELEGRAM_RELOAD_PI_COMMAND}`, { deliverAs: "followUp" });
}

function registerTelegramCommandCompat(
	registration: TelegramExtensionCommandRegistration,
): () => void {
	const registry = getOrCreateTelegramCommandRegistry();
	const name = normalizeTelegramCommandName(registration.name);
	const previous = registry.commands.get(name);
	const command: RegisteredTelegramExtensionCommand = {
		name,
		description: registration.description,
		order: registration.order ?? 0,
		showInMenu: registration.showInMenu ?? false,
		emoji: registration.emoji?.trim() || undefined,
		handler: registration.handler,
	};
	registry.commands.set(name, command);
	return () => {
		if (registry.commands.get(name) !== command) return;
		if (previous) {
			registry.commands.set(name, previous);
			return;
		}
		registry.commands.delete(name);
	};
}

function registerTelegramSectionCompat(
	registration: TelegramSectionRegistration,
): () => void {
	const registry = (globalThis as Record<string, unknown>)[
		TELEGRAM_SECTION_REGISTRY_KEY
	] as TelegramSectionRegistry | undefined;
	if (!registry?.register) {
		throw new Error(
			"Telegram section registry not available. Is pi-telegram loaded and initialized?",
		);
	}
	return registry.register(registration);
}

function getOrCreateTelegramCommandRegistry(): TelegramExtensionCommandRegistry {
	const globalRecord = globalThis as Record<string, unknown>;
	const existing = globalRecord[TELEGRAM_COMMAND_REGISTRY_KEY];
	if (
		existing &&
		typeof existing === "object" &&
		"commands" in existing &&
		(existing as { commands?: unknown }).commands instanceof Map
	) {
		return existing as TelegramExtensionCommandRegistry;
	}
	const registry: TelegramExtensionCommandRegistry = { commands: new Map() };
	globalRecord[TELEGRAM_COMMAND_REGISTRY_KEY] = registry;
	return registry;
}

function normalizeTelegramCommandName(name: string): string {
	return name.trim().replace(/^\/+/, "").toLowerCase();
}

function buildReloadRuntimeSectionView(confirmData: string, cancelData: string) {
	return {
		text: "<b>Reload runtime?</b>\n\nThis reloads pi extensions, skills, prompts, and themes.",
		parseMode: "html" as const,
		replyMarkup: {
			inline_keyboard: [
				[
					{ text: "🔄 Reload", callback_data: confirmData },
					{ text: "❌ Cancel", callback_data: cancelData },
				],
			],
		},
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
