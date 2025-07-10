import Link from "next/link";
import { BookOpen } from "lucide-react";
import Image from "next/image";

export const Footer = () => {
  // Load social media URLs from environment variables
  const twitterUrl = process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/loredotmeme";
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/lorelistingbot";
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/loredotmeme";

  return (
    <footer className="bg-gradient-to-b from-blue-50 to-white dark:from-black dark:to-gray-900 border-t border-blue-100 dark:border-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <Link href="/" className="flex items-center gap-4 mb-6 md:mb-0">
            <Image className="h-8 w-8" src="/logo.png" alt="Lore.meme Logo" width={32} height={32} />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
              Lore.meme
            </span>
          </Link>
          <div className="flex gap-4">
            {/* X (Twitter) Icon */}
            <Link
              href={twitterUrl}
              className="text-slate-500 hover:text-blue-500 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on X (Twitter)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
              </svg>
            </Link>
            {/* Telegram Icon */}
            <Link
              href={telegramUrl}
              className="text-slate-500 hover:text-blue-500 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join our Telegram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21.5 2L2 10.5l7 3.5L12 21l2.5-7.5L21.5 2z" />
                <path d="M9.5 14L12 16.5" />
              </svg>
            </Link>
            {/* Instagram Icon */}
            <Link
              href={instagramUrl}
              className="text-slate-500 hover:text-blue-500 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-blue-100 dark:border-gray-700 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} Lore.meme. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
