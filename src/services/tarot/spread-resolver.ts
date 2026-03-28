import { Topic, SpreadDefinition } from "@/types/session";
import { getSpreadForTopic, spreads } from "@/data/spreads";

export class SpreadResolver {
  resolveForTopic(topic: Topic): SpreadDefinition { return getSpreadForTopic(topic); }
  getSpreadByType(type: string): SpreadDefinition | undefined { return spreads[type as keyof typeof spreads]; }
  getRequiredCardCount(topic: Topic): number { return this.resolveForTopic(topic).positions.length; }
}
