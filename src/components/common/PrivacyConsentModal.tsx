"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

export function PrivacyConsentModal({ isOpen, onAgree, onCancel }: PrivacyConsentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-arcana-card border border-arcana-border rounded-2xl p-6 max-w-md w-full z-10"
          >
            <h3 className="font-serif font-bold text-lg mb-4 text-arcana-text">개인정보 수집 및 이용 동의</h3>

            <div className="space-y-3 mb-6">
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">수집 항목</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">이름, 생년월일, 성별, 태어난 시</p>
              </div>
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">이용 목적</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">상담 개인화 및 정확도 향상, 재방문 시 자동 입력</p>
              </div>
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">보유 기간</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">회원 탈퇴 시 즉시 삭제</p>
              </div>
            </div>

            <p className="text-arcana-muted text-[10px] mb-4">
              개인정보 수집에 동의하지 않으셔도 서비스 이용이 가능하며, 동의하신 경우 다음 방문 시 자동으로 정보가 채워집니다.
              자세한 내용은{" "}
              <Link href="/privacy" className="text-arcana-purple underline hover:opacity-80" target="_blank">
                개인정보처리방침
              </Link>
              을 확인해주세요.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-2.5 rounded-full border border-arcana-border text-arcana-muted text-sm font-serif font-bold hover:border-arcana-purple transition-colors"
              >
                거부
              </button>
              <button
                type="button"
                onClick={onAgree}
                className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm font-serif font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
              >
                동의
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
