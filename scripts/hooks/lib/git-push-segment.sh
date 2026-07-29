#!/usr/bin/env bash
# PreToolUse 훅 공용 헬퍼 — 훅 stdin JSON에서 "실제 실행될 git push 세그먼트"만 추출한다.
#
# 왜 필요한가: 하네스의 훅 `if` 필터와 순진한 부분 문자열 매칭은 명령을 **본문에서
# 언급만** 해도 발화한다. 실측 사례 —
#   `gh pr create --body-file - <<EOF ... | git push --force | 차단 |  ... EOF`
#   `git commit -F- <<EOF ... git push 정책 설명 ... EOF`
# 둘 다 push가 아닌데 push 훅이 발화했다(전자는 가드 오탐, 후자는 pre-push-checks.sh가
# 불필요한 전체 검증 300초를 돌림). 그래서 "언급"과 "실행"을 구분하는 판정이 한 곳에 필요하다.
#
# 사용법:
#   source "$(dirname "$0")/lib/git-push-segment.sh"
#   seg="$(extract_git_push_segment "$hook_stdin_json")"
#   [ -n "$seg" ] || exit 0   # push가 아니면 통과

# 훅 JSON에서 .tool_input.command 추출 (jq 없으면 sed 폴백)
hook_command_of() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -r '.tool_input.command // ""'
  else
    printf '%s' "$1" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
  fi
}

# 훅 JSON → 실제 git push 세그먼트(없으면 빈 문자열)
# ① heredoc 본문(<< 이후) 절단 ② `;`·`|`·`&`로 세그먼트 분리
# ③ 세그먼트가 git push로 "시작"할 때만 채택 (`cd <경로> && ` 접두, `git -C <path>` 형태 포함)
extract_git_push_segment() {
  local raw="$1" cmd head_part seg
  cmd="$(hook_command_of "$raw")"
  head_part="${cmd%%<<*}"

  while IFS= read -r seg; do
    seg="${seg#"${seg%%[![:space:]]*}"}"   # 앞쪽 공백 제거
    seg="${seg#cd *&& }"                    # `cd <경로> && ` 접두 제거
    seg="${seg#"${seg%%[![:space:]]*}"}"
    case "$seg" in
      "git push"|"git push "*|"git -C "*" push "*)
        printf '%s' "$seg"
        return 0
        ;;
    esac
  done <<SEGMENTS
$(printf '%s' "$head_part" | tr ';|&' '\n')
SEGMENTS

  printf ''
}
