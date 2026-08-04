"use client";

import { useEffect, useState, FormEvent } from "react";

type Review = {
  id: string;
  bookTitle: string;
  bookAuthor: string | null;
  rating: number;
  reviewText: string;
  createdAt: string;
};

type SubmitResult = {
  review: Review;
  amazonSearchUrl: string;
  audibleSearchUrl: string;
  goodreadsSearchUrl: string;
};

function formatReviewDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default function PortalReviewsView() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  function refreshHistory() {
    fetch("/api/portal/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setReviews(data?.reviews ?? []))
      .catch(() => setReviews([]));
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (rating < 1) {
      setError("Choose a star rating.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/portal/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookTitle: bookTitle.trim(),
        bookAuthor: bookAuthor.trim() || undefined,
        rating,
        reviewText: reviewText.trim(),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      setError("Couldn't save your review. Check the fields and try again.");
      return;
    }

    const data: SubmitResult = await res.json();
    setResult(data);
    setBookTitle("");
    setBookAuthor("");
    setRating(0);
    setReviewText("");
    refreshHistory();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-voice text-3xl text-parchment">Reviews</h1>
      <p className="mt-1 text-sm text-muted">
        Write a review once, then post it wherever you actually leave reviews.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-hairline bg-surface p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Book title</span>
          <input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Author (optional)</span>
          <input
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs text-muted">Rating</span>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Your review</span>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            required
            rows={5}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        {error ? <p className="text-sm text-candle">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save review"}
        </button>
      </form>

      {result ? <ResultPanel result={result} /> : null}

      <div className="mt-10">
        <h2 className="font-voice text-lg text-parchment">Your review history</h2>
        <div className="mt-3">
          {reviews === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <ReviewHistory reviews={reviews} />
          )}
        </div>
      </div>
    </div>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          className={`text-2xl leading-none transition-colors ${
            star <= value ? "text-lilac" : "text-muted/40 hover:text-muted"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="shrink-0 text-sm leading-none">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? "text-lilac" : "text-muted/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

function ResultPanel({ result }: { result: SubmitResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.review.reviewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context, an
      // unsupported browser) -- the review text is still right there in
      // the read-only box either way, so there's nothing more useful to
      // do here than just leave the button saying "Copy to clipboard".
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-lilac/40 bg-surface p-5">
      <p className="font-voice text-lg text-parchment">Review saved!</p>
      <p className="mt-1 text-sm text-muted">
        Copy your review below, then post it on whichever platforms you use.
      </p>

      <div className="mt-4">
        <textarea
          readOnly
          value={result.review.reviewText}
          rows={4}
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 rounded-full border border-hairline px-4 py-1.5 text-xs text-parchment transition-colors hover:border-lilac"
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">
        These are search links, not direct links to a specific listing -- we don&rsquo;t have our own
        book database to match against, so find your book&rsquo;s exact edition once you get there.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={result.amazonSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-lilac px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
        >
          Search &amp; Review on Amazon
        </a>
        <a
          href={result.audibleSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-lilac px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
        >
          Search &amp; Review on Audible
        </a>
        <a
          href={result.goodreadsSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-lilac px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
        >
          Search &amp; Review on Goodreads
        </a>
      </div>
    </div>
  );
}

function ReviewHistory({ reviews }: { reviews: Review[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PREVIEW_LENGTH = 160;

  if (reviews.length === 0) {
    return <p className="text-sm text-muted">No reviews yet -- write your first one above.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const expanded = expandedId === review.id;
        const truncated = review.reviewText.length > PREVIEW_LENGTH;
        const preview =
          truncated && !expanded ? `${review.reviewText.slice(0, PREVIEW_LENGTH)}…` : review.reviewText;

        return (
          <div key={review.id} className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-parchment">
                  {review.bookTitle}
                  {review.bookAuthor ? <span className="text-muted"> by {review.bookAuthor}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted">{formatReviewDate(review.createdAt)}</p>
              </div>
              <StarRatingDisplay rating={review.rating} />
            </div>
            <p className="mt-2 text-sm text-muted">{preview}</p>
            {truncated ? (
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : review.id)}
                className="mt-1 text-xs text-lilac-soft hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
