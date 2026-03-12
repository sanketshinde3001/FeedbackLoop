"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendFeedbackInvite, sendReminderEmail } from "@/lib/email";

// ─── Create Session ──────────────────────────────────────────
export async function createSession(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const title = (formData.get("title") as string).trim();
  const sessionDate = formData.get("session_date") as string | null;
  // Questions come as JSON string from the client form
  const questionsRaw = formData.get("questions") as string;

  let questions: string[] = [];
  try {
    const parsed = JSON.parse(questionsRaw);
    questions = Array.isArray(parsed)
      ? parsed.map((q: string) => q.trim()).filter(Boolean)
      : [];
  } catch {
    redirect("/admin/sessions/new?error=Invalid+questions+format");
  }

  if (!title) redirect("/admin/sessions/new?error=Title+is+required");
  if (questions.length === 0)
    redirect("/admin/sessions/new?error=At+least+one+question+is+required");

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      title,
      host_id: user.id,
      questions,
      session_date: sessionDate || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) redirect(`/admin/sessions/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  redirect(`/admin/sessions/${data.id}`);
}

// ─── Update Session Status ───────────────────────────────────
export async function updateSessionStatus(
  sessionId: string,
  status: "draft" | "active" | "closed"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("host_id", user.id); // RLS double-check

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin/sessions");
}

// ─── Toggle Wall ─────────────────────────────────────────────
export async function toggleWall(sessionId: string, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { error } = await supabase
    .from("sessions")
    .update({ wall_enabled: enabled })
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

// ─── Add Attendee Manually ───────────────────────────────────
export async function addAttendee(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();

  if (!name || !email)
    redirect(`/admin/sessions/${sessionId}?error=Name+and+email+required`);

  const { error } = await supabase
    .from("attendees")
    .insert({ session_id: sessionId, name, email });

  if (error) {
    if (error.code === "23505") {
      redirect(
        `/admin/sessions/${sessionId}?error=${encodeURIComponent("This email is already added to the session")}`
      );
    }
    redirect(`/admin/sessions/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  // Fetch the session title + new attendee token to send invite
  const { data: session } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  const { data: attendee } = await supabase
    .from("attendees")
    .select("unique_token")
    .eq("session_id", sessionId)
    .eq("email", email)
    .single();

  if (session && attendee) {
    await sendFeedbackInvite({
      to: email,
      name,
      sessionTitle: session.title,
      token: attendee.unique_token,
    }).catch(() => null);
  }

  revalidatePath(`/admin/sessions/${sessionId}`);
  redirect(`/admin/sessions/${sessionId}?tab=attendees&success=Attendee+added+and+invite+sent`);
}

// ─── Bulk Add Attendees (CSV) ────────────────────────────────
export async function addAttendeesFromCSV(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const csvRaw = formData.get("csv") as string;
  if (!csvRaw?.trim())
    redirect(`/admin/sessions/${sessionId}?error=CSV+is+empty`);

  // Parse CSV: each line = "Name,email@example.com"
  const rows = csvRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, email] = line.split(",").map((s) => s.trim());
      return { name, email: email?.toLowerCase() };
    })
    .filter((r) => r.name && r.email && r.email.includes("@"));

  if (rows.length === 0)
    redirect(`/admin/sessions/${sessionId}?error=No+valid+rows+found+in+CSV`);

  const inserts = rows.map((r) => ({
    session_id: sessionId,
    name: r.name!,
    email: r.email!,
  }));

  // upsert — skip duplicates silently
  const { error } = await supabase
    .from("attendees")
    .upsert(inserts, { onConflict: "session_id,email", ignoreDuplicates: true });

  if (error) redirect(`/admin/sessions/${sessionId}?error=${encodeURIComponent(error.message)}`);

  // Send invite emails to all newly inserted attendees
  const { data: session } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  if (session) {
    const { data: inserted } = await supabase
      .from("attendees")
      .select("name, email, unique_token")
      .eq("session_id", sessionId)
      .in("email", inserts.map((r) => r.email));

    if (inserted) {
      await Promise.allSettled(
        inserted.map((a) =>
          sendFeedbackInvite({
            to: a.email,
            name: a.name,
            sessionTitle: session.title,
            token: a.unique_token,
          })
        )
      );
    }
  }

  revalidatePath(`/admin/sessions/${sessionId}`);
  redirect(`/admin/sessions/${sessionId}?tab=attendees&success=Attendees+imported+and+invites+sent`);
}

// ─── Send Reminders ─────────────────────────────────────────
export async function sendReminders(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("title, host_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.host_id !== user.id)
    throw new Error("Session not found");

  const { data: pending } = await supabase
    .from("attendees")
    .select("id, name, email, unique_token")
    .eq("session_id", sessionId)
    .is("submitted_at", null);

  if (!pending || pending.length === 0)
    redirect(`/admin/sessions/${sessionId}?tab=attendees&success=Everyone+has+already+submitted`);

  const results = await Promise.allSettled(
    pending.map((a) =>
      sendReminderEmail({
        to: a.email,
        name: a.name,
        sessionTitle: session.title,
        token: a.unique_token,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  // Mark reminded_at
  await supabase
    .from("attendees")
    .update({ reminded_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .is("submitted_at", null);

  revalidatePath(`/admin/sessions/${sessionId}`);
  redirect(
    `/admin/sessions/${sessionId}?tab=attendees&success=${encodeURIComponent(`Reminders sent to ${sent} of ${pending.length} attendees`)}`
  );
}

// ─── Send Reminder to Single Attendee ────────────────────────
export async function sendReminderToAttendee(attendeeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Get attendee details
  const { data: attendee } = await supabase
    .from("attendees")
    .select("id, name, email, unique_token, session_id, submitted_at")
    .eq("id", attendeeId)
    .single();

  if (!attendee) throw new Error("Attendee not found");

  // If already submitted, don't remind
  if (attendee.submitted_at) {
    redirect(`/admin/attendees?error=This+attendee+has+already+submitted`);
  }

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("title, host_id")
    .eq("id", attendee.session_id)
    .single();

  if (!session || session.host_id !== user.id) {
    throw new Error("Unauthorized");
  }

  // Send reminder email to single attendee
  await sendReminderEmail({
    to: attendee.email,
    name: attendee.name,
    sessionTitle: session.title,
    token: attendee.unique_token,
  });

  // Mark as reminded
  await supabase
    .from("attendees")
    .update({ reminded_at: new Date().toISOString() })
    .eq("id", attendeeId);

  revalidatePath("/admin/attendees");
  redirect(`/admin/attendees?success=${encodeURIComponent(`Reminder sent to ${attendee.name}`)}`);
}

// ─── Delete Session ──────────────────────────────────────────
export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  redirect("/admin/sessions");
}
