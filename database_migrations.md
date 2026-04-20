-- # Supabase Database Migration & Function Scripts
--
-- ## **MASTER SCRIPT V116: CONSOLIDATED SCRIPT**
-- ---
-- This is the complete and up-to-date master script for the application. It includes all necessary tables, functions, and policies for every feature.
--
-- ### INSTRUCTIONS:
-- 1.  Copy the **ENTIRE** "MASTER CONSOLIDATED SCRIPT V116" block below.
-- 2.  Paste it into your Supabase SQL Editor and run it.
-- 3.  This script is idempotent, meaning it is safe to run multiple times.
--
-- ### Key Features Covered by this Script:
-- - **Column Sync Fix (V116 Update)**: Explicitly adds `role` and `tier` to existing `users` table to prevent "column does not exist" errors.
-- - **Storage Fix (V115 Update)**: Explicitly drops storage policies during cleanup to prevent "dependency" errors.
-- - **AI Insight Undo (V114 Update)**: Adds `previous_content` to `ai_insights` to allow reverting manual edits.
-- - **ROI Data Upload (V113 Update)**: Adds a new `upload_roi_analytics_batch` function.
---
-- ## MASTER CONSOLIDATED SCRIPT V116
---

-- == STEP 1: CLEANUP ==

-- Explicitly drop storage policies first to clear dependencies on functions
DROP POLICY IF EXISTS "Manage Promotions" ON storage.objects;
DROP POLICY IF EXISTS "Admins and Editors can manage banner images" ON storage.objects;
DROP POLICY IF EXISTS "Manage Cluster/Event Images" ON storage.objects;
DROP POLICY IF EXISTS "Manage Grant Reports" ON storage.objects;
DROP POLICY IF EXISTS "Manage Product Images" ON storage.objects;
DROP POLICY IF EXISTS "View Public Images" ON storage.objects;
DROP POLICY IF EXISTS "View Grant Reports" ON storage.objects;
DROP POLICY IF EXISTS "Upload Grant Reports" ON storage.objects;
DROP POLICY IF EXISTS "Update Grant Reports" ON storage.objects;
DROP POLICY IF EXISTS "Delete Grant Reports" ON storage.objects;
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Admins Manage" ON storage.objects;
DROP POLICY IF EXISTS "Owners Manage" ON storage.objects;

DO $$
DECLARE
    table_name_var TEXT;
    policy_record RECORD;
BEGIN
    FOREACH table_name_var IN ARRAY ARRAY['clusters', 'cluster_reviews', 'events', 'grant_applications', 'notifications', 'promotions', 'public_holidays', 'users', 'cluster_analytics', 'app_config', 'visitor_analytics', 'cluster_products', 'ai_insights', 'feedback', 'event_analytics', 'search_queries', 'itineraries', 'itinerary_items', 'website_traffic_analytics', 'roi_analytics']
    LOOP
        FOR policy_record IN
            SELECT policyname FROM pg_policies WHERE tablename = table_name_var AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.' || quote_ident(table_name_var) || ';';
        END LOOP;
    END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin_or_editor() CASCADE; 
DROP FUNCTION IF EXISTS public.increment_cluster_view(uuid);
DROP FUNCTION IF EXISTS public.increment_cluster_click(uuid);
DROP FUNCTION IF EXISTS public.get_daily_cluster_analytics(uuid, integer);
DROP FUNCTION IF EXISTS public.submit_report(text, jsonb, text);
DROP FUNCTION IF EXISTS public.handle_grant_offer_response(text, boolean);
DROP FUNCTION IF EXISTS public.admin_reject_application(text, text);
DROP FUNCTION IF EXISTS public.admin_make_conditional_offer(text, text, numeric);
DROP FUNCTION IF EXISTS public.admin_approve_early_report(text, numeric, text);
DROP FUNCTION IF EXISTS public.admin_reject_early_report(text, text);
DROP FUNCTION IF EXISTS public.admin_reject_final_report(text, text);
DROP FUNCTION IF EXISTS public.admin_complete_application(text, numeric, text);
DROP FUNCTION IF EXISTS public.mark_notifications_cleared_by_user(text[]);
DROP FUNCTION IF EXISTS public.transfer_cluster_ownership(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_notification_to_all_users(text);
DROP FUNCTION IF EXISTS public.delete_own_user_account();
DROP FUNCTION IF EXISTS public.upload_visitor_analytics_batch(jsonb);
DROP FUNCTION IF EXISTS public.upload_roi_analytics_batch(jsonb);
DROP FUNCTION IF EXISTS public.log_page_view(text, uuid);
DROP FUNCTION IF EXISTS public.get_website_traffic_summary(integer);
DROP FUNCTION IF EXISTS public.get_public_total_visits();

-- == STEP 2: TYPES AND TABLES ==
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('Admin', 'Editor', 'User', 'Tourism Player');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.grant_application_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Conditional Offer', 'Early Report Required', 'Early Report Submitted', 'Final Report Required', 'Final Report Submitted', 'Complete');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM ('new_app', 'resubmission', 'submission_confirm', 'auto_rejection', 'status_change');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.user_tier AS ENUM ('Normal', 'Premium');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_status AS ENUM ('new', 'seen', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.itinerary_item_type AS ENUM ('cluster', 'event');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2.1 Users Table and Column verification
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- Crucial V116 Fix: Ensure columns exist before functions reference them
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'User';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier public.user_tier NOT NULL DEFAULT 'Normal';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS public.clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT[] NOT NULL DEFAULT '{}',
    timing TEXT NOT NULL,
    image TEXT NOT NULL,
    is_preferred BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    latitude FLOAT8,
    longitude FLOAT8,
    average_rating FLOAT4 DEFAULT 0 NOT NULL,
    review_count INTEGER DEFAULT 0 NOT NULL,
    display_address TEXT,
    view_count INTEGER DEFAULT 0 NOT NULL,
    click_count INTEGER DEFAULT 0 NOT NULL,
    is_hidden BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cluster_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location_name TEXT NOT NULL,
    latitude FLOAT8,
    longitude FLOAT8,
    category TEXT NOT NULL,
    image_url TEXT,
    organizer TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    display_address TEXT,
    marker_color TEXT,
    contact_info TEXT
);

CREATE TABLE IF NOT EXISTS public.grant_applications (
    id TEXT PRIMARY KEY,
    applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    email TEXT NOT NULL,
    contact_number TEXT,
    grant_category_id TEXT NOT NULL,
    primary_creative_category_id TEXT,
    creative_sub_category_id TEXT,
    project_name TEXT NOT NULL,
    project_description TEXT NOT NULL,
    program_start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_requested NUMERIC NOT NULL,
    submission_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_update_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    notes TEXT,
    status_history JSONB DEFAULT '[]'::jsonb NOT NULL,
    resubmitted_from_id TEXT,
    amount_approved NUMERIC,
    initial_disbursement_amount NUMERIC,
    early_report_rejection_count INTEGER DEFAULT 0,
    status public.grant_application_status NOT NULL DEFAULT 'Pending',
    resubmission_count INTEGER DEFAULT 0 NOT NULL,
    early_report_files JSONB DEFAULT '[]'::jsonb NOT NULL,
    final_report_files JSONB DEFAULT '[]'::jsonb NOT NULL,
    final_report_rejection_count INTEGER DEFAULT 0,
    final_disbursement_amount NUMERIC
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    recipient_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    related_application_id TEXT,
    type public.notification_type NOT NULL DEFAULT 'status_change',
    cleared_by UUID[] DEFAULT '{}',
    read_by UUID[] DEFAULT '{}',
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    cta_text TEXT NOT NULL,
    cta_link TEXT,
    requires_auth BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.public_holidays (
    date DATE PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.cluster_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    view_name TEXT NOT NULL,
    filter_key TEXT NOT NULL,
    content TEXT NOT NULL,
    previous_content TEXT,
    data_last_updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_insights_view_filter_unique_idx ON public.ai_insights (view_name, filter_key);

CREATE TABLE IF NOT EXISTS public.visitor_analytics (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
    country TEXT NOT NULL,
    visitor_type TEXT NOT NULL CHECK (visitor_type IN ('International', 'Domestic')),
    count INTEGER NOT NULL,
    CONSTRAINT visitor_analytics_unique UNIQUE (year, month, country, visitor_type)
);

CREATE TABLE IF NOT EXISTS public.roi_analytics (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    year INTEGER NOT NULL UNIQUE,
    revenue NUMERIC NOT NULL,
    income NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS public.website_traffic_analytics (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    page_path TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    status public.feedback_status DEFAULT 'new' NOT NULL,
    page_context TEXT
);

CREATE TABLE IF NOT EXISTS public.cluster_analytics (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('view', 'click'))
);

CREATE TABLE IF NOT EXISTS public.itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type public.itinerary_item_type NOT NULL,
    item_name TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT itinerary_item_unique UNIQUE (itinerary_id, item_id, item_type)
);

-- == STEP 3: FUNCTIONS ==
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, avatar, tier)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email, (new.raw_user_meta_data->>'role')::public.user_role, substring(new.raw_user_meta_data->>'name' from 1 for 1), 'Normal');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin_or_editor() RETURNS boolean AS $$
BEGIN
  RETURN (auth.role() = 'authenticated' AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin', 'Editor'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_cluster_view(cluster_id_to_increment uuid) RETURNS void AS $$
BEGIN
  IF (SELECT owner_id FROM public.clusters WHERE id = cluster_id_to_increment) IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.cluster_analytics (cluster_id, type) VALUES (cluster_id_to_increment, 'view');
    UPDATE public.clusters SET view_count = view_count + 1 WHERE id = cluster_id_to_increment;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_cluster_click(cluster_id_to_increment uuid) RETURNS void AS $$
BEGIN
  IF (SELECT owner_id FROM public.clusters WHERE id = cluster_id_to_increment) IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.cluster_analytics (cluster_id, type) VALUES (cluster_id_to_increment, 'click');
    UPDATE public.clusters SET click_count = click_count + 1 WHERE id = cluster_id_to_increment;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_daily_cluster_analytics(p_cluster_id uuid, p_period_days integer)
RETURNS TABLE(date text, views bigint, clicks bigint) AS $$
BEGIN
  RETURN QUERY WITH ds AS (SELECT generate_series((now() - (p_period_days - 1) * interval '1 day')::date, now()::date, '1 day'::interval)::date AS d),
  ad AS (SELECT created_at::date AS d, type, COUNT(*) AS count FROM public.cluster_analytics WHERE cluster_id = p_cluster_id AND created_at >= (now() - (p_period_days - 1) * interval '1 day')::date GROUP BY 1, 2)
  SELECT to_char(ds.d, 'YYYY-MM-DD'), COALESCE(SUM(ad.count) FILTER (WHERE ad.type = 'view'), 0)::bigint, COALESCE(SUM(ad.count) FILTER (WHERE ad.type = 'click'), 0)::bigint
  FROM ds LEFT JOIN ad ON ds.d = ad.d GROUP BY ds.d ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_page_view(p_page_path text, p_session_id uuid) RETURNS void AS $$
BEGIN INSERT INTO public.website_traffic_analytics (page_path, user_id, session_id) VALUES (p_page_path, auth.uid(), p_session_id); END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_public_total_visits() RETURNS bigint AS $$ SELECT count(*) FROM public.website_traffic_analytics; $$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_public_total_visits() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_website_traffic_summary(p_period_days integer) RETURNS jsonb AS $$
DECLARE v_start timestamptz := now() - (p_period_days || ' days')::interval; v_tot bigint; v_uniq bigint; v_bounce numeric; v_trend jsonb;
BEGIN
  IF NOT public.is_admin_or_editor() THEN RAISE EXCEPTION 'Denied'; END IF;
  SELECT COUNT(*), COUNT(DISTINCT session_id) INTO v_tot, v_uniq FROM public.website_traffic_analytics WHERE created_at >= v_start;
  WITH sc AS (SELECT session_id, COUNT(*) as c FROM public.website_traffic_analytics WHERE created_at >= v_start GROUP BY session_id)
  SELECT (COUNT(*) FILTER (WHERE c = 1)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100 INTO v_bounce FROM sc;
  WITH ds AS (SELECT generate_series(v_start::date, now()::date, '1 day'::interval)::date AS d),
  dd AS (SELECT created_at::date as d, COUNT(*) as v FROM public.website_traffic_analytics WHERE created_at >= v_start GROUP BY 1)
  SELECT jsonb_agg(jsonb_build_object('date', to_char(ds.d, 'YYYY-MM-DD'), 'visits', COALESCE(dd.v, 0))) INTO v_trend FROM ds LEFT JOIN dd ON ds.d = dd.d;
  RETURN jsonb_build_object('total_visits', v_tot, 'unique_visitors', v_uniq, 'bounce_rate', COALESCE(v_bounce, 0), 'daily_trend', v_trend);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_reviews_with_usernames(p_cluster_id uuid)
RETURNS TABLE (id uuid, cluster_id uuid, user_id uuid, user_name text, rating integer, comment text, created_at timestamptz) AS $$
  SELECT cr.id, cr.cluster_id, cr.user_id, u.name, cr.rating, cr.comment, cr.created_at FROM public.cluster_reviews cr JOIN public.users u ON cr.user_id = u.id WHERE cr.cluster_id = p_cluster_id ORDER BY cr.created_at DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.transfer_cluster_ownership(p_cluster_id uuid, p_new_owner_id uuid) RETURNS void AS $$
BEGIN
  IF auth.uid() = (SELECT owner_id FROM public.clusters WHERE id = p_cluster_id) OR public.is_admin_or_editor() THEN
    UPDATE public.clusters SET owner_id = p_new_owner_id WHERE id = p_cluster_id;
    UPDATE public.cluster_products SET owner_id = p_new_owner_id WHERE cluster_id = p_cluster_id;
  ELSE RAISE EXCEPTION 'Denied'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.send_notification_to_all_users(p_message text) RETURNS void AS $$
BEGIN
  IF public.is_admin_or_editor() THEN
    INSERT INTO public.notifications (recipient_id, message, type) SELECT id::text, p_message, 'status_change' FROM public.users;
  ELSE RAISE EXCEPTION 'Denied'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.submit_report(p_application_id text, p_report_file jsonb, p_report_type text) RETURNS void AS $$
DECLARE v_name TEXT; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT project_name INTO v_proj FROM public.grant_applications WHERE id = p_application_id;
  IF p_report_type = 'early' THEN
    UPDATE public.grant_applications SET status = 'Early Report Submitted', early_report_files = early_report_files || p_report_file, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Early Report Submitted', 'timestamp', now(), 'notes', 'Early report submitted.', 'changed_by', v_name) WHERE id = p_application_id;
  ELSE
    UPDATE public.grant_applications SET status = 'Final Report Submitted', final_report_files = final_report_files || p_report_file, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Final Report Submitted', 'timestamp', now(), 'notes', 'Final report submitted.', 'changed_by', v_name) WHERE id = p_application_id;
  END IF;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES ('grant_admins', 'Report submitted for ' || v_proj, p_application_id, 'submission_confirm');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_grant_offer_response(p_application_id text, p_accepted boolean) RETURNS void AS $$
DECLARE v_name TEXT; v_proj TEXT; v_stat grant_application_status;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT project_name INTO v_proj FROM public.grant_applications WHERE id = p_application_id;
  v_stat := CASE WHEN p_accepted THEN 'Early Report Required' ELSE 'Rejected' END;
  UPDATE public.grant_applications SET status = v_stat, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', v_stat, 'timestamp', now(), 'notes', 'Offer ' || CASE WHEN p_accepted THEN 'accepted' ELSE 'declined' END, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES ('grant_admins', 'Offer ' || CASE WHEN p_accepted THEN 'accepted' ELSE 'declined' END || ' for ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_application(p_application_id text, p_notes text) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Rejected', notes = p_notes, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Rejected', 'timestamp', now(), 'notes', p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Application rejected: ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_make_conditional_offer(p_application_id text, p_notes text, p_amount_approved numeric) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Conditional Offer', notes = p_notes, amount_approved = p_amount_approved, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Conditional Offer', 'timestamp', now(), 'notes', p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Conditional offer for ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_approve_early_report(p_application_id text, p_amount numeric, p_notes text) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Final Report Required', initial_disbursement_amount = p_amount, notes = p_notes, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Final Report Required', 'timestamp', now(), 'notes', p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Early report approved: ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_early_report(p_application_id text, p_notes text) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Early Report Required', early_report_rejection_count = coalesce(early_report_rejection_count, 0) + 1, notes = p_notes, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Early Report Required', 'timestamp', now(), 'notes', 'Rejected: ' || p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Early report rejected: ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_final_report(p_application_id text, p_notes text) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Final Report Required', final_report_rejection_count = coalesce(final_report_rejection_count, 0) + 1, notes = p_notes, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Final Report Required', 'timestamp', now(), 'notes', 'Rejected: ' || p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Final report rejected: ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_complete_application(p_application_id text, p_amount numeric, p_notes text) RETURNS void AS $$
DECLARE v_name TEXT; v_aid UUID; v_proj TEXT;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  SELECT applicant_id, project_name INTO v_aid, v_proj FROM public.grant_applications WHERE id = p_application_id;
  UPDATE public.grant_applications SET status = 'Complete', final_disbursement_amount = p_amount, notes = p_notes, last_update_timestamp = now(), status_history = status_history || jsonb_build_object('status', 'Complete', 'timestamp', now(), 'notes', p_notes, 'changed_by', v_name) WHERE id = p_application_id;
  INSERT INTO public.notifications (recipient_id, message, related_application_id, type) VALUES (v_aid::text, 'Grant completed: ' || v_proj, p_application_id, 'status_change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_notifications_cleared_by_user(p_ids text[]) RETURNS void AS $$
BEGIN UPDATE public.notifications SET cleared_by = array_append(coalesce(cleared_by, '{}'::uuid[]), auth.uid()) WHERE id::text = ANY(p_ids); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_own_user_account() RETURNS void AS $$ BEGIN DELETE FROM auth.users WHERE id = auth.uid(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upload_visitor_analytics_batch(p_data jsonb) RETURNS void AS $$
DECLARE item jsonb;
BEGIN
  IF NOT public.is_admin_or_editor() THEN RAISE EXCEPTION 'Denied'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_data) LOOP
    INSERT INTO public.visitor_analytics (year, month, country, visitor_type, count) VALUES ((item->>'year')::smallint, (item->>'month')::smallint, item->>'country', item->>'visitor_type', (item->>'count')::integer)
    ON CONFLICT (year, month, country, visitor_type) DO UPDATE SET count = EXCLUDED.count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upload_roi_analytics_batch(p_data jsonb) RETURNS void AS $$
DECLARE item jsonb;
BEGIN
  IF NOT public.is_admin_or_editor() THEN RAISE EXCEPTION 'Denied'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_data) LOOP
    INSERT INTO public.roi_analytics (year, revenue, income) VALUES ((item->>'year')::integer, (item->>'revenue')::numeric, (item->>'income')::numeric)
    ON CONFLICT (year) DO UPDATE SET revenue = EXCLUDED.revenue, income = EXCLUDED.income;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_itinerary_item(p_itinerary_id uuid, p_item_id uuid, p_item_type public.itinerary_item_type, p_item_name text) RETURNS public.itinerary_items AS $$
DECLARE new_item public.itinerary_items;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.itineraries WHERE id = p_itinerary_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Denied'; END IF;
  INSERT INTO public.itinerary_items (itinerary_id, item_id, item_type, item_name) VALUES (p_itinerary_id, p_item_id, p_item_type, p_item_name) RETURNING * INTO new_item;
  RETURN new_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- == STEP 4: RLS POLICIES ==
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View All Clusters" ON public.clusters FOR SELECT USING (public.is_admin_or_editor() OR is_hidden = false);
CREATE POLICY "Manage Clusters" ON public.clusters FOR ALL USING (public.is_admin_or_editor() OR auth.uid() = owner_id);

ALTER TABLE public.cluster_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews Public Select" ON public.cluster_reviews FOR SELECT USING (true);
CREATE POLICY "Reviews Insert" ON public.cluster_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Reviews Manage" ON public.cluster_reviews FOR ALL USING (auth.uid() = user_id OR public.is_admin_or_editor());

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events Public" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events Insert" ON public.events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Events Manage" ON public.events FOR ALL USING (public.is_admin_or_editor() OR auth.uid() = created_by);

ALTER TABLE public.grant_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Grants Admin" ON public.grant_applications FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');
CREATE POLICY "Grants User" ON public.grant_applications FOR ALL USING (auth.uid() = applicant_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notif Select" ON public.notifications FOR SELECT USING (recipient_id = 'global_banner' OR recipient_id = auth.uid()::text OR (recipient_id = 'admins' AND public.is_admin_or_editor()));
CREATE POLICY "Notif Update" ON public.notifications FOR UPDATE USING (recipient_id = auth.uid()::text OR recipient_id = 'admins' OR recipient_id = 'global_banner');

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users Select" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users Update" ON public.users FOR UPDATE USING (auth.uid() = id OR public.is_admin_or_editor());

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promo Select" ON public.promotions FOR SELECT USING (is_active = true OR public.is_admin_or_editor());
CREATE POLICY "Promo Manage" ON public.promotions FOR ALL USING (public.is_admin_or_editor());

ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitor Select" ON public.visitor_analytics FOR SELECT USING (true);
CREATE POLICY "Visitor Manage" ON public.visitor_analytics FOR ALL USING (public.is_admin_or_editor());

ALTER TABLE public.roi_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ROI Select" ON public.roi_analytics FOR SELECT USING (true);
CREATE POLICY "ROI Manage" ON public.roi_analytics FOR ALL USING (public.is_admin_or_editor());

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config Select" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Config Manage" ON public.app_config FOR ALL USING (public.is_admin_or_editor());

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Itinerary Manage" ON public.itineraries FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Itinerary Items Manage" ON public.itinerary_items FOR ALL USING (auth.uid() = (SELECT user_id FROM public.itineraries WHERE id = itinerary_id));

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insights Select" ON public.ai_insights FOR SELECT USING (true);
CREATE POLICY "Insights Manage" ON public.ai_insights FOR ALL USING (public.is_admin_or_editor());

ALTER TABLE public.website_traffic_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Traffic Insert" ON public.website_traffic_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Traffic View" ON public.website_traffic_analytics FOR SELECT USING (public.is_admin_or_editor());

-- == STEP 5: STORAGE ==
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id IN ('promotion-images', 'cluster-images', 'event-images', 'banner-images', 'product-images', 'documents'));
CREATE POLICY "Admins Manage" ON storage.objects FOR ALL USING (bucket_id IN ('promotion-images', 'banner-images', 'documents') AND public.is_admin_or_editor());
CREATE POLICY "Owners Manage" ON storage.objects FOR ALL USING (bucket_id IN ('cluster-images', 'event-images', 'product-images', 'grant-early-report-files', 'grant-final-report-files') AND (auth.uid() = (storage.foldername(name))[1]::uuid OR public.is_admin_or_editor()));
