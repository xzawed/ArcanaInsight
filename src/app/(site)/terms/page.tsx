import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-arcana-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          ← 홈으로
        </Link>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mt-6 mb-8">이용약관</h1>

        <div className="space-y-8 text-arcana-text text-sm leading-relaxed">
          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 ArcanaInsight(이하 &ldquo;서비스&rdquo;)가 제공하는 AI 기반 타로 상담 서비스의 이용 조건 및 절차,
              이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제2조 (정의)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>&ldquo;서비스&rdquo;란 ArcanaInsight가 웹사이트를 통해 제공하는 AI 타로 리딩, 오늘의 운세, 캐릭터 상담 등 모든 관련 서비스를 말합니다.</li>
              <li>&ldquo;이용자&rdquo;란 본 약관에 따라 서비스를 이용하는 모든 자를 말합니다.</li>
              <li>&ldquo;회원&rdquo;이란 서비스에 계정을 등록하고 로그인하여 서비스를 이용하는 자를 말합니다.</li>
              <li>&ldquo;비회원&rdquo;이란 회원 가입 없이 서비스를 이용하는 자를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력을 발생합니다.</li>
              <li>서비스는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제4조 (서비스의 내용)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>AI 캐릭터와의 대화형 타로 카드 리딩</li>
              <li>캐릭터별 일일 운세 (오늘의 카드)</li>
              <li>리딩 결과 저장 및 공유</li>
              <li>기타 서비스가 추가로 개발하여 제공하는 서비스</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제5조 (서비스의 성격 및 면책)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>본 서비스는 <strong>오락 및 참고 목적</strong>으로 제공되며, AI가 생성한 타로 해석 결과는 전문적인 상담, 의료, 법률, 재정 등의 조언을 대체하지 않습니다.</li>
              <li>서비스의 리딩 결과를 기반으로 한 이용자의 판단 및 행동에 대해 서비스는 책임을 지지 않습니다.</li>
              <li>서비스는 AI 기술의 특성상 리딩 결과의 정확성, 완전성을 보장하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제6조 (이용자의 의무)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>이용자는 서비스 이용 시 관련 법령, 본 약관, 서비스 이용 안내 등을 준수하여야 합니다.</li>
              <li>이용자는 타인의 개인정보를 도용하거나 허위 정보를 입력하여서는 안 됩니다.</li>
              <li>이용자는 서비스의 정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
              <li>이용자는 서비스를 통해 얻은 정보를 서비스의 사전 동의 없이 상업적 목적으로 이용하여서는 안 됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제7조 (회원 탈퇴 및 자격 상실)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>회원은 언제든지 서비스에 탈퇴를 요청할 수 있으며, 서비스는 즉시 회원 탈퇴를 처리합니다.</li>
              <li>회원 탈퇴 시 개인정보 및 리딩 기록은 개인정보처리방침에 따라 처리됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제8조 (서비스 이용 제한)</h2>
            <p>
              서비스는 천재지변, 시스템 장애, AI 서비스 제공업체의 사정 등 불가항력적인 사유로 서비스 제공이
              어려운 경우 사전 고지 없이 서비스 이용을 일시적으로 제한할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제9조 (지적재산권)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>서비스가 제작한 캐릭터, 디자인, UI, 카드 아트워크 등 콘텐츠에 대한 저작권은 서비스에 귀속됩니다.</li>
              <li>이용자는 서비스로부터 제공받은 콘텐츠를 서비스의 사전 동의 없이 복제, 배포, 방송 등의 방법으로 이용하거나 제3자에게 제공할 수 없습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">제10조 (분쟁 해결)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>서비스와 이용자 간에 발생한 분쟁은 상호 협의하여 해결합니다.</li>
              <li>협의가 이루어지지 않을 경우 관할 법원에 따릅니다.</li>
            </ol>
          </section>

          <section className="border-t border-arcana-border pt-6">
            <p className="text-arcana-muted text-xs">
              <strong>부칙</strong><br />
              본 약관은 2026년 3월 30일부터 시행합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
