"use client";

import { FaFacebookF, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";

export default function ShareRow({ title }: { title: string }) {
  function share(platform: "facebook" | "twitter" | "linkedin") {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const shareUrls: Record<typeof platform, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer,width=600,height=500");
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">Share this event</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => share("facebook")}
          aria-label="Share on Facebook"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-lilac hover:text-parchment"
        >
          <FaFacebookF size={14} />
        </button>
        <button
          onClick={() => share("twitter")}
          aria-label="Share on X"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-lilac hover:text-parchment"
        >
          <FaXTwitter size={14} />
        </button>
        <button
          onClick={() => share("linkedin")}
          aria-label="Share on LinkedIn"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-lilac hover:text-parchment"
        >
          <FaLinkedinIn size={14} />
        </button>
      </div>
    </div>
  );
}
