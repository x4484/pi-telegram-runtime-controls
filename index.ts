/**
 * Telegram Runtime Controls Extension
 * Zones: pi agent, telegram controls, runtime lifecycle
 *
 * Adds Telegram-native controls for safe Pi runtime operations that are not
 * built into pi-telegram's core mobile companion surface.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { registerTelegramCommand } from "@llblab/pi-telegram/commands";
import { registerTelegramSection } from "@llblab/pi-telegram/sections";

const TELEGRAM_RELOAD_PI_COMMAND = "telegram-reload-runtime";
const TELEGRAM_RELOAD_COMMAND = "reload_runtime";
const TELEGRAM_RELOAD_SECTION_ID = "pi-telegram-runtime-controls/reload";

export default function telegramRuntimeControls(pi: ExtensionAPI) {
	let unregisterTelegramCommand: (() => void) | undefined;
	let unregisterTelegramSection: (() => void) | undefined;

	function ensureTelegramControls(ctx?: ExtensionContext) {
		if (!unregisterTelegramCommand) {
			try {
				unregisterTelegramCommand = registerTelegramCommand({
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
				unregisterTelegramSection = registerTelegramSection({
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

function queuePiReload(pi: ExtensionAPI): void {
	pi.sendUserMessage(`/${TELEGRAM_RELOAD_PI_COMMAND}`, { deliverAs: "followUp" });
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
