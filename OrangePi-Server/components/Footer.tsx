'use client'

import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background/60 backdrop-blur-sm py-4 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4 text-xs sm:text-sm text-muted-foreground text-center">
        <div className="flex items-center gap-1.5">
          <span>Được tạo ra</span>
          <span className="inline-flex items-center gap-1">
            with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" />
          </span>
          <span>bởi</span>
          <a
            href="https://tony.id.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            Tony Trần
          </a>
        </div>
        <span className="hidden sm:inline text-border">·</span>
        <span className="whitespace-nowrap">Copyright 2026 ©</span>
        <span className="hidden sm:inline text-border">·</span>
        <a
          href="https://orangepi.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors whitespace-nowrap"
        >
          Orange Pi Việt Nam
        </a>
      </div>
    </footer>
  )
}
