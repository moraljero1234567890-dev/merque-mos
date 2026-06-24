import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only user management: update another user's email and/or password.
// The caller is authenticated via their own Supabase session; we verify they
// are an admin, then perform the change with the service-role client.
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  // 1. Who is asking?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // 2. Are they an admin?
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  // 3. Perform the change with the service role.
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
    password?: string;
  };
  if (!body.userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const attrs: { email?: string; password?: string; email_confirm?: boolean } = {};
  if (body.email) {
    attrs.email = body.email.trim().toLowerCase();
    attrs.email_confirm = true;
  }
  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }
    attrs.password = body.password;
  }
  if (!attrs.email && !attrs.password) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(body.userId, attrs);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Keep the profile email in sync.
  if (attrs.email) {
    await admin.from("profiles").update({ email: attrs.email }).eq("id", body.userId);
  }

  return NextResponse.json({ ok: true });
}
