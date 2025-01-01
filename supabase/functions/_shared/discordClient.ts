export interface DiscordWebhookPayload {
  content: string;
  embeds?: {
    title: string;
    description: string;
    color?: number;
  }[];
}

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

export const sendDiscordMessage = async (
  payload: DiscordWebhookPayload
): Promise<void> => {
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Failed to send message to Discord: ${response.statusText}`
      );
    } else {
      console.log("Successfully sent message to Discord.");
    }
  } catch (error) {
    console.error("Error sending message to Discord:", error);
  }
};
