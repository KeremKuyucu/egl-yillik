"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

function getOrCreateVisitorId(): string {
    if (typeof window === "undefined") return "unknown_web"

    const STORAGE_KEY = "egl_visitor_id"
    try {
        let visitorId = localStorage.getItem(STORAGE_KEY)
        if (!visitorId) {
            if (typeof crypto !== "undefined" && crypto.randomUUID) {
                visitorId = `web_${crypto.randomUUID()}`
            } else {
                visitorId = `web_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`
            }
            localStorage.setItem(STORAGE_KEY, visitorId)
        }
        return visitorId
    } catch (e) {
        return `web_anon_${Date.now()}`
    }
}

export default function WebsiteVisitorTracker() {
    const pathname = usePathname()
    const lastLoggedPath = useRef<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined" || !pathname) return

        // Admin ve API sayfalarını loglama
        if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
            return
        }

        // Aynı route'u tekrar loglama
        if (lastLoggedPath.current === pathname) {
            return
        }
        lastLoggedPath.current = pathname

        const trackVisit = async () => {
            try {
                const uid = getOrCreateVisitorId()
                const todayStr = new Date().toISOString().split("T")[0]
                const lastDailyLogKey = "egl_last_daily_visit"
                const lastDailyDate = localStorage.getItem(lastDailyLogKey)

                const isFirstVisitToday = lastDailyDate !== todayStr

                // İlk günlük ziyarette app_opened_daily, sonrasında page_view gönder
                const eventName = isFirstVisitToday ? "app_opened_daily" : "page_view"

                if (isFirstVisitToday) {
                    localStorage.setItem(lastDailyLogKey, todayStr)
                }

                const payload = {
                    uid,
                    timestamp: new Date().toISOString(),
                    event: eventName,
                    platform: "web",
                    app: "egl-yillik",
                }

                // Telemetri gönder (non-blocking)
                await fetch("https://keremkk.com.tr/api/logs", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                    keepalive: true,
                })
            } catch (err) {
                // Kullanıcı deneyimini etkilememesi için sessizce başarısız ol
            }
        }

        // Tarayıcı boşta olduğunda çalıştır
        const timeout = setTimeout(trackVisit, 600)
        return () => clearTimeout(timeout)
    }, [pathname])

    return null
}
