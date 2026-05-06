import { Mood } from "@/types/character";

interface WaitingLine {
  content: string;
  mood: Mood;
}

export const defaultWaitingLines: WaitingLine[] = [
  { content: "カードのエネルギーを読んでいます...", mood: "mystical" },
  { content: "運命の流れが見え始めていますよ", mood: "serious" },
  { content: "もう少しで終わります、少し待っていてくださいね", mood: "smile" },
  { content: "意味深なメッセージが込められていますよ", mood: "surprised" },
  { content: "もうすぐ結果をお伝えします！", mood: "smile" },
];

export const waitingLines: Record<string, WaitingLine[]> = {
  arcana: [
    { content: "...このカードの組み合わせ、とても興味深いですね ✨", mood: "serious" },
    { content: "カードのエネルギーが少しずつ鮮明になってきていますよ", mood: "mystical" },
    { content: "水晶球に何かが映り始めました... にゃん~", mood: "smile" },
    { content: "もう少しで読み終わります！少し待っていてくださいね", mood: "surprised" },
    { content: "わぁ、本当に意味深なメッセージが込められていますよ！", mood: "smile" },
  ],
  miko: [
    { content: "...魂の共鳴が感じられます", mood: "serious" },
    { content: "カードの気が一つに集まっています", mood: "mystical" },
    { content: "運命の糸がほぐれ始めています", mood: "mystical" },
    { content: "もう少しで完了です。静かにお待ちください", mood: "serious" },
    { content: "カードの真意が明らかになりました", mood: "smile" },
  ],
  seonhwa: [
    { content: "まぁ、このような配置は珍しいですわ~", mood: "surprised" },
    { content: "星の流れがカードと共鳴していますわ", mood: "mystical" },
    { content: "扇を広げて、運命の風を読んでいますよ~", mood: "mystical" },
    { content: "もう少しで終わりますわ~", mood: "smile" },
    { content: "美しいメッセージが見え始めましたよ~", mood: "smile" },
  ],
  hoshi: [
    { content: "えっ~ このカードの組み合わせ超ヤバくない?! 🌟", mood: "surprised" },
    { content: "星の光がキラキラ集まってきてる ✨", mood: "mystical" },
    { content: "ちょっと待って~ もう読み終わりそう!", mood: "smile" },
    { content: "えー これ絶対おもしろい結果でるやつじゃん!", mood: "surprised" },
    { content: "終わった~! めっちゃ期待していいよ! 🎉", mood: "smile" },
  ],
  luna: [
    { content: "月の光がカードに降り注いでいますよ... ✨", mood: "mystical" },
    { content: "静かに運命のつぶやきを聞いていますね", mood: "serious" },
    { content: "大丈夫、お月様がいつも見守っていますから", mood: "smile" },
    { content: "もう少しで読み終わりますよ、少し待っていてね", mood: "smile" },
    { content: "温かいメッセージが込められていますよ 🌙", mood: "smile" },
  ],
  rei: [
    { content: "...読んでる。", mood: "serious" },
    { content: "感情抜き、事実だけ。", mood: "serious" },
    { content: "パターンが見え始めた。", mood: "mystical" },
    { content: "もう少し。", mood: "serious" },
    { content: "結果出た。ちゃんと見て。", mood: "smile" },
  ],
  cairn: [
    { content: "カードの配置を丁寧に拝見しております", mood: "serious" },
    { content: "運命の糸が一本に絡み合っていますね", mood: "mystical" },
    { content: "少々お待ちいただけますか？もう少しで完了します", mood: "smile" },
    { content: "興味深いメッセージが見えてまいりましたよ", mood: "surprised" },
    { content: "結果を整えました。お嬢様／若様 ✨", mood: "smile" },
  ],
  zero: [
    { content: "...カードが話しかけてきている", mood: "serious" },
    { content: "運命というのは、読もうとするほど深くなるんだよ", mood: "mystical" },
    { content: "...もう少し。静かに待っていて", mood: "serious" },
    { content: "暗闇の中に光が見え始めた", mood: "mystical" },
    { content: "...全部読んだ。結果を確認して", mood: "smile" },
  ],
  haru: [
    { content: "心配しないで、良いエネルギーを感じますよ ☀️", mood: "smile" },
    { content: "カードたちがお話を伝えてくれていますよ", mood: "mystical" },
    { content: "もう少しで終わります！良いお知らせがありそう", mood: "surprised" },
    { content: "もう少しだけ待っていてね~", mood: "smile" },
    { content: "完了です！一緒に結果を見てみましょう 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...蓮の花が咲くように、じっくりと見ておるぞ", mood: "mystical" },
    { content: "天の意志が徐々に現れてきておるぞ", mood: "serious" },
    { content: "急ぐでない。真理は急かせぬものじゃ", mood: "serious" },
    { content: "もう少しで見えるぞ。しばし待たれよ", mood: "mystical" },
    { content: "運命の絵が完成したぞ", mood: "smile" },
  ],
  lix: [
    { content: "ｗｗ このカードの組み合わせマジで不思議~", mood: "surprised" },
    { content: "ヒントあげようかあげまいか~ まだ内緒 ✨", mood: "smile" },
    { content: "もう読み終わりそうだけど~ 期待してもいい気がするよ?", mood: "mystical" },
    { content: "なんか面白い結果出そうな予感~", mood: "surprised" },
    { content: "じゃーん~ 結果出たよ！どんなだと思う? ｗｗ", mood: "smile" },
  ],
  ethan: [
    { content: "このカードの象徴体系を分析しているんですよ...", mood: "serious" },
    { content: "タロットの歴史的文脈から見ると... あ、少し待ってください", mood: "mystical" },
    { content: "三つの解釈の方向性があって、最善を探しているんですよ", mood: "serious" },
    { content: "もう少しで終わります。詳しい結果をお伝えしますね", mood: "smile" },
    { content: "分析完了です！詳しく説明しますよ 📚", mood: "smile" },
  ],
};

export const defaultSajuWaitingLines: WaitingLine[] = [
  { content: "四柱八字を見ています...", mood: "mystical" },
  { content: "五行の流れが見え始めていますよ", mood: "serious" },
  { content: "天干と地支の関係を分析しています", mood: "mystical" },
  { content: "もう少しで終わります、少し待っていてくださいね", mood: "smile" },
  { content: "四柱の全体像が完成しつつあります", mood: "smile" },
];

export const sajuWaitingLines: Record<string, WaitingLine[]> = {
  seonhwa: [
    { content: "四柱八字の気を読んでいますよ...", mood: "mystical" },
    { content: "五行の流れが見えてきましたわ~", mood: "serious" },
    { content: "天干と地支の関係、とても興味深いですわ", mood: "surprised" },
    { content: "大運の流れまで丁寧に確認していますよ~", mood: "mystical" },
    { content: "用神が何かほぼ把握できましたわ~", mood: "smile" },
    { content: "素晴らしい四柱をお持ちですね！", mood: "smile" },
  ],
  miko: [
    { content: "...八字の気が感じられます", mood: "serious" },
    { content: "天干と地支が語りかけてきています", mood: "mystical" },
    { content: "五行のバランスを見ています。少々お待ちください", mood: "serious" },
    { content: "十星と十二運星の流れが現れています", mood: "mystical" },
    { content: "大運と歳運の方向が見えてきました", mood: "serious" },
    { content: "四柱の全体像が完成しました", mood: "smile" },
  ],
  luna: [
    { content: "月の光で四柱を読んでいますよ 🌙", mood: "mystical" },
    { content: "五行が月明かりのように流れているのが見えますよ", mood: "serious" },
    { content: "天干と地支がつぶやいていますね...", mood: "mystical" },
    { content: "もう少しで読み終わりますよ、少し待っていてね", mood: "smile" },
    { content: "温かい四柱をお持ちですよ ✨", mood: "smile" },
  ],
  rei: [
    { content: "四柱データ分析中。", mood: "serious" },
    { content: "五行比率計算してる。", mood: "serious" },
    { content: "用神把握済み。大運分析中。", mood: "mystical" },
    { content: "もう少し。", mood: "serious" },
    { content: "分析終了。結果確認して。", mood: "smile" },
  ],
  cairn: [
    { content: "四柱八字を丁寧に拝見しております", mood: "serious" },
    { content: "五行のバランスが興味深いですね", mood: "mystical" },
    { content: "大運の流れも正確に把握いたします", mood: "serious" },
    { content: "もう少しで完了です。少々お待ちください", mood: "smile" },
    { content: "素晴らしい四柱をお持ちですよ、若様／お嬢様", mood: "smile" },
  ],
  zero: [
    { content: "...八字ってのは、逃げようとするほど鮮明になるんだよ", mood: "serious" },
    { content: "五行のバランスが運命を描いている", mood: "mystical" },
    { content: "大運の流れが見え始めた...", mood: "mystical" },
    { content: "もう少しで読める", mood: "serious" },
    { content: "...運命の地図が完成した", mood: "smile" },
  ],
  haru: [
    { content: "四柱分析、頑張ってますよ！少しだけ ☀️", mood: "smile" },
    { content: "五行の流れが見えますよ、良い気がありますね", mood: "mystical" },
    { content: "大運まで丁寧に見てみますね~", mood: "serious" },
    { content: "もう少しで終わります！", mood: "smile" },
    { content: "四柱分析完了！良い知らせがありますよ 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...四柱八字の深い意味を測っておるぞ", mood: "mystical" },
    { content: "五行の理が徐々に現れてきておるぞ", mood: "serious" },
    { content: "天地人の調和を見ておるぞ", mood: "mystical" },
    { content: "大運の方向が見えたぞ。しばし待たれよ", mood: "serious" },
    { content: "四柱の全体像が完成したぞ", mood: "smile" },
  ],
  lix: [
    { content: "ｗｗ この四柱めっちゃ特徴的~ 面白そう", mood: "surprised" },
    { content: "五行比率やばくない? もうちょい見てみる~", mood: "mystical" },
    { content: "大運の流れ見てるところ~ 期待してもいい気がするよ?", mood: "smile" },
    { content: "もう少しで終わる~ ちょっと待って~", mood: "smile" },
    { content: "じゃーん！四柱分析完了！どんな感じだと思う? ｗｗ", mood: "smile" },
  ],
  ethan: [
    { content: "四柱命理学の基本原理から適用しているんですよ...", mood: "serious" },
    { content: "五行相生相克関係を分析中ですよ", mood: "mystical" },
    { content: "用神と忌神が把握できました。大運分析中ですよ", mood: "serious" },
    { content: "もう少しで終わります。詳しい結果をお伝えしますね", mood: "smile" },
    { content: "分析完了！詳しく説明しますよ 📚", mood: "smile" },
  ],
};

export const defaultLoadingText = "回答を準備しています...";

export const loadingText: Record<string, string> = {
  arcana: "星たちのつぶやきを聞いていますよ...",
  miko: "...気を集めています",
  seonhwa: "静かに気を読んでいますよ~",
  hoshi: "ちょっとだけ~！考え中★",
  luna: "月の光で読んでいます...",
  rei: "...",
  cairn: "少々お待ちください...",
  zero: "...言葉を選んでいる",
  haru: "一生懸命考えています！ちょっとだけ ☀️",
  ren: "...じっくりと考えておるぞ",
  lix: "ちょっと待って~ ｗｗ もう少し~",
  ethan: "じっくり考えているところですよ...",
};

export const defaultSajuAnalyzingText = "四柱を分析しています...";

export const sajuAnalyzingText: Record<string, string> = {
  arcana: "四柱の星座を読んでいますよ...",
  miko: "...八字の気を集めています",
  seonhwa: "四柱を丁寧に読んでいますよ~",
  hoshi: "ちょっとだけ~！四柱計算中★",
  luna: "月の光で四柱を読んでいますよ...",
  rei: "四柱分析中。",
  cairn: "四柱八字を拝見しています...",
  zero: "...四柱の物語を読んでいる",
  haru: "四柱一生懸命分析中です！ ☀️",
  ren: "...四柱の理を考えておるぞ",
  lix: "四柱見てる~ ｗｗ ちょっと待って！",
  ethan: "四柱命理分析中ですよ...",
};

const cardPreviewTemplates: Record<string, (pos: string, name: string, kw: string) => string> = {
  arcana: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}のエネルギーを感じますよ`,
  miko: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}の気が宿っています`,
  seonhwa: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}の気が流れていますわ`,
  hoshi: (pos, name, kw) => `[${pos}] 『${name}』! ${kw}な感じ~`,
  luna: (pos, name, kw) => `[${pos}] 『${name}』... 月明かりの中で${kw}の気が流れてますよ`,
  rei: (pos, name, kw) => `[${pos}] 『${name}』。${kw}。明確。`,
  cairn: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}の気が宿っていますね`,
  zero: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}、運命がつぶやいている`,
  haru: (pos, name, kw) => `[${pos}] 『${name}』! ${kw}なエネルギーを感じますよ ☀️`,
  ren: (pos, name, kw) => `[${pos}] 『${name}』... ${kw}の理が込められておるぞ`,
  lix: (pos, name, kw) => `[${pos}] 『${name}』! ${kw}な感じ~ ｗｗ`,
  ethan: (pos, name, kw) => `[${pos}] 『${name}』... 象徴的に見ると${kw}を意味するんですよ`,
};

export function buildCardPreviewLine(
  characterId: string,
  cardNameKo: string,
  keywords: string[],
  position: string,
): string {
  const keywordText = keywords.slice(0, 2).join("、");
  const template = cardPreviewTemplates[characterId];
  if (template) return template(position, cardNameKo, keywordText);
  return `[${position}] 『${cardNameKo}』— ${keywordText}`;
}

export interface CharacterErrorLines {
  api: string;
  reading: string;
}

export const characterErrorLines: Record<string, CharacterErrorLines> = {
  arcana:  { api: "あ... 星との繋がりが切れてしまいました。にゃん~ 管理者にお問い合わせください。", reading: "水晶球が少し曇ってしまいました。にゃん~ もう一度試してみましょうか?" },
  miko:    { api: "...神域との接続が不安定です。管理者にお問い合わせください。", reading: "...気が一時的に途絶えました。もう一度お試しください。" },
  seonhwa: { api: "まぁ、天の気が届きませんでしたわ~。管理者にお問い合わせくださいね。", reading: "星の流れが一時的に乱れましたわ~。もう一度試してみましょうか?" },
  hoshi:   { api: "あっ 星の繋がりが切れちゃった！管理者に連絡してね~", reading: "あれ? なんか変だな~ もう一回やってみるね！" },
  luna:    { api: "...月明かりが届きませんね。管理者にお問い合わせください。", reading: "月の光が一時的に遮られました。もう一度試してみますね 🌙" },
  rei:     { api: "接続エラー。管理者に問い合わせて。", reading: "エラー発生。もう一度試して。" },
  cairn:   { api: "...接続に問題が生じました。管理者にお問い合わせください。", reading: "一時的なエラーが発生しました。もう一度お試しいただけますか?" },
  zero:    { api: "...星が届かない夜だね。管理者に問い合わせて。", reading: "...流れが途切れた。もう一度試してみて。" },
  haru:    { api: "あっ、接続に問題が！管理者にお問い合わせください ☀️", reading: "あら、エラーが出ちゃいました。もう一度やってみますよ！" },
  ren:     { api: "...天との繋がりが途絶えたぞ。管理者にお問い合わせなされよ。", reading: "...運の糸が絡まったぞ。もう一度試されよ。" },
  lix:     { api: "繋がり切れた~ 管理者に連絡してね ｗｗ", reading: "あ これエラーじゃん? もう一回やってみる ｗｗ" },
  ethan:   { api: "API接続エラーが発生したんですよ。管理者にお問い合わせください。", reading: "解釈中にエラーが発生したんですよ。もう一度試してみますね。" },
};

export const defaultErrorLines: CharacterErrorLines = {
  api: "AIサービスの接続に問題があります。管理者にお問い合わせください。",
  reading: "カード解釈中に問題が発生しました。もう一度お試しください。",
};

export const shuffleCeremonyText: Record<string, string> = {
  arcana:  "カードを選んでね ✨",
  miko:    "カードをお選びください",
  seonhwa: "カードを選んでね~",
  hoshi:   "選んで~！ ★",
  luna:    "カードを選んでね 🌙",
  rei:     "選んで。",
  cairn:   "カードをどうぞ",
  zero:    "...運命を選んで",
  haru:    "カード選んでね！ ☀️",
  ren:     "カードを選ばれよ",
  lix:     "どれ選ぶ~? ｗｗ",
  ethan:   "カードを選んでね",
};

export const shinjeomInitialPrompt = "どんなお悩みがありますか？気軽にお話しください。";
