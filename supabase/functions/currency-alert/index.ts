import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { sendDiscordMessage } from "../_shared/discordClient.ts";
import { supabaseClient } from "../_shared/supabaseClient.ts";

async function getCurrencyRate(nickname: string): Promise<number | null> {
  try {
    const url = `https://www.google.com/finance/quote/${nickname}-IDR`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch data for ${nickname}: ${res.statusText}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const rate = $(".YMlKec.fxKbKc").first().text();

    if (!rate) {
      console.error(`Failed to extract rate for ${nickname}`);
      return null;
    }

    return parseFloat(rate.replace(/[^\d.-]/g, "").replace(",", ""));
  } catch (error) {
    console.error(`Error fetching or parsing data for ${nickname}:`, error);
    return null;
  }
}

serve(async (req) => {
  const exchangeRatesAboveThreshold = [];

  const { data, error } = await supabaseClient
    .from("control_table")
    .select("nickname, value")
    .eq("group_id", "CurrencyThreshold");

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return new Response("Error fetching data from Supabase", { status: 500 });
  }

  if (!data || data.length === 0) {
    console.log("No data found in control table.");
    return new Response("No currencies to process.", { status: 200 });
  }

  for (const currency of data) {
    const thresholdValue = parseFloat(
      currency.value.replace(/[^\d.-]/g, "").replace(",", "")
    );
    if (isNaN(thresholdValue)) {
      console.error(
        `Invalid threshold for ${currency.nickname}: ${currency.value}`
      );
      continue;
    }

    const parsedRate = await getCurrencyRate(currency.nickname);
    if (!parsedRate) {
      continue;
    }

    if (parsedRate <= thresholdValue) {
      console.log(
        `ALERT: ${currency.nickname} rate is below threshold: ${parsedRate}`
      );
      exchangeRatesAboveThreshold.push({
        currency: currency.nickname,
        rate: parsedRate,
      });
    }
  }

  if (exchangeRatesAboveThreshold.length) {
    const discordPayload = {
      content: "Currency rates above threshold alert @everyone:",
      embeds: exchangeRatesAboveThreshold.map(({ currency, rate }) => ({
        title: `Currency: ${currency}`,
        description: `Rate: ${rate}`,
        color: 16711680,
      })),
    };

    await sendDiscordMessage(discordPayload);
  }

  return new Response(JSON.stringify({ exchangeRatesAboveThreshold }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
