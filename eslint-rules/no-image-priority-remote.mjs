/**
 * `next/image`의 `priority`를 **로컬 정적 경로에만** 허용한다.
 *
 * ## 왜 필요한가
 *
 * `priority`는 `<link rel="preload">`를 head에 넣는다. src가 외부 CDN(R2 `cdn.xzawed.xyz` 등)이면
 * 그 preload가 `window.load`를 게이트해 E2E 타임아웃과 LCP 악화를 만든다(PR #412).
 *
 * 이 규칙은 `.claude/rules/e2e-testing.md`에 **산문으로만** 존재했고, 그래서 지켜지지 않았다 —
 * 2026-08-01 감사에서 세션 3곳과 `SpriteAnimator`가 위반 중인 것이 발견됐다. 산문 규칙은
 * 규칙이 아니라 희망이라는 실증이라, 린트로 강제한다.
 *
 * ## 판정 기준
 *
 * `priority`가 있으면 `src`는 **`/`로 시작하는 문자열 리터럴**이어야 한다.
 * 헬퍼 호출(`getCharacterImageUrl(...)`)·변수·http(s) 문자열은 전부 위반이다.
 * src가 리터럴이 아니면 호스트를 정적으로 알 수 없고, 이 저장소의 헬퍼들은 env에 따라
 * 로컬↔CDN을 오가므로 "지금은 로컬"이라는 판단 자체가 성립하지 않는다.
 *
 * 예외가 정당한 경우(진짜 LCP 요소이며 CDN 지연을 감수)에는 eslint-disable과 사유를 남긴다.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "next/image priority는 로컬 정적 경로(/로 시작하는 문자열 리터럴)에만 허용한다",
    },
    schema: [],
    messages: {
      nonLiteral:
        "<Image priority>의 src는 '/'로 시작하는 문자열 리터럴이어야 합니다. 받은 값: {{kind}}. " +
        "외부 URL은 preload가 window.load를 게이트해 E2E 타임아웃·LCP 악화를 만듭니다(PR #412). " +
        "정본: .claude/rules/e2e-testing.md",
      remoteLiteral:
        "<Image priority>의 src가 외부 URL입니다({{value}}). preload가 window.load를 게이트합니다. " +
        "정본: .claude/rules/e2e-testing.md",
    },
  },

  create(context) {
    /** priority 속성이 켜져 있는가 (`priority` 단축 또는 `priority={true}`) */
    function hasPriority(node) {
      return node.attributes.some((attr) => {
        if (attr.type !== "JSXAttribute" || attr.name?.name !== "priority") return false;
        if (attr.value === null) return true; // <Image priority />
        if (attr.value.type === "JSXExpressionContainer") {
          return attr.value.expression.type === "Literal" && attr.value.expression.value === true;
        }
        return false;
      });
    }

    function findSrc(node) {
      return node.attributes.find(
        (attr) => attr.type === "JSXAttribute" && attr.name?.name === "src",
      );
    }

    return {
      JSXOpeningElement(node) {
        if (node.name?.type !== "JSXIdentifier" || node.name.name !== "Image") return;
        if (!hasPriority(node)) return;

        const src = findSrc(node);
        if (!src) return; // src 없는 Image는 다른 룰(next/next)이 잡는다

        // 문자열 리터럴인가?
        const literal =
          src.value?.type === "Literal" && typeof src.value.value === "string"
            ? src.value.value
            : null;

        if (literal === null) {
          const kind =
            src.value?.type === "JSXExpressionContainer"
              ? src.value.expression.type
              : (src.value?.type ?? "unknown");
          context.report({ node: src, messageId: "nonLiteral", data: { kind } });
          return;
        }

        if (!literal.startsWith("/")) {
          context.report({ node: src, messageId: "remoteLiteral", data: { value: literal } });
        }
      },
    };
  },
};

export default rule;
