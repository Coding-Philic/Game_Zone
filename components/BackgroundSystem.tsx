"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SITE } from "@/config/site";

interface BackgroundSystemProps {
  backgroundUrl?: string;
  backgroundType?: "image" | "video";
}

export default function BackgroundSystem({
  backgroundUrl,
  backgroundType,
}: BackgroundSystemProps) {
  const pathname = usePathname();
  const bgRef = useRef<HTMLDivElement>(null);
  const url = backgroundUrl || SITE.background.url;
  const type = backgroundType || SITE.background.type;

  if (pathname === "/") return null;

  useEffect(() => {
    let ctx: gsap.Context | undefined;

    async function initGSAP() {
      const gsapModule = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.default;
      gsap.registerPlugin(ScrollTrigger);

      if (bgRef.current) {
        ctx = gsap.context(() => {
          gsap.to(bgRef.current, {
            scale: 1.08,
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.5,
            },
          });
        });
      }
    }

    initGSAP();

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div ref={bgRef} className="absolute inset-0 scale-100">
        {type === "video" ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={url}
            className="h-full w-full object-cover"
          >
            <source src={url} type="video/mp4" />
          </video>
        ) : (
          <div
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${url})` }}
          />
        )}
      </div>

      {/* Dark gradient overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
    </div>
  );
}
