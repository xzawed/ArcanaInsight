import * as ko from "./waiting-lines";
import * as en from "./waiting-lines-en";
import * as ja from "./waiting-lines-ja";

export function getWaitingLinesData(locale: string) {
  if (locale === "en") return en;
  if (locale === "ja") return ja;
  return ko;
}
