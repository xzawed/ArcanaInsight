# 사용자 개인정보 입력 + 3자 제공 동의 — 디자인 스펙

## 개요

타로 상담 전 사용자의 이름/생년월일/성별/태어난 시를 입력받아 AI 리딩에 활용한다. 로그인 사용자는 3자 제공 동의 후 정보를 저장하여 재방문 시 자동 채움. 비로그인 사용자는 세션 내에서만 사용.

## 흐름

캐릭터 선택 → 캐릭터 상세 → 주제 선택 → **개인정보 입력 (신규)** → 세션(카드 리딩)

### 비로그인 사용자
- 이름, 생년월일, 성별, 태어난 시 입력 폼
- 세션 스토어에만 저장 (DB 미저장)
- "상담 시작" 버튼으로 세션 진입

### 로그인 + 개인정보 미저장
- 동일 폼 + "정보 저장하기" 체크박스
- 체크 시 3자 제공 동의 모달 → 동의 후 Supabase profiles에 저장

### 로그인 + 개인정보 저장됨
- 저장된 정보 자동 채움
- 수정 가능 → 수정 시 자동 업데이트
- 바로 "상담 시작" 가능

## 입력 필드

| 필드 | 타입 | 필수 | UI |
|------|------|------|-----|
| 이름 | text | ✅ | input |
| 생년월일 | date | ✅ | 년/월/일 3개 select (1950~2010) |
| 성별 | text | ✅ | 3개 버튼: 남성/여성/기타 |
| 태어난 시 | text | 선택 | 12시진 select + "모름" |

12시진: 자시(23~01), 축시(01~03), 인시(03~05), 묘시(05~07), 진시(07~09), 사시(09~11), 오시(11~13), 미시(13~15), 신시(15~17), 유시(17~19), 술시(19~21), 해시(21~23), 모름

## 3자 제공 동의

모달 내용:
- 수집항목: 이름, 생년월일, 성별, 태어난 시
- 이용목적: 타로 상담 개인화 및 정확도 향상
- 보유기간: 회원 탈퇴 시 즉시 삭제
- 동의/거부 버튼

## DB 스키마

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_hour text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_agreed_at timestamptz;
```

## 세션 스토어 확장

```ts
interface UserInfo {
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: "male" | "female" | "other";
  birthHour: string; // 시진 or "unknown"
}
// useSessionStore에 userInfo: UserInfo | null 추가
```

## AI 프롬프트 반영

리딩 프롬프트에 사용자 정보 포함:
```
상담자 정보:
- 이름: {name}
- 생년월일: {birthDate}
- 성별: {gender}
- 태어난 시: {birthHour}
```

## 레이아웃

데스크탑: 좌측 50% 캐릭터 + 우측 50% 폼
모바일: 캐릭터 상단 → 폼 하단

## 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/tarot/UserInfoForm.tsx` | 개인정보 입력 폼 컴포넌트 |
| `src/components/tarot/PrivacyConsentModal.tsx` | 3자 제공 동의 모달 |
| `src/data/birth-hours.ts` | 12시진 데이터 |
| `supabase/migrations/004_user_info.sql` | profiles 컬럼 추가 |

## 수정 파일

| 파일 | 변경 |
|------|------|
| `src/app/tarot/page.tsx` | 4단계 흐름에 user-info 스텝 추가 |
| `src/hooks/useSession.ts` | userInfo 상태 추가 |
| `src/services/core/prompt-builder.ts` | 사용자 정보 프롬프트 반영 |
| `src/app/api/tarot/reading/route.ts` | userInfo 파라미터 수신 |
