/**
 * `waitForFunction`의 옵션을 **2번째 인자에 두는 것**을 금지한다.
 *
 * ## 왜 필요한가 — 만성 flake의 실제 원인이었다
 *
 * 시그니처는 `waitForFunction(pageFunction, arg?, options?)`이고, `arg`의 타입이 `any`다.
 * 그래서 아래 코드는 **컴파일도 통과하고 lint도 통과하지만 타임아웃이 적용되지 않는다.**
 *
 * ```ts
 * await page.waitForFunction(() => window.scrollY > 0, { timeout: 5000 });  // ❌
 * ```
 *
 * `{ timeout: 5000 }`은 `options`가 아니라 **`arg`로 직렬화되어 페이지에 넘어가고**,
 * predicate가 인자를 쓰지 않으면 조용히 버려진다. `options`는 `{}`가 된다
 * (`playwright-core/lib/client/frame.js` — 옵션을 추론하는 휴리스틱은 없다).
 *
 * 그리고 이 저장소는 `use.actionTimeout`을 설정하지 않으므로 기본값이 **0 = 무제한**이다
 * (`playwright/lib/index.js`의 `actionTimeout: [0, ...]` → `_defaultContextTimeout = 0`).
 * 결국 이 대기는 **테스트 예산을 전부 태울 때까지 멈추지 않는다.**
 *
 * ## 실측 (2026-08-01)
 *
 * `navigation.spec.ts`의 만성 flake를 trace로 추적한 결과:
 *
 * ```
 *   +  1.0s  93.1s  Wait for function   ← { timeout: 5000 } 을 의도한 대기
 *   + 90.1s   4.1s  After Hooks
 * ```
 *
 * 브라우저는 살아 있었고(스크린캐스트 454프레임 90초 균일), 네트워크도 83건 전부 완료였다.
 * 느린 앱도 자원 압박도 아니었다 — **캡이 걸리지 않은 대기 하나**가 원인이었다.
 * `.catch(() => {})`로 soft wait를 의도한 자리도 거부가 발생하지 않아 catch가 실행되지 않는다.
 *
 * ## 판정 기준
 *
 * 인자가 2개이고 2번째가 객체 리터럴이며 그 키에 `timeout` 또는 `polling`이 있으면 위반.
 * 3인자(`fn, arg, options`)는 정상이고, 2번째가 진짜 데이터인 경우는 건드리지 않는다.
 *
 * 알려진 누락: `const opts = {...}; waitForFunction(fn, opts)`처럼 식별자로 넘기면 AST만으로
 * arg인지 options인지 구분할 수 없어 잡지 못한다. 오탐을 만들지 않는 쪽을 택했다.
 */

const OPTION_KEYS = new Set(["timeout", "polling"]);

/** 객체 리터럴이 "옵션처럼 보이는가" — timeout/polling 키를 가지면 그렇다. */
function looksLikeOptions(node) {
  if (!node || node.type !== "ObjectExpression") return false;
  return node.properties.some((p) => {
    if (p.type !== "Property") return false;
    const name = p.key.type === "Identifier" ? p.key.name : p.key.value;
    return OPTION_KEYS.has(name);
  });
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "waitForFunction의 옵션은 3번째 인자여야 한다 — 2번째에 두면 arg로 먹혀 타임아웃이 무시된다",
    },
    schema: [],
    messages: {
      optionsAsArg:
        "waitForFunction의 옵션이 2번째 인자에 있습니다. 이 자리는 `arg`(페이지 함수의 인자)라 " +
        "`{{keys}}`가 조용히 무시되고 **타임아웃이 걸리지 않습니다**(actionTimeout 기본 0 = 무제한). " +
        "실제로 이것이 5초를 의도한 대기가 93초를 태운 원인이었습니다. " +
        "`waitForFunction(fn, undefined, {{{keys}}: ...})` 형태로 고치거나, " +
        "인자가 필요하면 `waitForFunction(fn, arg, options)`로 쓰세요.",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        const prop = callee.property;
        const name = prop.type === "Identifier" ? prop.name : prop.value;
        if (name !== "waitForFunction") return;

        // 3인자 이상이면 옵션이 제자리에 있다.
        if (node.arguments.length !== 2) return;

        const second = node.arguments[1];
        if (!looksLikeOptions(second)) return;

        const keys = second.properties
          .filter((p) => p.type === "Property")
          .map((p) => (p.key.type === "Identifier" ? p.key.name : p.key.value))
          .filter((k) => OPTION_KEYS.has(k))
          .join(", ");

        context.report({ node: second, messageId: "optionsAsArg", data: { keys } });
      },
    };
  },
};

export default rule;
