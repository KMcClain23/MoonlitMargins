import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";

export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data: reviews } = await supabase
    .from("member_reviews")
    .select("id, book_title, book_author, rating, review_text, created_at")
    .eq("member_id", session.memberId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    reviews: (reviews ?? []).map((r) => ({
      id: r.id,
      bookTitle: r.book_title,
      bookAuthor: r.book_author,
      rating: r.rating,
      reviewText: r.review_text,
      createdAt: r.created_at,
    })),
  });
}

const createSchema = z.object({
  bookTitle: z.string().min(1),
  bookAuthor: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(1),
});

// One combined "title author" query string reused across all three
// platforms -- each just plugs it into its own search endpoint's own
// query param name.
function buildSearchQuery(bookTitle: string, bookAuthor: string | undefined): string {
  return encodeURIComponent([bookTitle, bookAuthor].filter(Boolean).join(" "));
}

export async function POST(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { bookTitle, bookAuthor, rating, reviewText } = parsed.data;
  const supabase = supabaseServer();

  const { data: created, error } = await supabase
    .from("member_reviews")
    .insert({
      member_id: session.memberId,
      book_title: bookTitle,
      book_author: bookAuthor || null,
      rating,
      review_text: reviewText,
    })
    .select("id, book_title, book_author, rating, review_text, created_at")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Could not save your review" }, { status: 500 });
  }

  const query = buildSearchQuery(bookTitle, bookAuthor);

  return NextResponse.json({
    review: {
      id: created.id,
      bookTitle: created.book_title,
      bookAuthor: created.book_author,
      rating: created.rating,
      reviewText: created.review_text,
      createdAt: created.created_at,
    },
    amazonSearchUrl: `https://www.amazon.com/s?k=${query}`,
    audibleSearchUrl: `https://www.audible.com/search?keywords=${query}`,
    goodreadsSearchUrl: `https://www.goodreads.com/search?q=${query}`,
  });
}
