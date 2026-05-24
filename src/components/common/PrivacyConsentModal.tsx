"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/useT";

interface PrivacyConsentModalProps {
  readonly isOpen: boolean;
  readonly onAgree: () => void;
  readonly onCancel: () => void;
}

export function PrivacyConsentModal({ isOpen, onAgree, onCancel }: PrivacyConsentModalProps) {
  const { t } = useT();
  const noteText = t("privacy-consent.note");
  const [noteBefore, noteAfter] = noteText.split("{policyLink}");
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button type="button" aria-label={t("common.modal.close-aria")} onClick={onCancel} className="absolute inset-0 bg-black/60 cursor-default" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-arcana-card border border-arcana-border rounded-2xl p-6 max-w-md w-full z-10"
          >
            <h3 className="font-serif font-bold text-lg mb-4 text-arcana-text">{t("privacy-consent.title")}</h3>

            <div className="space-y-3 mb-6">
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">{t("privacy-consent.items.label")}</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">{t("privacy-consent.items.content")}</p>
              </div>
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">{t("privacy-consent.purpose.label")}</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">{t("privacy-consent.purpose.content")}</p>
              </div>
              <div className="bg-arcana-surface/50 rounded-xl p-4">
                <h4 className="text-arcana-purple text-xs font-serif font-bold mb-2">{t("privacy-consent.retention.label")}</h4>
                <p className="text-arcana-muted text-xs leading-relaxed">{t("privacy-consent.retention.content")}</p>
              </div>
            </div>

            <p className="text-arcana-muted text-[10px] mb-4">
              {noteBefore}
              <Link href="/privacy" className="text-arcana-purple underline hover:opacity-80" target="_blank">
                {t("privacy-consent.policy-link")}
              </Link>
              {noteAfter}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-2.5 rounded-full border border-arcana-border text-arcana-muted text-sm font-serif font-bold hover:border-arcana-purple transition-colors"
              >
                {t("privacy-consent.cancel")}
              </button>
              <button
                type="button"
                onClick={onAgree}
                className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm font-serif font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
              >
                {t("privacy-consent.agree")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
