import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
const strings = (value: unknown) => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const callerClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authData } = await callerClient.auth.getUser();
  if (!authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: caller } = await service.from("app_users").select("id,role,is_active").eq("id", authData.user.id).single();
  if (!caller?.is_active || !["admin", "super_admin"].includes(caller.role)) return json({ error: "Administrator access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "invite");
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const role = String(body.role || "priest");

  if (action === "bulk_onboard_priests") {
    if (caller.role !== "super_admin") return json({ error: "Only a super admin can bulk onboard Purohits" }, 403);
    const priests = Array.isArray(body.priests) ? body.priests.slice(0, 250) : [];
    if (!priests.length) return json({ error: "Add at least one Purohit" }, 400);
    if (body.priests.length > 250) return json({ error: "A single import can contain at most 250 Purohits" }, 400);

    const results: Array<Record<string, unknown>> = [];
    for (let index = 0; index < priests.length; index += 1) {
      const item = priests[index] || {};
      const itemName = String(item.full_name || "").trim();
      const suppliedEmail = String(item.email || "").trim().toLowerCase();
      const loginUsername = String(item.login_username || "").trim().toLowerCase();
      const password = String(item.password || "");
      const phone = String(item.phone || "").trim();
      const headline = String(item.profile_headline || "").trim();
      const bio = String(item.bio || "").trim();
      const serviceAreas = strings(item.service_areas);
      const languages = strings(item.languages);
      const poojaSlugs = strings(item.pooja_slugs);
      const portfolioUrls = strings(item.portfolio_urls);
      const startingPrice = Number(item.starting_price_inr ?? 0);
      const maximumPrice = Number(item.max_price_inr ?? startingPrice);
      const yearsExperience = Number(item.years_experience || 0);
      const verificationStatus = item.verification_status === "verified" ? "verified" : "pending";

      if (itemName.length < 2 || phone.replace(/\D/g, "").length < 7 || !headline || !bio || !serviceAreas.length || !languages.length || !poojaSlugs.length) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Name, phone, headline, bio, area, language, and puja are required" });
        continue;
      }
      if ((suppliedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) || phone.replace(/\D/g, "").length > 15 || !["pending", "verified"].includes(String(item.verification_status || ""))) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Email, phone, or marketplace status is invalid" });
        continue;
      }
      if ((loginUsername && !/^[a-z0-9._-]{3,32}$/.test(loginUsername)) || (password && (password.length < 12 || password.length > 72))) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Username or password is invalid" });
        continue;
      }
      if (item.starting_price_inr === undefined || item.starting_price_inr === "" || item.max_price_inr === undefined || item.max_price_inr === "" || !Number.isInteger(yearsExperience) || yearsExperience < 0 || !Number.isFinite(startingPrice) || startingPrice < 0 || !Number.isFinite(maximumPrice) || maximumPrice < startingPrice) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Experience or price range is invalid" });
        continue;
      }

      const internalEmail = suppliedEmail || `${loginUsername || "managed"}.${crypto.randomUUID()}@login.purohithconnect.internal`;
      const { data: emailUser } = suppliedEmail
        ? await service.from("app_users").select("id,role,email").eq("email", suppliedEmail).maybeSingle()
        : { data: null };
      const { data: phoneUsers } = await service.from("app_users").select("id,role,email").eq("phone", phone).limit(2);
      if (phoneUsers && phoneUsers.length > 1) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Phone matches more than one account" });
        continue;
      }
      const phoneUser = phoneUsers?.[0] || null;
      if (emailUser && phoneUser && emailUser.id !== phoneUser.id) {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Email and phone belong to different accounts" });
        continue;
      }
      const existingUser = emailUser || phoneUser;
      if (existingUser && existingUser.role !== "priest") {
        results.push({ row: index + 1, ok: false, name: itemName, error: "Email belongs to a non-priest account" });
        continue;
      }

      let userId = existingUser?.id || "";
      let created = false;
      if (!userId) {
        const { data: authRecord, error: authError } = await service.auth.admin.createUser({
          email: internalEmail,
          ...(password ? { password } : {}),
          email_confirm: true,
          user_metadata: { full_name: itemName, onboarding_source: "super_admin" },
          app_metadata: { role: "priest", managed_profile: true },
        });
        if (authError || !authRecord.user) {
          results.push({ row: index + 1, ok: false, name: itemName, error: authError?.message || "Could not create managed account" });
          continue;
        }
        userId = authRecord.user.id;
        created = true;
      } else if (password) {
        const { error: passwordError } = await service.auth.admin.updateUserById(userId, { password });
        if (passwordError) {
          results.push({ row: index + 1, ok: false, name: itemName, error: passwordError.message });
          continue;
        }
      }

      if (loginUsername) {
        const { error: aliasError } = await service.from("priest_login_aliases").upsert({
          user_id: userId,
          username: loginUsername,
          created_by: caller.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (aliasError) {
          if (created) await service.auth.admin.deleteUser(userId);
          results.push({ row: index + 1, ok: false, name: itemName, error: aliasError.code === "23505" ? "Username is already in use" : aliasError.message });
          continue;
        }
      }

      const now = new Date().toISOString();
      const { error: userError } = await service.from("app_users").upsert({
        id: userId,
        email: suppliedEmail || existingUser?.email || null,
        phone,
        full_name: itemName,
        role: "priest",
        is_active: true,
        updated_at: now,
      }, { onConflict: "id" });
      if (userError) {
        results.push({ row: index + 1, ok: false, name: itemName, error: userError.message });
        continue;
      }

      const { data: oldProfile } = await service.from("priest_profiles").select("photo_url,portfolio_urls").eq("user_id", userId).maybeSingle();
      const { data: profile, error: profileError } = await service.from("priest_profiles").upsert({
        user_id: userId,
        display_name: itemName,
        profile_headline: headline,
        bio,
        years_experience: yearsExperience,
        languages,
        service_areas: serviceAreas,
        primary_service_area: String(item.primary_service_area || serviceAreas[0]).trim(),
        pooja_slugs: poojaSlugs,
        photo_url: String(item.photo_url || "").trim() || oldProfile?.photo_url || null,
        portfolio_urls: portfolioUrls.length ? portfolioUrls : oldProfile?.portfolio_urls || [],
        starting_price_inr: startingPrice,
        max_price_inr: maximumPrice,
        verification_status: verificationStatus,
        onboarding_step: 3,
        submitted_at: now,
        verified_by: verificationStatus === "verified" ? caller.id : null,
        verified_at: verificationStatus === "verified" ? now : null,
        updated_at: now,
      }, { onConflict: "user_id" }).select("id,slug").single();
      if (profileError || !profile) {
        results.push({ row: index + 1, ok: false, name: itemName, error: profileError?.message || "Could not save profile" });
        continue;
      }

      const services = poojaSlugs.map((poojaSlug) => ({
        priest_id: profile.id,
        pooja_slug: poojaSlug,
        price_paise: Math.max(startingPrice, 1) * 100,
        is_active: true,
        updated_at: now,
      }));
      const { error: servicesError } = await service.from("priest_services").upsert(services, { onConflict: "priest_id,pooja_slug" });
      if (servicesError) {
        results.push({ row: index + 1, ok: false, name: itemName, error: servicesError.message });
        continue;
      }
      results.push({ row: index + 1, ok: true, name: itemName, priest_profile_id: profile.id, slug: profile.slug, created, login_username: loginUsername || null, login_email: suppliedEmail || null });
    }

    const succeeded = results.filter((result) => result.ok).length;
    const failed = results.length - succeeded;
    await service.from("admin_actions").insert({
      actor_id: caller.id,
      action: "bulk_onboard_priests",
      target_type: "priest_profile_batch",
      target_id: crypto.randomUUID(),
      note: `${succeeded} Purohits onboarded, ${failed} failed`,
      metadata: { total: results.length, succeeded, failed },
    });
    return json({ ok: failed === 0, total: results.length, succeeded, failed, results });
  }

  if (!email.includes("@") || !["customer", "priest", "support", "admin"].includes(role)) return json({ error: "Invalid invitation" }, 400);
  if (role === "admin" && caller.role !== "super_admin") return json({ error: "Only a super admin can invite administrators" }, 403);

  if (action === "onboard_priest") {
    if (caller.role !== "super_admin") return json({ error: "Only a super admin can onboard Purohits" }, 403);
    const serviceAreas = strings(body.service_areas);
    const languages = strings(body.languages);
    const poojaSlugs = strings(body.pooja_slugs);
    const portfolioUrls = strings(body.portfolio_urls);
    const yearsExperience = Number(body.years_experience || 0);
    const startingPrice = Number(body.starting_price_inr || 0);
    const maximumPrice = Number(body.max_price_inr || startingPrice);
    const verificationStatus = body.verification_status === "verified" ? "verified" : "pending";
    if (fullName.length < 2 || !serviceAreas.length || !languages.length || !poojaSlugs.length) {
      return json({ error: "Name, service area, language, and at least one puja are required" }, 400);
    }
    if (!Number.isInteger(yearsExperience) || yearsExperience < 0 || startingPrice < 0 || maximumPrice < startingPrice) {
      return json({ error: "Experience or price range is invalid" }, 400);
    }

    const { data: existingUser } = await service.from("app_users").select("id").eq("email", email).maybeSingle();
    let userId = existingUser?.id || "";
    let invitationSent = false;
    if (!userId) {
      const { data: record, error: recordError } = await service.from("admin_user_invites")
        .insert({ email, full_name: fullName, role: "priest", invited_by: caller.id })
        .select("id").single();
      if (recordError) return json({ error: recordError.message }, 409);

      const redirectTo = `${req.headers.get("origin") || "https://purohith-connect.vercel.app"}/auth/callback`;
      const { data: invite, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName, role: "priest", requested_role: "priest", onboarding_required: false },
      });
      if (inviteError || !invite.user) {
        await service.from("admin_user_invites").update({ status: "failed", error_message: inviteError?.message || "Invite failed", updated_at: new Date().toISOString() }).eq("id", record.id);
        return json({ error: inviteError?.message || "Invite failed" }, 400);
      }
      userId = invite.user.id;
      invitationSent = true;
      await service.from("admin_user_invites").update({ status: "sent", invited_user_id: userId, updated_at: new Date().toISOString() }).eq("id", record.id);
    }

    const now = new Date().toISOString();
    const { error: userError } = await service.from("app_users").upsert({
      id: userId, email, phone: String(body.phone || "").trim() || null, full_name: fullName,
      role: "priest", is_active: true, updated_at: now,
    }, { onConflict: "id" });
    if (userError) return json({ error: userError.message }, 400);

    const profilePayload = {
      user_id: userId,
      display_name: fullName,
      profile_headline: String(body.profile_headline || "").trim(),
      bio: String(body.bio || "").trim(),
      years_experience: yearsExperience,
      languages,
      service_areas: serviceAreas,
      primary_service_area: String(body.primary_service_area || serviceAreas[0]).trim(),
      pooja_slugs: poojaSlugs,
      photo_url: String(body.photo_url || "").trim() || null,
      portfolio_urls: portfolioUrls,
      starting_price_inr: startingPrice,
      max_price_inr: maximumPrice,
      verification_status: verificationStatus,
      onboarding_step: 3,
      submitted_at: now,
      verified_by: verificationStatus === "verified" ? caller.id : null,
      verified_at: verificationStatus === "verified" ? now : null,
      updated_at: now,
    };
    const { data: profile, error: profileError } = await service.from("priest_profiles")
      .upsert(profilePayload, { onConflict: "user_id" }).select("id,slug").single();
    if (profileError) return json({ error: profileError.message }, 400);

    const services = poojaSlugs.map((poojaSlug) => ({
      priest_id: profile.id,
      pooja_slug: poojaSlug,
      price_paise: Math.max(startingPrice, 1) * 100,
      is_active: true,
      updated_at: now,
    }));
    const { error: servicesError } = await service.from("priest_services").upsert(services, { onConflict: "priest_id,pooja_slug" });
    if (servicesError) return json({ error: servicesError.message }, 400);

    await service.from("admin_actions").insert({
      actor_id: caller.id,
      action: "onboard_priest",
      target_type: "priest_profile",
      target_id: profile.id,
      note: `${fullName} onboarded from the super-admin console`,
      metadata: { email, verification_status: verificationStatus, invitation_sent: invitationSent },
    });
    return json({ ok: true, user_id: userId, priest_profile_id: profile.id, slug: profile.slug, invitation_sent: invitationSent });
  }

  const { data: record, error: recordError } = await service.from("admin_user_invites").insert({ email, full_name: fullName, role, invited_by: caller.id }).select("id").single();
  if (recordError) return json({ error: recordError.message }, 409);
  const redirectTo = `${req.headers.get("origin") || "https://purohith-connect.vercel.app"}/auth/callback`;
  const { data: invite, error } = await service.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: fullName, requested_role: role } });
  if (error || !invite.user) {
    await service.from("admin_user_invites").update({ status: "failed", error_message: error?.message || "Invite failed", updated_at: new Date().toISOString() }).eq("id", record.id);
    return json({ error: error?.message || "Invite failed" }, 400);
  }
  await service.from("app_users").upsert({ id: invite.user.id, email, full_name: fullName, role, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (role === "priest") await service.from("priest_profiles").upsert({ user_id: invite.user.id, display_name: fullName || email.split("@")[0], verification_status: "draft", onboarding_step: 0 }, { onConflict: "user_id" });
  await Promise.all([
    service.from("admin_user_invites").update({ status: "sent", invited_user_id: invite.user.id, updated_at: new Date().toISOString() }).eq("id", record.id),
    service.from("admin_actions").insert({ actor_id: caller.id, action: "invite", target_type: "app_user", target_id: invite.user.id, note: `${role} invite sent to ${email}` }),
  ]);
  return json({ ok: true, user_id: invite.user.id });
});
