import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="bg-arcana-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          ← 홈으로
        </Link>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mt-6 mb-8">개인정보처리방침</h1>

        <div className="space-y-8 text-arcana-text text-sm leading-relaxed">
          <section>
            <p>
              ArcanaInsight(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을
              준수합니다. 본 방침을 통해 이용자가 제공하는 개인정보가 어떤 용도와 방식으로 이용되고 있으며,
              어떤 보호 조치를 취하고 있는지 알려드립니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">1. 수집하는 개인정보 항목</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-arcana-border text-xs">
                <thead>
                  <tr className="bg-arcana-surface">
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">수집 시점</th>
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">필수 항목</th>
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">선택 항목</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-arcana-border px-3 py-2">회원 가입 시</td>
                    <td className="border border-arcana-border px-3 py-2">이메일, OAuth 인증 정보 (구글)</td>
                    <td className="border border-arcana-border px-3 py-2">닉네임, 프로필 이미지</td>
                  </tr>
                  <tr>
                    <td className="border border-arcana-border px-3 py-2">타로 상담 시</td>
                    <td className="border border-arcana-border px-3 py-2">없음 (비회원 이용 가능)</td>
                    <td className="border border-arcana-border px-3 py-2">이름, 생년월일, 성별, 태어난 시</td>
                  </tr>
                  <tr>
                    <td className="border border-arcana-border px-3 py-2">서비스 이용 중</td>
                    <td className="border border-arcana-border px-3 py-2">없음</td>
                    <td className="border border-arcana-border px-3 py-2">리딩 기록, 선택한 카드 정보</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>서비스 제공:</strong> AI 타로 리딩 개인화, 캐릭터 상담 맞춤화</li>
              <li><strong>회원 관리:</strong> 본인 확인, 서비스 이용 이력 관리</li>
              <li><strong>리딩 기록 저장:</strong> 마이페이지에서 과거 리딩 결과 열람</li>
              <li><strong>서비스 개선:</strong> 통계 분석 및 서비스 품질 향상 (비식별 처리)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">3. 개인정보의 제3자 제공</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-arcana-border text-xs">
                <thead>
                  <tr className="bg-arcana-surface">
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">제공받는 자</th>
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">제공 항목</th>
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">제공 목적</th>
                    <th className="border border-arcana-border px-3 py-2 text-left font-serif">보유 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-arcana-border px-3 py-2">xAI (Grok API)</td>
                    <td className="border border-arcana-border px-3 py-2">이름, 생년월일, 성별, 태어난 시 (동의 시에만)</td>
                    <td className="border border-arcana-border px-3 py-2">AI 타로 리딩 생성</td>
                    <td className="border border-arcana-border px-3 py-2">API 호출 즉시 삭제 (저장하지 않음)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-arcana-muted text-xs">
              ※ 개인정보 제3자 제공은 이용자의 동의를 받은 경우에만 이루어지며, 동의하지 않아도 서비스 이용이 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">4. 개인정보의 보유 및 파기</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>회원 정보:</strong> 회원 탈퇴 시 즉시 파기</li>
              <li><strong>타로 상담 개인정보:</strong> 동의 철회 또는 회원 탈퇴 시 즉시 파기</li>
              <li><strong>리딩 기록:</strong> 회원 탈퇴 시 즉시 파기</li>
              <li><strong>비회원 리딩:</strong> 세션 종료 시 서버에 저장하지 않음</li>
            </ul>
            <p className="mt-2">
              파기 방법: 전자적 파일은 복구 불가능한 방법으로 영구 삭제하며, 출력물은 분쇄 또는 소각합니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">5. 이용자의 권리와 행사 방법</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>이용자는 언제든지 자신의 개인정보에 대해 <strong>열람, 수정, 삭제, 처리정지</strong>를 요청할 수 있습니다.</li>
              <li>마이페이지에서 직접 개인정보를 수정·삭제할 수 있습니다.</li>
              <li>개인정보 수집·이용에 대한 동의를 언제든지 철회할 수 있습니다.</li>
              <li>위 권리 행사는 서비스 내 설정 또는 이메일을 통해 가능합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">6. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>데이터 암호화:</strong> 전송 구간 SSL/TLS 암호화, 비밀번호 해시 처리</li>
              <li><strong>접근 제한:</strong> 개인정보 접근 권한을 최소 인원으로 제한</li>
              <li><strong>보안 인프라:</strong> Supabase Row Level Security(RLS) 정책 적용</li>
              <li><strong>정기 점검:</strong> 보안 취약점 점검 및 패치 수행</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">7. 쿠키(Cookie) 사용</h2>
            <p>
              서비스는 인증 세션 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을
              거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">8. 개인정보 보호책임자</h2>
            <div className="bg-arcana-surface/50 rounded-xl p-4">
              <p>서비스 이용 중 개인정보 관련 문의사항이 있으시면 아래로 연락해주세요.</p>
              <ul className="mt-2 space-y-1 text-arcana-muted text-xs">
                <li>담당: ArcanaInsight 개인정보 보호 담당</li>
                <li>이메일: privacy@arcanainsight.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">9. 권익침해 구제방법</h2>
            <p>개인정보 침해에 대한 신고·상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-arcana-muted text-xs">
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
              <li>대검찰청 사이버수사과 (spo.go.kr / 1301)</li>
              <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 182)</li>
            </ul>
          </section>

          <section className="border-t border-arcana-border pt-6">
            <p className="text-arcana-muted text-xs">
              <strong>부칙</strong><br />
              본 개인정보처리방침은 2026년 3월 30일부터 시행합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
