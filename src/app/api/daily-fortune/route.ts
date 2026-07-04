import { NextRequest, NextResponse } from "next/server";
import { getDb, getAdminDb } from "@/lib/db";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCharacterById } from "@/data/characters";
import { DailyFortuneSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { parseJsonSafe } from "@/services/core/text-cleaner";
import { buildCharacterHeader } from "@/services/core/prompt-builder";

const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();

type Area = "general" | "love" | "career" | "health" | "wealth";
const AREAS: Area[] = ["general", "love", "career", "health", "wealth"];
const AREA_LABELS: Record<Area, string> = {
  general: "종합운", love: "연애/인연", career: "직장/취업",
  health: "건강", wealth: "재물/재정",
};

function hashDateSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.codePointAt(i) ?? 0;
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash);
}

type CachedRow = { area: Area; card_id: string; is_reversed: boolean; interpretation: string; keywords: string[] };

function resolveErrorMessage(errMsg: string, locale: Locale): string {
  if (errMsg.includes("API_KEY") || errMsg.includes("auth")) return translate("api.ai-config-error", locale);
  if (errMsg.includes("rate limit") || errMsg.includes("429")) return translate("api.rate-limit-error", locale);
  return translate("api.daily-fortune-error", locale);
}

export async function POST(request: NextRequest) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const reqLocale = await getRequestLocale();
    if (isLocale(reqLocale)) locale = reqLocale;

    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`daily-fortune:${ip}`, 10, 60_000))) return rateLimitResponse(locale);

    const parsed = DailyFortuneSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { characterId, date } = parsed.data;
    const character = getCharacterById(characterId);
    if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    const db = getDb();
    const cachedRows = await db.findMany<CachedRow>("daily_cards", { date, character_id: characterId });
    const cachedByArea = new Map(cachedRows.map((r) => [r.area as Area, r]));
    const missingAreas = AREAS.filter((a) => !cachedByArea.has(a));

    const allCards = deckManager.getAllCards();
    const areaCards = AREAS.map((area) => {
      const seed = hashDateSeed(`${date}-${characterId}-${area}`);
      const card = allCards[seed % allCards.length];
      const isReversed = (seed % 3) === 0;
      const meanings = isReversed ? card.reversed : card.upright;
      return { area, cardId: card.id, isReversed, nameKo: card.nameKo, direction: isReversed ? "역방향" : "정방향", keywords: meanings.keywords.slice(0, 3), meaning: meanings.meaning };
    });

    if (missingAreas.length > 0) {
      const missingCards = areaCards.filter((ac) => missingAreas.includes(ac.area));
      const cardsDesc = missingCards
        .map((ac) => `- ${AREA_LABELS[ac.area]}: ${ac.nameKo} [${ac.direction}] / 키워드: ${ac.keywords.join(", ")} / 의미: ${ac.meaning}`)
        .join("\n");
      const template = Object.fromEntries(missingAreas.map((a) => [a, "..."]));
      const userPrompt = `오늘 뽑힌 카드:\n${cardsDesc}\n\n각 영역의 오늘 운세를 3~4문장으로 작성해주세요. 당신의 말투와 성격을 반영하세요.\n반드시 아래 JSON 형식으로만 응답하세요:\n${JSON.stringify(template)}`;
      const systemPrompt = `${buildCharacterHeader(character, "오늘의 운세를 전달하는 상담사입니다.", locale)}\n- 각 영역마다 3~4문장으로 간결하고 따뜻하게 운세를 전달합니다.\n- JSON 형식 외 다른 텍스트는 출력하지 않습니다.`;

      const aiResponse = await grokProvider.generateReading(systemPrompt, userPrompt, 2000);
      const rawParsed = parseJsonSafe(aiResponse);
      const interpretations: Record<string, string> = rawParsed
        ? Object.fromEntries(Object.entries(rawParsed).map(([k, v]) => [k, typeof v === "string" ? v : String(v)]))
        : {};

      for (const ac of missingCards) {
        const interpretation = interpretations[ac.area] ?? "";
        await getAdminDb().upsert("daily_cards", {
          date, character_id: characterId, area: ac.area,
          card_id: ac.cardId, is_reversed: ac.isReversed, interpretation, keywords: ac.keywords,
        }, "date,character_id,area");
        cachedByArea.set(ac.area, { area: ac.area, card_id: ac.cardId, is_reversed: ac.isReversed, interpretation, keywords: ac.keywords });
      }
    }

    const areas = AREAS.map((area) => {
      const row = cachedByArea.get(area);
      const ac = areaCards.find((c) => c.area === area)!;
      return {
        area,
        cardId: row?.card_id ?? ac.cardId,
        isReversed: row?.is_reversed ?? ac.isReversed,
        interpretation: row?.interpretation ?? "",
        keywords: row?.keywords ?? ac.keywords,
      };
    });

    return NextResponse.json({ areas });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Daily fortune error:", errMsg);
    const userMessage = resolveErrorMessage(errMsg, locale);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
