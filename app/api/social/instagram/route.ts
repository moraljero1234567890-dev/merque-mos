import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// On-demand Instagram metrics via the official Instagram Graph API.
// Requires (server env): IG_USER_ID + IG_ACCESS_TOKEN — obtained by connecting
// the @merquellantas_sas Business/Creator account to a Facebook Page and a Meta
// app with instagram_basic + instagram_manage_insights. Admin-only.
const GRAPH = "https://graph.facebook.com/v21.0";

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const IG_USER_ID = process.env.IG_USER_ID;
  const TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_USER_ID || !TOKEN) {
    return NextResponse.json(
      {
        error: "Instagram no está conectado.",
        needsSetup: true,
        help:
          "Configura IG_USER_ID e IG_ACCESS_TOKEN (Instagram Graph API) en el servidor. " +
          "Requiere la cuenta @merquellantas_sas como Business/Creator vinculada a una página de Facebook y una app de Meta.",
      },
      { status: 400 },
    );
  }

  try {
    // Profile-level metrics.
    const profRes = await fetch(
      `${GRAPH}/${IG_USER_ID}?fields=username,followers_count,media_count&access_token=${TOKEN}`,
    );
    const prof = await profRes.json();
    if (prof.error) return NextResponse.json({ error: prof.error.message }, { status: 400 });

    // Recent media to compute likes/comments per post.
    const mediaRes = await fetch(
      `${GRAPH}/${IG_USER_ID}/media?fields=like_count,comments_count&limit=25&access_token=${TOKEN}`,
    );
    const media = await mediaRes.json();
    const items: { like_count?: number; comments_count?: number }[] = media.data ?? [];
    const n = items.length || 1;
    const totalLikes = items.reduce((s, m) => s + (m.like_count ?? 0), 0);
    const totalComments = items.reduce((s, m) => s + (m.comments_count ?? 0), 0);
    const avgLikes = Math.round(totalLikes / n);
    const avgComments = Math.round((totalComments / n) * 10) / 10;
    const followers = prof.followers_count ?? 0;
    const engagementRate = followers
      ? Math.round(((avgLikes + avgComments) / followers) * 1000) / 10
      : 0;

    const snapshot = {
      platform: "instagram",
      handle: prof.username ?? "merquellantas_sas",
      captured_at: new Date().toISOString(),
      followers,
      posts: prof.media_count ?? 0,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      engagement_rate: engagementRate,
      source: "instagram",
    };

    const admin = createAdminClient() ?? supabase;
    const { data: saved, error } = await admin.from("social_snapshots").insert(snapshot).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, snapshot: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error consultando Instagram" },
      { status: 500 },
    );
  }
}
