"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/session";
import { ChatBubble } from "./ChatBubble";

interface ChatWindowProps { messages: ChatMessage[]; className?: string; }

export function ChatWindow({ messages, className = "" }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  return (
    <div className={`flex flex-col overflow-y-auto px-4 py-3 ${className}`}>
      {messages.length === 0 && (
        <div className="text-center text-arcana-muted text-sm py-8">상담이 시작되면 대화가 여기에 표시됩니다.</div>
      )}
      {messages.map((msg) => (<ChatBubble key={msg.id} message={msg} />))}
      <div ref={bottomRef} />
    </div>
  );
}
