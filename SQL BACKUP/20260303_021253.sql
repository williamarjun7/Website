--
-- PostgreSQL database dump
--

\restrict VxXYZqtFMfbc8NIn62QPjDwcpac8Pw34gIi2yszLgQfKzcTSeTx4RcdI2k3LsSE

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 18.1 (Debian 18.1-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS create_policies_on_table_create;
DROP EVENT TRIGGER IF EXISTS create_policies_on_rls_enable;
DROP POLICY IF EXISTS project_admin_policy ON auth.users;
DROP POLICY IF EXISTS "Users can update own profile" ON auth.users;
DROP POLICY IF EXISTS "Public can view user profiles" ON auth.users;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_bucket_fkey;
ALTER TABLE IF EXISTS ONLY schedules.job_logs DROP CONSTRAINT IF EXISTS job_logs_job_id_fkey;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
ALTER TABLE IF EXISTS ONLY public.room_images DROP CONSTRAINT IF EXISTS room_images_room_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cafe_menu_items DROP CONSTRAINT IF EXISTS cafe_menu_items_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;
ALTER TABLE IF EXISTS ONLY public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_room_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.user_providers DROP CONSTRAINT IF EXISTS user_providers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_configs DROP CONSTRAINT IF EXISTS oauth_configs_secret_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.user_providers DROP CONSTRAINT IF EXISTS _account_user_id_fkey;
ALTER TABLE IF EXISTS ONLY ai.usage DROP CONSTRAINT IF EXISTS usage_config_id_fkey;
DROP TRIGGER IF EXISTS update_system_deployments_updated_at ON system.deployments;
DROP TRIGGER IF EXISTS update_secrets_updated_at ON system.secrets;
DROP TRIGGER IF EXISTS update_audit_logs_updated_at ON system.audit_logs;
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON schedules.jobs;
DROP TRIGGER IF EXISTS update_channels_updated_at ON realtime.channels;
DROP TRIGGER IF EXISTS trg_message_notify ON realtime.messages;
DROP TRIGGER IF EXISTS order_status_realtime ON public.orders;
DROP TRIGGER IF EXISTS order_new_realtime ON public.orders;
DROP TRIGGER IF EXISTS update_definitions_updated_at ON functions.definitions;
DROP TRIGGER IF EXISTS update_oauth_configs_updated_at ON auth.oauth_configs;
DROP TRIGGER IF EXISTS update_email_otps_updated_at ON auth.email_otps;
DROP TRIGGER IF EXISTS update_configs_updated_at ON auth.configs;
DROP INDEX IF EXISTS system.idx_secrets_name;
DROP INDEX IF EXISTS system.idx_mcp_usage_created_at;
DROP INDEX IF EXISTS system.idx_deployments_status;
DROP INDEX IF EXISTS system.idx_deployments_provider;
DROP INDEX IF EXISTS system.idx_deployments_created_at;
DROP INDEX IF EXISTS system.idx_audit_logs_module;
DROP INDEX IF EXISTS system.idx_audit_logs_created_at;
DROP INDEX IF EXISTS system.idx_audit_logs_actor;
DROP INDEX IF EXISTS storage.idx_storage_uploaded_by;
DROP INDEX IF EXISTS schedules.idx_jobs_is_active;
DROP INDEX IF EXISTS schedules.idx_jobs_cron_job_id;
DROP INDEX IF EXISTS schedules.idx_job_logs_job_id;
DROP INDEX IF EXISTS schedules.idx_job_logs_executed_at;
DROP INDEX IF EXISTS realtime.idx_realtime_messages_sender;
DROP INDEX IF EXISTS realtime.idx_realtime_messages_event_name;
DROP INDEX IF EXISTS realtime.idx_realtime_messages_created_at;
DROP INDEX IF EXISTS realtime.idx_realtime_messages_channel_name;
DROP INDEX IF EXISTS realtime.idx_realtime_messages_channel_id;
DROP INDEX IF EXISTS realtime.idx_realtime_channels_pattern;
DROP INDEX IF EXISTS realtime.idx_realtime_channels_enabled;
DROP INDEX IF EXISTS public.idx_room_images_room;
DROP INDEX IF EXISTS public.idx_menu_items_category;
DROP INDEX IF EXISTS public.idx_bookings_status;
DROP INDEX IF EXISTS public.idx_bookings_room_dates;
DROP INDEX IF EXISTS public.idx_blocked_dates_room;
DROP INDEX IF EXISTS functions.idx_function_deployments_status;
DROP INDEX IF EXISTS functions.idx_function_deployments_created;
DROP INDEX IF EXISTS auth.idx_oauth_configs_provider;
DROP INDEX IF EXISTS auth.idx_email_otps_otp_hash;
DROP INDEX IF EXISTS auth.idx_email_otps_expires_at;
DROP INDEX IF EXISTS auth.idx_email_otps_email_purpose;
DROP INDEX IF EXISTS auth.idx_auth_configs_singleton;
DROP INDEX IF EXISTS ai.idx_ai_usage_model_id;
DROP INDEX IF EXISTS ai.idx_ai_usage_created_at;
DROP INDEX IF EXISTS ai.idx_ai_usage_config_id;
DROP INDEX IF EXISTS ai.idx_ai_configs_output_modality;
DROP INDEX IF EXISTS ai.idx_ai_configs_input_modality;
ALTER TABLE IF EXISTS ONLY system.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY system.deployments DROP CONSTRAINT IF EXISTS deployments_provider_deployment_id_key;
ALTER TABLE IF EXISTS ONLY system.deployments DROP CONSTRAINT IF EXISTS deployments_pkey;
ALTER TABLE IF EXISTS ONLY system.secrets DROP CONSTRAINT IF EXISTS _secrets_pkey;
ALTER TABLE IF EXISTS ONLY system.secrets DROP CONSTRAINT IF EXISTS _secrets_name_key;
ALTER TABLE IF EXISTS ONLY system.mcp_usage DROP CONSTRAINT IF EXISTS _mcp_usage_pkey;
ALTER TABLE IF EXISTS ONLY system.audit_logs DROP CONSTRAINT IF EXISTS _audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS _storage_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS _storage_buckets_pkey;
ALTER TABLE IF EXISTS ONLY schedules.jobs DROP CONSTRAINT IF EXISTS jobs_pkey;
ALTER TABLE IF EXISTS ONLY schedules.job_logs DROP CONSTRAINT IF EXISTS job_logs_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY realtime.channels DROP CONSTRAINT IF EXISTS channels_pkey;
ALTER TABLE IF EXISTS ONLY realtime.channels DROP CONSTRAINT IF EXISTS channels_pattern_key;
ALTER TABLE IF EXISTS ONLY public.site_images DROP CONSTRAINT IF EXISTS site_images_pkey;
ALTER TABLE IF EXISTS ONLY public.site_content DROP CONSTRAINT IF EXISTS site_content_pkey;
ALTER TABLE IF EXISTS ONLY public.site_content DROP CONSTRAINT IF EXISTS site_content_key_key;
ALTER TABLE IF EXISTS ONLY public.rooms DROP CONSTRAINT IF EXISTS rooms_pkey;
ALTER TABLE IF EXISTS ONLY public.room_images DROP CONSTRAINT IF EXISTS room_images_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_slug_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.cafe_menu_items DROP CONSTRAINT IF EXISTS cafe_menu_items_pkey;
ALTER TABLE IF EXISTS ONLY public.cafe_menu_categories DROP CONSTRAINT IF EXISTS cafe_menu_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_email_key;
ALTER TABLE IF EXISTS ONLY functions.deployments DROP CONSTRAINT IF EXISTS deployments_pkey;
ALTER TABLE IF EXISTS ONLY functions.definitions DROP CONSTRAINT IF EXISTS _edge_functions_slug_key;
ALTER TABLE IF EXISTS ONLY functions.definitions DROP CONSTRAINT IF EXISTS _edge_functions_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS _user_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS _user_email_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_configs DROP CONSTRAINT IF EXISTS _oauth_configs_provider_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_configs DROP CONSTRAINT IF EXISTS _oauth_configs_pkey;
ALTER TABLE IF EXISTS ONLY auth.email_otps DROP CONSTRAINT IF EXISTS _email_otps_pkey;
ALTER TABLE IF EXISTS ONLY auth.email_otps DROP CONSTRAINT IF EXISTS _email_otps_email_purpose_key;
ALTER TABLE IF EXISTS ONLY auth.configs DROP CONSTRAINT IF EXISTS _auth_configs_pkey;
ALTER TABLE IF EXISTS ONLY auth.user_providers DROP CONSTRAINT IF EXISTS _account_provider_provider_account_id_key;
ALTER TABLE IF EXISTS ONLY auth.user_providers DROP CONSTRAINT IF EXISTS _account_pkey;
ALTER TABLE IF EXISTS ONLY ai.usage DROP CONSTRAINT IF EXISTS _ai_usage_pkey;
ALTER TABLE IF EXISTS ONLY ai.configs DROP CONSTRAINT IF EXISTS _ai_configs_pkey;
ALTER TABLE IF EXISTS ONLY ai.configs DROP CONSTRAINT IF EXISTS _ai_configs_model_id_key;
ALTER TABLE IF EXISTS system.migrations ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS system.secrets;
DROP SEQUENCE IF EXISTS system.migrations_id_seq;
DROP TABLE IF EXISTS system.migrations;
DROP TABLE IF EXISTS system.mcp_usage;
DROP TABLE IF EXISTS system.deployments;
DROP TABLE IF EXISTS system.audit_logs;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS schedules.jobs;
DROP TABLE IF EXISTS schedules.job_logs;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS realtime.channels;
DROP TABLE IF EXISTS public.site_images;
DROP TABLE IF EXISTS public.site_content;
DROP TABLE IF EXISTS public.rooms;
DROP TABLE IF EXISTS public.room_images;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.cafe_menu_items;
DROP TABLE IF EXISTS public.cafe_menu_categories;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.blocked_dates;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS functions.deployments;
DROP TABLE IF EXISTS functions.definitions;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.user_providers;
DROP TABLE IF EXISTS auth.oauth_configs;
DROP TABLE IF EXISTS auth.email_otps;
DROP TABLE IF EXISTS auth.configs;
DROP TABLE IF EXISTS ai.usage;
DROP TABLE IF EXISTS ai.configs;
DROP FUNCTION IF EXISTS system.update_updated_at();
DROP FUNCTION IF EXISTS system.reload_postgrest_schema();
DROP FUNCTION IF EXISTS system.create_policies_after_rls();
DROP FUNCTION IF EXISTS system.create_default_policies();
DROP FUNCTION IF EXISTS schedules.upsert_job(p_job_id uuid, p_name text, p_cron_expression text, p_http_method text, p_function_url text, p_headers_template jsonb, p_resolved_headers jsonb, p_body jsonb);
DROP FUNCTION IF EXISTS schedules.log_job_execution(p_job_id uuid, p_job_name text, p_success boolean, p_response_status integer, p_duration_ms bigint, p_message text);
DROP FUNCTION IF EXISTS schedules.execute_job(p_job_id uuid);
DROP FUNCTION IF EXISTS schedules.encrypt_headers(p_headers jsonb);
DROP FUNCTION IF EXISTS schedules.enable_job(p_job_id uuid);
DROP FUNCTION IF EXISTS schedules.disable_job(p_job_id uuid);
DROP FUNCTION IF EXISTS schedules.delete_job(p_job_id uuid);
DROP FUNCTION IF EXISTS schedules.decrypt_headers(p_encrypted_headers text);
DROP FUNCTION IF EXISTS schedules.build_http_headers(headers_jsonb jsonb);
DROP FUNCTION IF EXISTS realtime.publish(p_channel_name text, p_event_name text, p_payload jsonb);
DROP FUNCTION IF EXISTS realtime.notify_on_message_insert();
DROP FUNCTION IF EXISTS realtime.channel_name();
DROP FUNCTION IF EXISTS public.notify_order_status_change();
DROP FUNCTION IF EXISTS public.notify_new_order();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.email();
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS http;
DROP SCHEMA IF EXISTS system;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS schedules;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS functions;
DROP EXTENSION IF EXISTS pg_cron;
DROP SCHEMA IF EXISTS auth;
DROP SCHEMA IF EXISTS ai;
--
-- Name: ai; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA ai;


ALTER SCHEMA ai OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: functions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA functions;


ALTER SCHEMA functions OWNER TO postgres;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO postgres;

--
-- Name: schedules; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA schedules;


ALTER SCHEMA schedules OWNER TO postgres;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO postgres;

--
-- Name: system; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA system;


ALTER SCHEMA system OWNER TO postgres;

--
-- Name: http; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA public;


--
-- Name: EXTENSION http; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION http IS 'HTTP client for PostgreSQL, allows web page retrieval inside the database.';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT
  coalesce(
    current_setting('request.jwt.claim.email', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO postgres;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT
  coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO postgres;

--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT
  nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO postgres;

--
-- Name: notify_new_order(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  PERFORM realtime.publish(
    'admin:orders',
    'new_order',
    jsonb_build_object(
      'id', NEW.id,
      'customer_name', NEW.customer_name,
      'status', NEW.status,
      'total_amount', NEW.total_amount
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_new_order() OWNER TO postgres;

--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Notify specific order channel
  PERFORM realtime.publish(
    'order:' || NEW.id::text,
    'order_updated',
    jsonb_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'updated_at', NEW.updated_at
    )
  );

  -- Notify admin channel
  PERFORM realtime.publish(
    'admin:orders',
    'status_changed',
    jsonb_build_object(
      'id', NEW.id,
      'customer_name', NEW.customer_name,
      'status', NEW.status,
      'total_amount', NEW.total_amount
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_order_status_change() OWNER TO postgres;

--
-- Name: channel_name(); Type: FUNCTION; Schema: realtime; Owner: postgres
--

CREATE FUNCTION realtime.channel_name() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT current_setting('realtime.channel_name', true);
$$;


ALTER FUNCTION realtime.channel_name() OWNER TO postgres;

--
-- Name: notify_on_message_insert(); Type: FUNCTION; Schema: realtime; Owner: postgres
--

CREATE FUNCTION realtime.notify_on_message_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Send only message_id to bypass pg_notify 8KB payload limit
  -- Backend will fetch full message from DB
  PERFORM pg_notify('realtime_message', NEW.id::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION realtime.notify_on_message_insert() OWNER TO postgres;

--
-- Name: publish(text, text, jsonb); Type: FUNCTION; Schema: realtime; Owner: postgres
--

CREATE FUNCTION realtime.publish(p_channel_name text, p_event_name text, p_payload jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_channel_id UUID;
  v_message_id UUID;
BEGIN
  -- Find matching channel: exact match first, then wildcard pattern match
  -- For wildcard patterns like "order:%", check if p_channel_name LIKE pattern
  SELECT id INTO v_channel_id
  FROM realtime.channels
  WHERE enabled = TRUE
    AND (pattern = p_channel_name OR p_channel_name LIKE pattern)
  ORDER BY pattern = p_channel_name DESC
  LIMIT 1;

  -- If no channel found, raise a warning and return NULL
  IF v_channel_id IS NULL THEN
    RAISE WARNING 'Realtime: No matching channel found for "%"', p_channel_name;
    RETURN NULL;
  END IF;

  -- Insert message record (system-triggered, so sender_type = 'system')
  INSERT INTO realtime.messages (
    event_name,
    channel_id,
    channel_name,
    payload,
    sender_type
  ) VALUES (
    p_event_name,
    v_channel_id,
    p_channel_name,
    p_payload,
    'system'
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;


ALTER FUNCTION realtime.publish(p_channel_name text, p_event_name text, p_payload jsonb) OWNER TO postgres;

--
-- Name: build_http_headers(jsonb); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.build_http_headers(headers_jsonb jsonb) RETURNS public.http_header[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_headers http_header[] := ARRAY[]::http_header[];
  v_key TEXT;
BEGIN
  IF headers_jsonb IS NULL THEN
    RETURN v_headers;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(headers_jsonb)
  LOOP
    v_headers := array_append(
      v_headers,
      http_header(v_key, headers_jsonb ->> v_key)
    );
  END LOOP;

  RETURN v_headers;
END;
$$;


ALTER FUNCTION schedules.build_http_headers(headers_jsonb jsonb) OWNER TO postgres;

--
-- Name: decrypt_headers(text); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.decrypt_headers(p_encrypted_headers text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_key TEXT;
  v_decrypted TEXT;
BEGIN
  IF p_encrypted_headers IS NULL OR p_encrypted_headers = '' THEN
    RETURN '{}'::JSONB;
  END IF;

  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key app.encryption_key is not set';
  END IF;

  -- Try to decode and decrypt
  BEGIN
    v_decrypted := pgp_sym_decrypt(decode(p_encrypted_headers, 'base64'), v_key);
    RETURN v_decrypted::JSONB;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Decryption failed for value: %, error: %', left(p_encrypted_headers, 50), SQLERRM;
    RAISE;  -- Re-raise so execute_job logs the actual failure reason
  END;
END;
$$;


ALTER FUNCTION schedules.decrypt_headers(p_encrypted_headers text) OWNER TO postgres;

--
-- Name: delete_job(uuid); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.delete_job(p_job_id uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_cron_job_id BIGINT;
BEGIN
  SELECT cron_job_id INTO v_cron_job_id
  FROM schedules.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Job not found';
    RETURN;
  END IF;

  IF v_cron_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_cron_job_id);
  END IF;

  DELETE FROM schedules.jobs WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job deleted successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION schedules.delete_job(p_job_id uuid) OWNER TO postgres;

--
-- Name: disable_job(uuid); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.disable_job(p_job_id uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_cron_job_id BIGINT;
BEGIN
  SELECT cron_job_id INTO v_cron_job_id
  FROM schedules.jobs WHERE id = p_job_id;

  IF v_cron_job_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No cron job found for this job';
    RETURN;
  END IF;

  PERFORM cron.unschedule(v_cron_job_id);

  UPDATE schedules.jobs
  SET cron_job_id = NULL, is_active = FALSE, updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job disabled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION schedules.disable_job(p_job_id uuid) OWNER TO postgres;

--
-- Name: enable_job(uuid); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.enable_job(p_job_id uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_job RECORD;
  v_new_cron_id BIGINT;
  v_function_call TEXT;
BEGIN
  SELECT id, cron_schedule, function_url
  INTO v_job
  FROM schedules.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Job not found';
    RETURN;
  END IF;

  v_function_call := format('SELECT schedules.execute_job(%L::UUID)', p_job_id);
  SELECT cron.schedule(v_job.cron_schedule, v_function_call) INTO v_new_cron_id;

  UPDATE schedules.jobs
  SET cron_job_id = v_new_cron_id,
      is_active = TRUE,
      updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job enabled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION schedules.enable_job(p_job_id uuid) OWNER TO postgres;

--
-- Name: encrypt_headers(jsonb); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.encrypt_headers(p_headers jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_key TEXT;
  v_encrypted TEXT;
BEGIN
  IF p_headers IS NULL OR p_headers = '{}'::JSONB THEN
    RETURN NULL;
  END IF;

  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key app.encryption_key is not set';
  END IF;

  -- pgp_sym_encrypt returns bytea; encode to base64 for TEXT storage
  v_encrypted := encode(pgp_sym_encrypt(p_headers::TEXT, v_key), 'base64');

  RETURN v_encrypted;
END;
$$;


ALTER FUNCTION schedules.encrypt_headers(p_headers jsonb) OWNER TO postgres;

--
-- Name: execute_job(uuid); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.execute_job(p_job_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_job RECORD;
  v_http_request http_request;
  v_http_response http_response;
  v_success BOOLEAN;
  v_status INT;
  v_body TEXT;
  v_decrypted_headers JSONB;
  v_final_body JSONB;
  v_start_time TIMESTAMP := clock_timestamp();
  v_end_time TIMESTAMP;
  v_duration_ms BIGINT;
  v_error_message TEXT;
BEGIN
  -- Fetch the job
  SELECT
    j.id,
    j.name,
    j.function_url,
    j.http_method,
    j.body,
    j.encrypted_headers
  INTO v_job
  FROM schedules.jobs AS j
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    PERFORM schedules.log_job_execution(p_job_id, 'unknown', FALSE, 404, 0, 'Job not found');
    RETURN;
  END IF;

  BEGIN
    -- Decrypt headers
    v_decrypted_headers := schedules.decrypt_headers(v_job.encrypted_headers);

    -- Build the final request body
    v_final_body := COALESCE(v_job.body, '{}'::JSONB);

    -- Construct HTTP request
    v_http_request := (
      v_job.http_method::http_method,
      v_job.function_url,
      schedules.build_http_headers(v_decrypted_headers),
      'application/json',
      v_final_body::TEXT
    );
    v_start_time := clock_timestamp();
    -- Execute HTTP call
    v_http_response := http(v_http_request);
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    v_status := v_http_response.status;
    v_body := v_http_response.content;
    v_success := v_status BETWEEN 200 AND 299;

    -- Log execution
    v_error_message := CASE WHEN v_success THEN 'Success' ELSE 'HTTP ' || v_status END;
    PERFORM schedules.log_job_execution(v_job.id, v_job.name, v_success, v_status, v_duration_ms, v_error_message);

  EXCEPTION WHEN OTHERS THEN
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    PERFORM schedules.log_job_execution(v_job.id, v_job.name, FALSE, 500, v_duration_ms, SQLERRM);
  END;
END;
$$;


ALTER FUNCTION schedules.execute_job(p_job_id uuid) OWNER TO postgres;

--
-- Name: log_job_execution(uuid, text, boolean, integer, bigint, text); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.log_job_execution(p_job_id uuid, p_job_name text, p_success boolean, p_response_status integer, p_duration_ms bigint, p_message text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO schedules.job_logs (
    job_id,
    executed_at,
    status_code,
    success,
    duration_ms,
    message
  ) VALUES (
    p_job_id,
    NOW(),
    p_response_status,
    p_success,
    p_duration_ms,
    p_message
  );

  -- Update last_executed_at in jobs table
  UPDATE schedules.jobs
  SET last_executed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;


ALTER FUNCTION schedules.log_job_execution(p_job_id uuid, p_job_name text, p_success boolean, p_response_status integer, p_duration_ms bigint, p_message text) OWNER TO postgres;

--
-- Name: upsert_job(uuid, text, text, text, text, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: schedules; Owner: postgres
--

CREATE FUNCTION schedules.upsert_job(p_job_id uuid, p_name text, p_cron_expression text, p_http_method text, p_function_url text, p_headers_template jsonb, p_resolved_headers jsonb, p_body jsonb) RETURNS TABLE(cron_job_id bigint, success boolean, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_existing_cron_id BIGINT;
  v_new_cron_id BIGINT;
  v_function_call TEXT;
  v_encrypted_headers TEXT;
BEGIN
  -- Encrypt resolved headers (with actual secret values) before storing
  v_encrypted_headers := schedules.encrypt_headers(p_resolved_headers);

  -- Unschedule any existing job for this schedule to prevent duplicates
  SELECT j.cron_job_id INTO v_existing_cron_id
  FROM schedules.jobs AS j
  WHERE j.id = p_job_id;

  IF v_existing_cron_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_cron_id);
  END IF;

  -- Schedule the new cron job
  v_function_call := format('SELECT schedules.execute_job(%L::UUID)', p_job_id);
  SELECT cron.schedule(p_cron_expression, v_function_call) INTO v_new_cron_id;

  -- Insert or update the job record
  -- headers = original template (safe to display)
  -- encrypted_headers = resolved values (used at runtime)
  INSERT INTO schedules.jobs (
    id, name, cron_schedule, function_url, http_method, encrypted_headers, headers, body, cron_job_id, is_active, created_at, updated_at
  ) VALUES (
    p_job_id,
    p_name,
    p_cron_expression,
    p_function_url,
    p_http_method,
    v_encrypted_headers,
    p_headers_template,
    p_body,
    v_new_cron_id,
    TRUE,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    cron_schedule = EXCLUDED.cron_schedule,
    function_url = EXCLUDED.function_url,
    http_method = EXCLUDED.http_method,
    encrypted_headers = EXCLUDED.encrypted_headers,
    headers = EXCLUDED.headers,
    body = EXCLUDED.body,
    cron_job_id = EXCLUDED.cron_job_id,
    is_active = TRUE,
    updated_at = NOW();

  RETURN QUERY SELECT v_new_cron_id, TRUE, 'Cron job scheduled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::BIGINT, FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION schedules.upsert_job(p_job_id uuid, p_name text, p_cron_expression text, p_http_method text, p_function_url text, p_headers_template jsonb, p_resolved_headers jsonb, p_body jsonb) OWNER TO postgres;

--
-- Name: create_default_policies(); Type: FUNCTION; Schema: system; Owner: postgres
--

CREATE FUNCTION system.create_default_policies() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
  table_schema text;
  table_name text;
  has_rls boolean;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
  LOOP
    SELECT INTO table_schema, table_name
      split_part(obj.object_identity, '.', 1),
      trim(both '"' from split_part(obj.object_identity, '.', 2));
    SELECT INTO has_rls
      rowsecurity
    FROM pg_tables
    WHERE schemaname = table_schema
      AND tablename = table_name;
    IF has_rls THEN
      EXECUTE format('CREATE POLICY "project_admin_policy" ON %s FOR ALL TO project_admin USING (true) WITH CHECK (true)', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION system.create_default_policies() OWNER TO postgres;

--
-- Name: create_policies_after_rls(); Type: FUNCTION; Schema: system; Owner: postgres
--

CREATE FUNCTION system.create_policies_after_rls() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
  table_schema text;
  table_name text;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'ALTER TABLE'
  LOOP
    SELECT INTO table_schema, table_name
      split_part(obj.object_identity, '.', 1),
      trim(both '"' from split_part(obj.object_identity, '.', 2));
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = table_schema
        AND tablename = table_name
        AND rowsecurity = true
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = table_schema
        AND tablename = table_name
    ) THEN
      EXECUTE format('CREATE POLICY "project_admin_policy" ON %s FOR ALL TO project_admin USING (true) WITH CHECK (true)', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION system.create_policies_after_rls() OWNER TO postgres;

--
-- Name: reload_postgrest_schema(); Type: FUNCTION; Schema: system; Owner: postgres
--

CREATE FUNCTION system.reload_postgrest_schema() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'PostgREST schema reload notification sent';
END
$$;


ALTER FUNCTION system.reload_postgrest_schema() OWNER TO postgres;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: system; Owner: postgres
--

CREATE FUNCTION system.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION system.update_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: configs; Type: TABLE; Schema: ai; Owner: postgres
--

CREATE TABLE ai.configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(255) NOT NULL,
    model_id character varying(255) NOT NULL,
    system_prompt text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    input_modality text[] DEFAULT '{text}'::text[] NOT NULL,
    output_modality text[] DEFAULT '{text}'::text[] NOT NULL,
    CONSTRAINT check_input_modality_not_empty CHECK ((array_length(input_modality, 1) > 0)),
    CONSTRAINT check_input_modality_valid CHECK ((input_modality <@ '{text,image,audio,video,file}'::text[])),
    CONSTRAINT check_output_modality_not_empty CHECK ((array_length(output_modality, 1) > 0)),
    CONSTRAINT check_output_modality_valid CHECK ((output_modality <@ '{text,image,audio,video,file}'::text[]))
);


ALTER TABLE ai.configs OWNER TO postgres;

--
-- Name: usage; Type: TABLE; Schema: ai; Owner: postgres
--

CREATE TABLE ai.usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid,
    input_tokens integer,
    output_tokens integer,
    image_count integer,
    image_resolution text,
    created_at timestamp with time zone DEFAULT now(),
    model_id character varying(255)
);


ALTER TABLE ai.usage OWNER TO postgres;

--
-- Name: configs; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    require_email_verification boolean DEFAULT false NOT NULL,
    password_min_length integer DEFAULT 6 NOT NULL,
    require_number boolean DEFAULT false NOT NULL,
    require_lowercase boolean DEFAULT false NOT NULL,
    require_uppercase boolean DEFAULT false NOT NULL,
    require_special_char boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    verify_email_method text DEFAULT 'code'::text NOT NULL,
    reset_password_method text DEFAULT 'code'::text NOT NULL,
    sign_in_redirect_to text,
    CONSTRAINT _auth_configs_password_min_length_check CHECK (((password_min_length >= 4) AND (password_min_length <= 128))),
    CONSTRAINT _auth_configs_reset_password_method_check CHECK ((reset_password_method = ANY (ARRAY['code'::text, 'link'::text]))),
    CONSTRAINT _auth_configs_verify_email_method_check CHECK ((verify_email_method = ANY (ARRAY['code'::text, 'link'::text])))
);


ALTER TABLE auth.configs OWNER TO postgres;

--
-- Name: email_otps; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.email_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    purpose text NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE auth.email_otps OWNER TO postgres;

--
-- Name: oauth_configs; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.oauth_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    client_id text,
    secret_id uuid,
    scopes text[],
    redirect_uri text,
    use_shared_key boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE auth.oauth_configs OWNER TO postgres;

--
-- Name: user_providers; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.user_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    access_token text,
    refresh_token text,
    provider_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE auth.user_providers OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    profile jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_project_admin boolean DEFAULT false NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.users OWNER TO postgres;

--
-- Name: definitions; Type: TABLE; Schema: functions; Owner: postgres
--

CREATE TABLE functions.definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    code text NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deployed_at timestamp with time zone
);


ALTER TABLE functions.definitions OWNER TO postgres;

--
-- Name: deployments; Type: TABLE; Schema: functions; Owner: postgres
--

CREATE TABLE functions.deployments (
    id text NOT NULL,
    project_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    url text,
    function_count integer,
    functions jsonb,
    error_message text,
    build_logs jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE functions.deployments OWNER TO postgres;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'admin'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocked_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blocked_dates OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    guest_phone text NOT NULL,
    check_in date NOT NULL,
    check_out date NOT NULL,
    total_price numeric(10,2) NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    booking_status text DEFAULT 'confirmed'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bookings_booking_status_check CHECK ((booking_status = ANY (ARRAY['confirmed'::text, 'cancelled'::text, 'checked_in'::text, 'checked_out'::text]))),
    CONSTRAINT bookings_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'pay_at_property'::text])))
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: cafe_menu_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cafe_menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cafe_menu_categories OWNER TO postgres;

--
-- Name: cafe_menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cafe_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    is_available boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cafe_menu_items OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    price_at_purchase numeric(12,2) NOT NULL,
    size text
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name text NOT NULL,
    phone_number text NOT NULL,
    address text NOT NULL,
    area text,
    order_notes text,
    total_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'Order Placed'::text,
    payment_method text DEFAULT 'COD'::text,
    estimated_delivery text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0,
    images text[] DEFAULT '{}'::text[],
    sizes text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    is_new boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: room_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid,
    image_url text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.room_images OWNER TO postgres;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price_per_night numeric(10,2) NOT NULL,
    max_guests integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    room_type text,
    amenities text[] DEFAULT '{}'::text[],
    room_size text,
    bed_type text,
    policies text
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: site_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.site_content OWNER TO postgres;

--
-- Name: site_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    type text,
    title text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT site_images_type_check CHECK ((type = ANY (ARRAY['hero'::text, 'gallery'::text, 'cafe'::text, 'exterior'::text, 'other'::text])))
);


ALTER TABLE public.site_images OWNER TO postgres;

--
-- Name: channels; Type: TABLE; Schema: realtime; Owner: postgres
--

CREATE TABLE realtime.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern text NOT NULL,
    description text,
    webhook_urls text[],
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE realtime.channels OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: postgres
--

CREATE TABLE realtime.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    channel_id uuid,
    channel_name text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    sender_type text DEFAULT 'system'::text NOT NULL,
    sender_id uuid,
    ws_audience_count integer DEFAULT 0 NOT NULL,
    wh_audience_count integer DEFAULT 0 NOT NULL,
    wh_delivered_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['system'::text, 'user'::text])))
);


ALTER TABLE realtime.messages OWNER TO postgres;

--
-- Name: job_logs; Type: TABLE; Schema: schedules; Owner: postgres
--

CREATE TABLE schedules.job_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    executed_at timestamp with time zone DEFAULT now(),
    status_code integer,
    success boolean,
    duration_ms bigint,
    message text
);


ALTER TABLE schedules.job_logs OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: schedules; Owner: postgres
--

CREATE TABLE schedules.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cron_schedule text NOT NULL,
    function_url text NOT NULL,
    http_method text DEFAULT 'POST'::text NOT NULL,
    encrypted_headers text,
    headers jsonb,
    body jsonb,
    is_active boolean DEFAULT true NOT NULL,
    cron_job_id bigint,
    last_executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE schedules.jobs OWNER TO postgres;

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: postgres
--

CREATE TABLE storage.buckets (
    name text NOT NULL,
    public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.buckets OWNER TO postgres;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: postgres
--

CREATE TABLE storage.objects (
    bucket text NOT NULL,
    key text NOT NULL,
    size integer NOT NULL,
    mime_type text,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by uuid
);


ALTER TABLE storage.objects OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: system; Owner: postgres
--

CREATE TABLE system.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor text NOT NULL,
    action text NOT NULL,
    module text NOT NULL,
    details jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE system.audit_logs OWNER TO postgres;

--
-- Name: deployments; Type: TABLE; Schema: system; Owner: postgres
--

CREATE TABLE system.deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text DEFAULT 'vercel'::text NOT NULL,
    provider_deployment_id text,
    status text DEFAULT 'WAITING'::text NOT NULL,
    url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE system.deployments OWNER TO postgres;

--
-- Name: mcp_usage; Type: TABLE; Schema: system; Owner: postgres
--

CREATE TABLE system.mcp_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tool_name character varying(255) NOT NULL,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE system.mcp_usage OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: system; Owner: postgres
--

CREATE TABLE system.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE system.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: system; Owner: postgres
--

CREATE SEQUENCE system.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE system.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: system; Owner: postgres
--

ALTER SEQUENCE system.migrations_id_seq OWNED BY system.migrations.id;


--
-- Name: secrets; Type: TABLE; Schema: system; Owner: postgres
--

CREATE TABLE system.secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value_ciphertext text NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_reserved boolean DEFAULT false
);


ALTER TABLE system.secrets OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.migrations ALTER COLUMN id SET DEFAULT nextval('system.migrations_id_seq'::regclass);


--
-- Data for Name: configs; Type: TABLE DATA; Schema: ai; Owner: postgres
--

COPY ai.configs (id, provider, model_id, system_prompt, created_at, updated_at, input_modality, output_modality) FROM stdin;
f4a82dba-0c53-484d-825a-7d1a72af4b3c	openrouter	google/gemini-3-pro-image-preview	\N	2026-02-07 03:39:06.084452+00	2026-02-07 03:39:06.084452+00	{text,image}	{text,image}
f4211bb1-d2bb-4677-b72f-b7f659f8b113	openrouter	openai/gpt-4o-mini	\N	2026-02-07 03:39:06.087832+00	2026-02-07 03:39:06.087832+00	{text,image}	{text}
ccbd2a4b-d7eb-4940-a4c7-ca24107f8dc9	openrouter	anthropic/claude-sonnet-4.5	\N	2026-02-07 03:39:06.090259+00	2026-02-07 03:39:06.090259+00	{text,image}	{text}
aa972898-7f6b-4774-8936-47c716c4fb27	openrouter	x-ai/grok-4.1-fast	\N	2026-02-07 03:39:06.092441+00	2026-02-07 03:39:06.092441+00	{text,image}	{text}
c862a4ab-1474-4e69-9e6e-b6f3fec1fdd4	openrouter	minimax/minimax-m2.1	\N	2026-02-07 03:39:06.094712+00	2026-02-07 03:39:06.094712+00	{text,image}	{text}
1bb3e59e-712b-430d-949b-a3fa01f77250	openrouter	deepseek/deepseek-v3.2	\N	2026-02-07 03:39:06.096916+00	2026-02-07 03:39:06.096916+00	{text,image}	{text}
\.


--
-- Data for Name: usage; Type: TABLE DATA; Schema: ai; Owner: postgres
--

COPY ai.usage (id, config_id, input_tokens, output_tokens, image_count, image_resolution, created_at, model_id) FROM stdin;
\.


--
-- Data for Name: configs; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.configs (id, require_email_verification, password_min_length, require_number, require_lowercase, require_uppercase, require_special_char, created_at, updated_at, verify_email_method, reset_password_method, sign_in_redirect_to) FROM stdin;
c23e47e2-5c01-4ad1-850b-7901067e6e41	t	6	f	f	f	f	2026-02-07 03:39:06.102152+00	2026-02-07 03:39:06.102152+00	code	code	\N
\.


--
-- Data for Name: email_otps; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.email_otps (id, email, purpose, otp_hash, expires_at, consumed_at, created_at, updated_at) FROM stdin;
26fcb093-d729-4332-ad94-905b5ca10d98	pawangyawali246@gmail.com	VERIFY_EMAIL	$2b$10$qNXjFcmWXAT6GZh/ygWCCOTwIiy47I.VN2PhRQzUpU4dMSLxKSjQm	2026-02-11 10:36:21.485+00	2026-02-11 10:24:47.054755+00	2026-02-11 10:21:21.682575+00	2026-02-11 10:24:47.054755+00
89566fb8-5072-477b-896b-7a3ef477580b	abhinamvlog11@gmail.com	VERIFY_EMAIL	$2b$10$vqIAcbADW7XTA86aNuwouOLu6Zuwo7D/ci2PjqdMXhZrF.4x5DaTe	2026-02-12 13:02:10.878+00	\N	2026-02-12 12:47:11.071653+00	2026-02-12 12:47:11.071653+00
\.


--
-- Data for Name: oauth_configs; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.oauth_configs (id, provider, client_id, secret_id, scopes, redirect_uri, use_shared_key, created_at, updated_at) FROM stdin;
ed75c173-449d-4d20-bd05-99488de96b78	google	\N	\N	{openid,email,profile}	\N	t	2026-02-07 03:39:05.806403+00	2026-02-07 03:39:05.806403+00
2cda1b7f-899b-4133-a5f6-9046941326e6	github	\N	\N	{user:email}	\N	t	2026-02-07 03:39:05.822323+00	2026-02-07 03:39:05.822323+00
\.


--
-- Data for Name: user_providers; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.user_providers (id, user_id, provider, provider_account_id, access_token, refresh_token, provider_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id, email, password, email_verified, created_at, updated_at, profile, metadata, is_project_admin, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000001	admin@example.com	$2b$10$38t7/HvvUJO5LLQr.Lf8G.UVcG3wWDHnPftSKnKricS6m0vVmtcSe	t	2026-02-07 03:39:05.782635+00	2026-02-07 03:39:05.782635+00	{"name": "Administrator"}	{}	t	f
12345678-1234-5678-90ab-cdef12345678	anon@example.com	\N	f	2026-02-07 03:39:05.787676+00	2026-02-07 03:39:05.787676+00	{"name": "Anonymous"}	{}	f	t
6adb931e-c65f-4be8-9f37-7ac1fa19d199	pawangyawali246@gmail.com	$2b$10$nKjAhPqY7EXLAlsEMdxC0uYtQp8vqF6hkX6L0wN8tqpP4YbvXpdsG	t	2026-02-11 10:21:21.466353+00	2026-02-11 10:24:47.054755+00	{}	{}	f	f
deef17f9-d7aa-43e1-b924-360289e4e241	abhinamvlog11@gmail.com	$2b$10$k/PBWl5bFNm9Effej48zz.R66qQ9sVV69EfO9hONvhYNYfI7iHyqC	f	2026-02-12 12:47:10.863896+00	2026-02-12 12:47:10.863896+00	{"name": "Abhinam Acharya"}	{}	f	f
\.


--
-- Data for Name: job; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job (jobid, schedule, command, nodename, nodeport, database, username, active, jobname) FROM stdin;
\.


--
-- Data for Name: job_run_details; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time) FROM stdin;
\.


--
-- Data for Name: definitions; Type: TABLE DATA; Schema: functions; Owner: postgres
--

COPY functions.definitions (id, slug, name, description, code, status, created_at, updated_at, deployed_at) FROM stdin;
\.


--
-- Data for Name: deployments; Type: TABLE DATA; Schema: functions; Owner: postgres
--

COPY functions.deployments (id, project_id, status, url, function_count, functions, error_message, build_logs, created_at) FROM stdin;
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, name, email, password_hash, role, created_at) FROM stdin;
\.


--
-- Data for Name: blocked_dates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocked_dates (id, room_id, start_date, end_date, reason, created_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, room_id, guest_name, guest_email, guest_phone, check_in, check_out, total_price, payment_status, booking_status, created_at) FROM stdin;
\.


--
-- Data for Name: cafe_menu_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cafe_menu_categories (id, name, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: cafe_menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cafe_menu_items (id, category_id, name, description, price, image_url, is_available, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, image_url, created_at) FROM stdin;
6a774f74-7a1a-480f-946a-97e9b85f29d3	Clothing	clothing	\N	2026-02-11 14:45:48.218798+00
84b7fe35-d29c-4985-9058-95f454b3b234	Accessories	accessories	\N	2026-02-11 14:45:48.218798+00
8a44fae6-bf3b-40bd-ad39-b11bc335c1e7	Footwear	footwear	\N	2026-02-11 14:45:48.218798+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price_at_purchase, size) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, customer_name, phone_number, address, area, order_notes, total_amount, status, payment_method, estimated_delivery, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, category_id, name, slug, description, price, stock, images, sizes, is_active, is_new, created_at) FROM stdin;
6c71c8a2-6029-4146-9c8c-ae93cfa28d0c	6a774f74-7a1a-480f-946a-97e9b85f29d3	Midnight Silk Shirt	midnight-silk-shirt	Crafted from the finest mulberry silk, our Midnight Silk Shirt offers an unparalleled blend of luxury and comfort.	12500.00	15	{https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?auto=format&fit=crop&q=80&w=1200}	{S,M,L,XL}	t	t	2026-02-11 14:45:48.218798+00
db7cebb9-9cfa-4f86-b010-41ec3455c079	84b7fe35-d29c-4985-9058-95f454b3b234	Gold Accent Handbag	gold-accent-handbag	A statement piece featuring premium Italian leather and 24k gold-plated hardware.	24000.00	5	{https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=1200}	{ONESIZE}	t	f	2026-02-11 14:45:48.218798+00
935f1f41-2cf3-4fdd-8700-24581a9c88db	6a774f74-7a1a-480f-946a-97e9b85f29d3	Classic Navy Blazer	classic-navy-blazer	Expertly tailored from Tasmanian wool for a sharp, sophisticated silhouette.	32000.00	10	{https://images.unsplash.com/photo-1594932224033-996522221652?auto=format&fit=crop&q=80&w=1200}	{48,50,52,54}	t	t	2026-02-11 14:45:48.218798+00
\.


--
-- Data for Name: room_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_images (id, room_id, image_url, sort_order, created_at) FROM stdin;
55baaae7-d72d-49c9-a518-ab99dbceb635	b881365d-0be0-48d4-a868-f0406273b41f	https://9s2vh3u7.us-west.insforge.app/api/storage/buckets/site-assets/objects/rooms%2F1771167338905-2g72s7.jpg	1	2026-02-15 14:55:45.021451+00
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rooms (id, name, description, price_per_night, max_guests, is_active, created_at, room_type, amenities, room_size, bed_type, policies) FROM stdin;
b881365d-0be0-48d4-a868-f0406273b41f	Room no 1		2499.00	2	t	2026-02-15 14:55:44.364679+00	Deluxe	{}	350	King Sized	
\.


--
-- Data for Name: site_content; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_content (id, key, value, updated_at) FROM stdin;
0e4111de-21e9-4b3b-a32a-57fae5524884	hero_title	Welcome to Highlands Cafe & Motel Inn	2026-02-07 05:42:50.560594+00
1fbbeafa-72f9-4c07-8a0a-94f16d6f5655	hero_subtitle	Experience cozy comfort in the heart of the highlands	2026-02-07 05:42:50.560594+00
b8220410-966e-4742-b8cc-f14f21366abe	cafe_description	Our on-site cafe serves authentic local cuisine with breathtaking mountain views	2026-02-07 05:42:50.560594+00
34ac4049-2b80-4727-9097-12788d927778	contact_phone	+977-1234567890	2026-02-07 05:42:50.560594+00
b5cfe831-877e-4999-b725-e11554446793	contact_email	info@highlandsmotel.com	2026-02-07 05:42:50.560594+00
ff4b0a53-ffc7-47f0-919f-1225394a3aa0	contact_address	Highland Road, Pokhara, Nepal	2026-02-07 05:42:50.560594+00
c0a23ac2-04af-4536-bcd6-e3317e62403f	checkin_time	2:00 PM	2026-02-07 05:42:50.560594+00
736503af-fe7c-446f-8f39-f2c7a8fed603	checkout_time	12:00 PM	2026-02-07 05:42:50.560594+00
\.


--
-- Data for Name: site_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_images (id, image_url, type, title, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: channels; Type: TABLE DATA; Schema: realtime; Owner: postgres
--

COPY realtime.channels (id, pattern, description, webhook_urls, enabled, created_at, updated_at) FROM stdin;
32cd1262-13be-4df7-a7a7-e0f8a382cbdd	order:%	Order updates for customers	\N	t	2026-02-11 14:44:38.851386+00	2026-02-11 14:44:38.851386+00
95bc965c-6d5f-449a-a9e7-38daaf66e661	admin:orders	Global order updates for admin	\N	t	2026-02-11 14:44:38.851386+00	2026-02-11 14:44:38.851386+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: realtime; Owner: postgres
--

COPY realtime.messages (id, event_name, channel_id, channel_name, payload, sender_type, sender_id, ws_audience_count, wh_audience_count, wh_delivered_count, created_at) FROM stdin;
\.


--
-- Data for Name: job_logs; Type: TABLE DATA; Schema: schedules; Owner: postgres
--

COPY schedules.job_logs (id, job_id, executed_at, status_code, success, duration_ms, message) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: schedules; Owner: postgres
--

COPY schedules.jobs (id, name, cron_schedule, function_url, http_method, encrypted_headers, headers, body, is_active, cron_job_id, last_executed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: postgres
--

COPY storage.buckets (name, public, created_at, updated_at) FROM stdin;
site-assets	t	2026-02-11 10:39:20.673823+00	2026-02-11 10:39:20.673823+00
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: postgres
--

COPY storage.objects (bucket, key, size, mime_type, uploaded_at, uploaded_by) FROM stdin;
site-assets	rooms/1770806377390-rwtuoh.webp	34074	image/webp	2026-02-11 10:39:39.505882+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
site-assets	rooms/1770806595769-8rzvwe.webp	34074	image/webp	2026-02-11 10:43:17.728049+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
site-assets	rooms/1770870826897-mgh0he.avif	56008	image/avif	2026-02-12 04:33:49.313738+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
site-assets	rooms/1770870973424-mle06p.jpg	4410	image/jpeg	2026-02-12 04:36:14.992259+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
site-assets	rooms/1770870993733-2mhaeb.jpg	8892	image/jpeg	2026-02-12 04:36:34.441975+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
site-assets	rooms/1771167338905-2g72s7.jpg	8892	image/jpeg	2026-02-15 14:55:41.494618+00	6adb931e-c65f-4be8-9f37-7ac1fa19d199
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: system; Owner: postgres
--

COPY system.audit_logs (id, actor, action, module, details, ip_address, created_at, updated_at) FROM stdin;
a2581fda-6e87-44f7-8a75-d603a6fe8d19	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-07 04:51:53.690321+00	2026-02-07 04:51:53.690321+00
6104ab8c-c29f-4354-ba84-d29e5a7e21d7	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "-- Create rooms table\\nCREATE TABLE IF NOT EXISTS rooms (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  name TEXT NOT NULL,\\n  description TEXT,\\n  price_per_night DECIMAL(10,2) NOT NULL,\\n  max_guests INTEGER NOT NULL DEFAULT 2,\\n  is_active BOOLEAN DEFAULT true,\\n  created_at TIMESTAMPTZ DEFAULT NO", "paramCount": 0}	103.186.197.139	2026-02-07 05:42:14.157711+00	2026-02-07 05:42:14.157711+00
60a94900-bd66-443d-9c35-951286826e76	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "-- Insert sample rooms\\nINSERT INTO rooms (name, description, price_per_night, max_guests) VALUES\\n('Highland Suite', 'Spacious suite with mountain views, king bed, and private balcony', 8500.00, 2),\\n('Cozy Double Room', 'Comfortable room with two double beds, perfect for families', 6500.00, 4),\\n('Del", "paramCount": 0}	103.186.197.139	2026-02-07 05:42:50.569755+00	2026-02-07 05:42:50.569755+00
5c0aa4f3-ce6d-41df-af99-fa4b7dc3b4fb	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-07 15:01:27.097248+00	2026-02-07 15:01:27.097248+00
e73f5d61-294d-4bc3-94db-807576e8ed10	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "SELECT * FROM auth.users LIMIT 5;", "paramCount": 0, "rowsAffected": 2}	103.163.182.237	2026-02-07 16:53:54.744804+00	2026-02-07 16:53:54.744804+00
d33da5ae-d67a-4be0-8e47-5f8c8e4405b0	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "SELECT * FROM pg_extension WHERE extname = 'pgcrypto';", "paramCount": 0, "rowsAffected": 1}	103.163.182.237	2026-02-07 16:54:18.482095+00	2026-02-07 16:54:18.482095+00
07e8bfd1-3838-4494-aa1c-c3e5bc15a0cd	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-07 18:39:37.300868+00	2026-02-07 18:39:37.300868+00
4ace43ad-b51f-4f70-856b-1e4c936fef00	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-07 19:09:31.642379+00	2026-02-07 19:09:31.642379+00
e586de47-cd02-42f7-bf3e-f12c0bc28988	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-07 19:19:01.362947+00	2026-02-07 19:19:01.362947+00
5b808d56-8663-436b-8a57-e8ecd397512c	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-08 01:18:28.803084+00	2026-02-08 01:18:28.803084+00
b32b55da-6a5d-4520-acc6-5fe64e91bfc4	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-08 03:00:21.046357+00	2026-02-08 03:00:21.046357+00
b0d5bbb2-ca78-4ee0-95e1-5e3b641bd811	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-08 04:35:02.845168+00	2026-02-08 04:35:02.845168+00
27165751-82a3-44cd-97e1-65cf21bf1c4f	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-08 05:22:15.121792+00	2026-02-08 05:22:15.121792+00
81b1477f-6875-435d-b045-cd4e513ca1df	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-08 05:58:39.211208+00	2026-02-08 05:58:39.211208+00
1eafc1b2-42b8-4ea8-aa71-c7eb324c1404	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-08 12:50:07.190833+00	2026-02-08 12:50:07.190833+00
5946266d-3c10-4525-ad04-e36c125d40df	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-08 14:52:57.845186+00	2026-02-08 14:52:57.845186+00
eb4d7ac4-3cac-469b-925d-3481255b1fe3	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-08 16:46:17.079162+00	2026-02-08 16:46:17.079162+00
2ae2965e-73c7-47b8-aa95-3b2f9e524881	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-09 01:19:18.646735+00	2026-02-09 01:19:18.646735+00
8fd00276-d7c5-4dfd-a8b7-a7e3fc01ba97	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-09 01:44:52.621401+00	2026-02-09 01:44:52.621401+00
990911dc-97e3-4645-a969-0ea661c8c0e1	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	18.223.136.193	2026-02-11 10:11:11.850128+00	2026-02-11 10:11:11.850128+00
32b9e821-70c4-4ea0-9373-433c5388f7d9	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "SELECT * FROM admin_users;", "paramCount": 0, "rowsAffected": 0}	103.186.197.177	2026-02-11 10:22:32.955729+00	2026-02-11 10:22:32.955729+00
5bc3b361-54e7-4295-9056-efc8c2edfd44	api-key	CREATE_BUCKET	STORAGE	{"isPublic": true, "bucketName": "site-assets"}	103.186.197.177	2026-02-11 10:39:20.676455+00	2026-02-11 10:39:20.676455+00
39918868-7427-426c-92a8-34df0320b917	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "SELECT * FROM rooms ORDER BY created_at DESC LIMIT 10", "paramCount": 0, "rowsAffected": 1}	103.186.197.177	2026-02-11 10:44:20.64746+00	2026-02-11 10:44:20.64746+00
1d17a938-cbdf-4b71-a9d9-a24a2e1b9f84	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "SELECT * FROM room_images ORDER BY created_at DESC LIMIT 10", "paramCount": 0, "rowsAffected": 1}	103.186.197.177	2026-02-11 10:44:22.739472+00	2026-02-11 10:44:22.739472+00
4efe7929-2920-4694-af06-59e119a925fb	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "ALTER TABLE rooms \\nADD COLUMN IF NOT EXISTS room_type text,\\nADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}',\\nADD COLUMN IF NOT EXISTS room_size text,\\nADD COLUMN IF NOT EXISTS bed_type text,\\nADD COLUMN IF NOT EXISTS policies text;", "paramCount": 0, "rowsAffected": null}	103.186.197.177	2026-02-11 11:00:01.353556+00	2026-02-11 11:00:01.353556+00
c1d01466-26af-466b-9b80-8a6448c61aa1	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "CREATE TABLE IF NOT EXISTS categories (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  name TEXT NOT NULL,\\n  slug TEXT UNIQUE NOT NULL,\\n  image_url TEXT,\\n  created_at TIMESTAMPTZ DEFAULT now()\\n);\\n\\nCREATE TABLE IF NOT EXISTS products (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  category_i", "paramCount": 0}	103.186.197.177	2026-02-11 14:39:06.000036+00	2026-02-11 14:39:06.000036+00
abf56d59-a6fc-4898-af04-fcbed7c323eb	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "-- Enable Realtime for Orders\\nINSERT INTO realtime.channels (pattern, description, enabled)\\nVALUES ('order:%', 'Order updates for customers', true)\\nON CONFLICT (pattern) DO NOTHING;\\n\\nINSERT INTO realtime.channels (pattern, description, enabled)\\nVALUES ('admin:orders', 'Global order updates for admin", "paramCount": 0}	103.186.197.177	2026-02-11 14:44:38.883515+00	2026-02-11 14:44:38.883515+00
5c33cf52-e87d-4bb4-84fe-8616fbf7ca52	api-key	EXECUTE_RAW_SQL	DATABASE	{"mode": "strict", "query": "-- Seed Categories\\nINSERT INTO categories (name, slug)\\nVALUES \\n  ('Clothing', 'clothing'),\\n  ('Accessories', 'accessories'),\\n  ('Footwear', 'footwear')\\nON CONFLICT (slug) DO NOTHING;\\n\\n-- Get Category IDs\\nWITH cats AS (SELECT id, slug FROM categories)\\nINSERT INTO products (category_id, name, slug, de", "paramCount": 0}	103.186.197.177	2026-02-11 14:45:48.230005+00	2026-02-11 14:45:48.230005+00
1ada04ba-847c-4a56-8342-7fdf67515029	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.21.21.31	2026-02-12 04:37:26.404212+00	2026-02-12 04:37:26.404212+00
9c673451-0c24-4471-99aa-3d7dc168603e	admin@insforge.local	GET_SECRET	SECRETS	{"key": "API_KEY"}	3.144.169.142	2026-02-23 09:03:10.201984+00	2026-02-23 09:03:10.201984+00
\.


--
-- Data for Name: deployments; Type: TABLE DATA; Schema: system; Owner: postgres
--

COPY system.deployments (id, provider, provider_deployment_id, status, url, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mcp_usage; Type: TABLE DATA; Schema: system; Owner: postgres
--

COPY system.mcp_usage (id, tool_name, success, created_at) FROM stdin;
7581c20f-a113-4116-8543-4ba5b89fcf25	fetch-docs	t	2026-02-07 05:41:29.712317+00
d52bb257-3f51-4773-84a3-88286bf580fa	run-raw-sql	t	2026-02-07 05:42:14.620956+00
e0c9641c-589e-4d69-a3e6-ce62420323dd	run-raw-sql	t	2026-02-07 05:42:50.867219+00
83ba609a-1d16-4273-9d10-da678f2d9bdd	fetch-docs	t	2026-02-07 07:32:25.666476+00
e3b222cc-1318-43aa-b261-03cf5d356ba1	fetch-docs	t	2026-02-07 07:32:30.483082+00
ffbc6604-1477-4eb8-b7ff-f9de873bd020	get-backend-metadata	t	2026-02-07 16:52:45.253181+00
6af26835-fa8c-4c7b-8193-3e407d6e6b19	get-anon-key	t	2026-02-07 16:53:11.028251+00
2841fcbc-ed4e-47ff-8e8c-689009e38579	run-raw-sql	t	2026-02-07 16:53:55.038326+00
bb9655f0-c152-4993-971b-72777d8ae775	run-raw-sql	t	2026-02-07 16:54:18.833906+00
3df3818b-863a-4599-8e7d-f49ab8d1c049	get-backend-metadata	t	2026-02-11 10:18:34.687629+00
aaa9856d-8695-41e5-ad45-8eee209fe849	fetch-docs	t	2026-02-11 10:19:04.547876+00
dd0a942c-2747-4dac-b8cc-7b05917d6757	fetch-docs	t	2026-02-11 10:19:07.579519+00
e43688ed-4536-4b89-9c3e-9452a533ca8c	run-raw-sql	t	2026-02-11 10:22:33.404173+00
5dd080c3-33ba-4e88-8198-ed5f4479bc50	create-bucket	t	2026-02-11 10:39:21.00662+00
59f25c55-da9b-40ba-9b58-55d3dd7df34f	get-table-schema	t	2026-02-11 10:44:06.775827+00
65d14f71-8407-4d80-ac57-b94c20ba5897	get-table-schema	t	2026-02-11 10:44:10.557854+00
43a704a6-f9d5-4362-85d7-abbeaa9a40d0	run-raw-sql	t	2026-02-11 10:44:20.946399+00
b1899cf8-bbdb-4a01-a947-7f1a8135451a	run-raw-sql	t	2026-02-11 10:44:23.061078+00
c91d1e1b-487b-47c0-9251-db1d31fa82c7	get-table-schema	t	2026-02-11 10:59:31.739098+00
6d0cebfd-3a56-47cf-b16b-959b46283800	get-table-schema	t	2026-02-11 10:59:49.329758+00
e39901d7-7f75-4fc2-96b6-cee4cc3141f5	get-table-schema	t	2026-02-11 10:59:52.86204+00
e2e784ed-3463-4dc1-95b8-03f047613cdb	run-raw-sql	t	2026-02-11 11:00:01.794816+00
8200ae5d-7613-4a08-9c83-f6c5f994bebc	fetch-docs	t	2026-02-11 12:25:26.761744+00
0a0c28cc-1aa0-4ac1-9b2b-17b867fdff23	download-template	t	2026-02-11 12:27:58.077734+00
f9b8bab4-f61f-4c8e-8d01-eb2459a4dc45	run-raw-sql	t	2026-02-11 14:39:06.3498+00
622d8f51-e8c2-431d-9ef6-cdc98c8b653a	fetch-docs	t	2026-02-11 14:41:55.912343+00
16703657-636c-4bcf-9e5f-72579b69564a	fetch-docs	t	2026-02-11 14:42:05.272174+00
c19d77a9-eb55-4a6e-aab2-4a530f17433f	run-raw-sql	t	2026-02-11 14:44:39.32748+00
5291cd2b-5f7e-4f5e-9b25-2724af3d488d	run-raw-sql	t	2026-02-11 14:45:48.519443+00
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: system; Owner: postgres
--

COPY system.migrations (id, name, run_on) FROM stdin;
1	000_create-base-tables	2026-02-07 03:38:57.164489
2	001_create-helper-functions	2026-02-07 03:38:57.164489
3	002_rename-auth-tables	2026-02-07 03:38:57.164489
4	003_create-users-table	2026-02-07 03:38:57.164489
5	004_add-reload-postgrest-func	2026-02-07 03:38:57.164489
6	005_enable-project-admin-modify-users	2026-02-07 03:38:57.164489
7	006_modify-ai-usage-table	2026-02-07 03:38:57.164489
8	007_drop-metadata-table	2026-02-07 03:38:57.164489
9	008_add-system-tables	2026-02-07 03:38:57.164489
10	009_add-function-secrets	2026-02-07 03:38:57.164489
11	010_modify-ai-config-modalities	2026-02-07 03:38:57.164489
12	011_refactor-secrets-table	2026-02-07 03:38:57.164489
13	012_add-storage-uploaded-by	2026-02-07 03:38:57.164489
14	013_create-auth-schema-functions	2026-02-07 03:38:57.164489
15	014_add-updated-at-trigger-user-table	2026-02-07 03:38:57.164489
16	015_create-auth-config-and-email-otp-tables	2026-02-07 03:38:57.164489
17	016_update-auth-config-and-email-otp	2026-02-07 03:38:57.164489
18	017_create-realtime-schema	2026-02-07 03:38:57.164489
19	018_schema-rework	2026-02-07 03:38:57.164489
20	019_create-deployments-table	2026-02-07 03:38:57.164489
21	020_add-audio-modality	2026-02-07 03:38:57.164489
22	021_create-schedules-schema	2026-02-07 03:38:57.164489
23	022_create-function-deployments	2026-02-07 03:38:57.164489
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: system; Owner: postgres
--

COPY system.secrets (id, key, value_ciphertext, is_active, last_used_at, expires_at, created_at, updated_at, is_reserved) FROM stdin;
0b9af260-6460-4768-9a82-30c4bd95f8ba	INSFORGE_INTERNAL_URL	8f4ac9ee1881bab9c851b0426b3cfdd4:fe758c20de9dcdb2aa85b7c4b14bb164:2384e02363009b6f0a800f99b9b4282d253816dc	t	\N	\N	2026-02-07 03:39:06.105361+00	2026-02-07 03:39:06.105361+00	t
f34c4e07-0153-448f-8c9b-6ddaf2b0eda8	ANON_KEY	f344f32129948ef43a95f30d7006a210:025583a9bd241ad1cba7dbfbc1734651:d45d7c431e64ccb76918deb3726e653c16d5a02675fa0a55b855e52157740dea3bf43ce42fbb4def99d70e9101466669abad69e1ffd8f0668e06ef341d57fb4787a243e4d2489b954e8d23b563682a848c08c69b488fad42817dcffd7b50e7b457d37c3259eb7511c1c21e0945560c9578396e37168966d3a62e6fddddf27f14f6c3a2136dc8db9a3b505c98dcfbd61f051b608aa77321f80557795e74e0026b301fdd56b95ad844761fb8c8f781123b5e5d905f3880a86def8e5af1cd1e24b63cb1857b72edbcfe7ecb4ed7a782e69f31e0e5de4c151bfa66d966af54	t	\N	\N	2026-02-07 03:39:06.111026+00	2026-02-07 03:39:06.111026+00	t
e15b03f4-e24c-4ced-9303-6751bfec7abb	INSFORGE_BASE_URL	be721405d75443ab54b8370b8e98bb53:742c6b1e62cbbe201d847a803dbbc5fc:4ce7cd26f3bb8c70f10554f2083688a610e26290013e4e0883f0937298e83cb66a7d486441	t	\N	\N	2026-02-07 03:39:06.114567+00	2026-02-07 03:39:06.114567+00	t
e5c90a65-5e8f-44c9-95cb-e06a08a60bde	API_KEY	f2ffe5b744ff014c68b93ccfc7dcce15:a61d78c7445b73b53c9267d05dd6dfa9:8470571095d95d8a69482d3f530fe33401fabf533a164626a6e270ee3fa282e5a83c19	t	2026-02-23 09:03:21.763351+00	\N	2026-02-07 03:39:05.795928+00	2026-02-23 09:03:21.763351+00	t
\.


--
-- Name: jobid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.jobid_seq', 1, false);


--
-- Name: runid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.runid_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: system; Owner: postgres
--

SELECT pg_catalog.setval('system.migrations_id_seq', 23, true);


--
-- Name: configs _ai_configs_model_id_key; Type: CONSTRAINT; Schema: ai; Owner: postgres
--

ALTER TABLE ONLY ai.configs
    ADD CONSTRAINT _ai_configs_model_id_key UNIQUE (model_id);


--
-- Name: configs _ai_configs_pkey; Type: CONSTRAINT; Schema: ai; Owner: postgres
--

ALTER TABLE ONLY ai.configs
    ADD CONSTRAINT _ai_configs_pkey PRIMARY KEY (id);


--
-- Name: usage _ai_usage_pkey; Type: CONSTRAINT; Schema: ai; Owner: postgres
--

ALTER TABLE ONLY ai.usage
    ADD CONSTRAINT _ai_usage_pkey PRIMARY KEY (id);


--
-- Name: user_providers _account_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_providers
    ADD CONSTRAINT _account_pkey PRIMARY KEY (id);


--
-- Name: user_providers _account_provider_provider_account_id_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_providers
    ADD CONSTRAINT _account_provider_provider_account_id_key UNIQUE (provider, provider_account_id);


--
-- Name: configs _auth_configs_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.configs
    ADD CONSTRAINT _auth_configs_pkey PRIMARY KEY (id);


--
-- Name: email_otps _email_otps_email_purpose_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.email_otps
    ADD CONSTRAINT _email_otps_email_purpose_key UNIQUE (email, purpose);


--
-- Name: email_otps _email_otps_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.email_otps
    ADD CONSTRAINT _email_otps_pkey PRIMARY KEY (id);


--
-- Name: oauth_configs _oauth_configs_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.oauth_configs
    ADD CONSTRAINT _oauth_configs_pkey PRIMARY KEY (id);


--
-- Name: oauth_configs _oauth_configs_provider_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.oauth_configs
    ADD CONSTRAINT _oauth_configs_provider_key UNIQUE (provider);


--
-- Name: users _user_email_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT _user_email_key UNIQUE (email);


--
-- Name: users _user_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT _user_pkey PRIMARY KEY (id);


--
-- Name: definitions _edge_functions_pkey; Type: CONSTRAINT; Schema: functions; Owner: postgres
--

ALTER TABLE ONLY functions.definitions
    ADD CONSTRAINT _edge_functions_pkey PRIMARY KEY (id);


--
-- Name: definitions _edge_functions_slug_key; Type: CONSTRAINT; Schema: functions; Owner: postgres
--

ALTER TABLE ONLY functions.definitions
    ADD CONSTRAINT _edge_functions_slug_key UNIQUE (slug);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: functions; Owner: postgres
--

ALTER TABLE ONLY functions.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: cafe_menu_categories cafe_menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_menu_categories
    ADD CONSTRAINT cafe_menu_categories_pkey PRIMARY KEY (id);


--
-- Name: cafe_menu_items cafe_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_menu_items
    ADD CONSTRAINT cafe_menu_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: room_images room_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_images
    ADD CONSTRAINT room_images_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: site_content site_content_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_content
    ADD CONSTRAINT site_content_key_key UNIQUE (key);


--
-- Name: site_content site_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_content
    ADD CONSTRAINT site_content_pkey PRIMARY KEY (id);


--
-- Name: site_images site_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_images
    ADD CONSTRAINT site_images_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pattern_key; Type: CONSTRAINT; Schema: realtime; Owner: postgres
--

ALTER TABLE ONLY realtime.channels
    ADD CONSTRAINT channels_pattern_key UNIQUE (pattern);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: realtime; Owner: postgres
--

ALTER TABLE ONLY realtime.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: postgres
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: job_logs job_logs_pkey; Type: CONSTRAINT; Schema: schedules; Owner: postgres
--

ALTER TABLE ONLY schedules.job_logs
    ADD CONSTRAINT job_logs_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: schedules; Owner: postgres
--

ALTER TABLE ONLY schedules.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: buckets _storage_buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT _storage_buckets_pkey PRIMARY KEY (name);


--
-- Name: objects _storage_pkey; Type: CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT _storage_pkey PRIMARY KEY (bucket, key);


--
-- Name: audit_logs _audit_logs_pkey; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.audit_logs
    ADD CONSTRAINT _audit_logs_pkey PRIMARY KEY (id);


--
-- Name: mcp_usage _mcp_usage_pkey; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.mcp_usage
    ADD CONSTRAINT _mcp_usage_pkey PRIMARY KEY (id);


--
-- Name: secrets _secrets_name_key; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.secrets
    ADD CONSTRAINT _secrets_name_key UNIQUE (key);


--
-- Name: secrets _secrets_pkey; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.secrets
    ADD CONSTRAINT _secrets_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_provider_deployment_id_key; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.deployments
    ADD CONSTRAINT deployments_provider_deployment_id_key UNIQUE (provider_deployment_id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: system; Owner: postgres
--

ALTER TABLE ONLY system.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_configs_input_modality; Type: INDEX; Schema: ai; Owner: postgres
--

CREATE INDEX idx_ai_configs_input_modality ON ai.configs USING gin (input_modality);


--
-- Name: idx_ai_configs_output_modality; Type: INDEX; Schema: ai; Owner: postgres
--

CREATE INDEX idx_ai_configs_output_modality ON ai.configs USING gin (output_modality);


--
-- Name: idx_ai_usage_config_id; Type: INDEX; Schema: ai; Owner: postgres
--

CREATE INDEX idx_ai_usage_config_id ON ai.usage USING btree (config_id);


--
-- Name: idx_ai_usage_created_at; Type: INDEX; Schema: ai; Owner: postgres
--

CREATE INDEX idx_ai_usage_created_at ON ai.usage USING btree (created_at DESC);


--
-- Name: idx_ai_usage_model_id; Type: INDEX; Schema: ai; Owner: postgres
--

CREATE INDEX idx_ai_usage_model_id ON ai.usage USING btree (model_id);


--
-- Name: idx_auth_configs_singleton; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX idx_auth_configs_singleton ON auth.configs USING btree ((1));


--
-- Name: idx_email_otps_email_purpose; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_email_otps_email_purpose ON auth.email_otps USING btree (email, purpose);


--
-- Name: idx_email_otps_expires_at; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_email_otps_expires_at ON auth.email_otps USING btree (expires_at);


--
-- Name: idx_email_otps_otp_hash; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_email_otps_otp_hash ON auth.email_otps USING btree (otp_hash);


--
-- Name: idx_oauth_configs_provider; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_oauth_configs_provider ON auth.oauth_configs USING btree (provider);


--
-- Name: idx_function_deployments_created; Type: INDEX; Schema: functions; Owner: postgres
--

CREATE INDEX idx_function_deployments_created ON functions.deployments USING btree (created_at DESC);


--
-- Name: idx_function_deployments_status; Type: INDEX; Schema: functions; Owner: postgres
--

CREATE INDEX idx_function_deployments_status ON functions.deployments USING btree (status);


--
-- Name: idx_blocked_dates_room; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocked_dates_room ON public.blocked_dates USING btree (room_id, start_date, end_date);


--
-- Name: idx_bookings_room_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_room_dates ON public.bookings USING btree (room_id, check_in, check_out);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (booking_status);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_category ON public.cafe_menu_items USING btree (category_id, sort_order);


--
-- Name: idx_room_images_room; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_room_images_room ON public.room_images USING btree (room_id, sort_order);


--
-- Name: idx_realtime_channels_enabled; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_channels_enabled ON realtime.channels USING btree (enabled);


--
-- Name: idx_realtime_channels_pattern; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_channels_pattern ON realtime.channels USING btree (pattern);


--
-- Name: idx_realtime_messages_channel_id; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_messages_channel_id ON realtime.messages USING btree (channel_id);


--
-- Name: idx_realtime_messages_channel_name; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_messages_channel_name ON realtime.messages USING btree (channel_name);


--
-- Name: idx_realtime_messages_created_at; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_messages_created_at ON realtime.messages USING btree (created_at DESC);


--
-- Name: idx_realtime_messages_event_name; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_messages_event_name ON realtime.messages USING btree (event_name);


--
-- Name: idx_realtime_messages_sender; Type: INDEX; Schema: realtime; Owner: postgres
--

CREATE INDEX idx_realtime_messages_sender ON realtime.messages USING btree (sender_type, sender_id);


--
-- Name: idx_job_logs_executed_at; Type: INDEX; Schema: schedules; Owner: postgres
--

CREATE INDEX idx_job_logs_executed_at ON schedules.job_logs USING btree (executed_at DESC);


--
-- Name: idx_job_logs_job_id; Type: INDEX; Schema: schedules; Owner: postgres
--

CREATE INDEX idx_job_logs_job_id ON schedules.job_logs USING btree (job_id);


--
-- Name: idx_jobs_cron_job_id; Type: INDEX; Schema: schedules; Owner: postgres
--

CREATE INDEX idx_jobs_cron_job_id ON schedules.jobs USING btree (cron_job_id);


--
-- Name: idx_jobs_is_active; Type: INDEX; Schema: schedules; Owner: postgres
--

CREATE INDEX idx_jobs_is_active ON schedules.jobs USING btree (is_active);


--
-- Name: idx_storage_uploaded_by; Type: INDEX; Schema: storage; Owner: postgres
--

CREATE INDEX idx_storage_uploaded_by ON storage.objects USING btree (uploaded_by);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor ON system.audit_logs USING btree (actor);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON system.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_audit_logs_module ON system.audit_logs USING btree (module);


--
-- Name: idx_deployments_created_at; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_deployments_created_at ON system.deployments USING btree (created_at DESC);


--
-- Name: idx_deployments_provider; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_deployments_provider ON system.deployments USING btree (provider);


--
-- Name: idx_deployments_status; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_deployments_status ON system.deployments USING btree (status);


--
-- Name: idx_mcp_usage_created_at; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_mcp_usage_created_at ON system.mcp_usage USING btree (created_at DESC);


--
-- Name: idx_secrets_name; Type: INDEX; Schema: system; Owner: postgres
--

CREATE INDEX idx_secrets_name ON system.secrets USING btree (key);


--
-- Name: configs update_configs_updated_at; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER update_configs_updated_at BEFORE UPDATE ON auth.configs FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: email_otps update_email_otps_updated_at; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER update_email_otps_updated_at BEFORE UPDATE ON auth.email_otps FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: oauth_configs update_oauth_configs_updated_at; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER update_oauth_configs_updated_at BEFORE UPDATE ON auth.oauth_configs FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: definitions update_definitions_updated_at; Type: TRIGGER; Schema: functions; Owner: postgres
--

CREATE TRIGGER update_definitions_updated_at BEFORE UPDATE ON functions.definitions FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: orders order_new_realtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER order_new_realtime AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();


--
-- Name: orders order_status_realtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER order_status_realtime AFTER UPDATE ON public.orders FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: messages trg_message_notify; Type: TRIGGER; Schema: realtime; Owner: postgres
--

CREATE TRIGGER trg_message_notify AFTER INSERT ON realtime.messages FOR EACH ROW EXECUTE FUNCTION realtime.notify_on_message_insert();


--
-- Name: channels update_channels_updated_at; Type: TRIGGER; Schema: realtime; Owner: postgres
--

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON realtime.channels FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: jobs trg_jobs_updated_at; Type: TRIGGER; Schema: schedules; Owner: postgres
--

CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON schedules.jobs FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: audit_logs update_audit_logs_updated_at; Type: TRIGGER; Schema: system; Owner: postgres
--

CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON system.audit_logs FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: secrets update_secrets_updated_at; Type: TRIGGER; Schema: system; Owner: postgres
--

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON system.secrets FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: deployments update_system_deployments_updated_at; Type: TRIGGER; Schema: system; Owner: postgres
--

CREATE TRIGGER update_system_deployments_updated_at BEFORE UPDATE ON system.deployments FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();


--
-- Name: usage usage_config_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: postgres
--

ALTER TABLE ONLY ai.usage
    ADD CONSTRAINT usage_config_id_fkey FOREIGN KEY (config_id) REFERENCES ai.configs(id);


--
-- Name: user_providers _account_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_providers
    ADD CONSTRAINT _account_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_configs oauth_configs_secret_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.oauth_configs
    ADD CONSTRAINT oauth_configs_secret_id_fkey FOREIGN KEY (secret_id) REFERENCES system.secrets(id) ON DELETE RESTRICT;


--
-- Name: user_providers user_providers_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_providers
    ADD CONSTRAINT user_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blocked_dates blocked_dates_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE RESTRICT;


--
-- Name: cafe_menu_items cafe_menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_menu_items
    ADD CONSTRAINT cafe_menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.cafe_menu_categories(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: room_images room_images_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_images
    ADD CONSTRAINT room_images_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: realtime; Owner: postgres
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES realtime.channels(id) ON DELETE SET NULL;


--
-- Name: job_logs job_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: schedules; Owner: postgres
--

ALTER TABLE ONLY schedules.job_logs
    ADD CONSTRAINT job_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES schedules.jobs(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucket_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_bucket_fkey FOREIGN KEY (bucket) REFERENCES storage.buckets(name) ON DELETE CASCADE;


--
-- Name: objects objects_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: users Public can view user profiles; Type: POLICY; Schema: auth; Owner: postgres
--

CREATE POLICY "Public can view user profiles" ON auth.users FOR SELECT USING (true);


--
-- Name: users Users can update own profile; Type: POLICY; Schema: auth; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON auth.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: users project_admin_policy; Type: POLICY; Schema: auth; Owner: postgres
--

CREATE POLICY project_admin_policy ON auth.users TO project_admin USING (true) WITH CHECK (true);


--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: postgres
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA auth TO PUBLIC;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO project_admin;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO anon;


--
-- Name: FUNCTION channel_name(); Type: ACL; Schema: realtime; Owner: postgres
--

GRANT ALL ON FUNCTION realtime.channel_name() TO authenticated;
GRANT ALL ON FUNCTION realtime.channel_name() TO anon;


--
-- Name: FUNCTION publish(p_channel_name text, p_event_name text, p_payload jsonb); Type: ACL; Schema: realtime; Owner: postgres
--

REVOKE ALL ON FUNCTION realtime.publish(p_channel_name text, p_event_name text, p_payload jsonb) FROM PUBLIC;


--
-- Name: TABLE configs; Type: ACL; Schema: ai; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.configs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.configs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.configs TO project_admin;


--
-- Name: TABLE usage; Type: ACL; Schema: ai; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.usage TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.usage TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE ai.usage TO project_admin;


--
-- Name: TABLE configs; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.configs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.configs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.configs TO project_admin;


--
-- Name: TABLE email_otps; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.email_otps TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.email_otps TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.email_otps TO project_admin;


--
-- Name: TABLE oauth_configs; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_configs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_configs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_configs TO project_admin;


--
-- Name: TABLE user_providers; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.user_providers TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.user_providers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.user_providers TO project_admin;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.users TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.users TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.users TO project_admin;


--
-- Name: COLUMN users.id; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT(id) ON TABLE auth.users TO PUBLIC;


--
-- Name: COLUMN users.created_at; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT(created_at) ON TABLE auth.users TO PUBLIC;


--
-- Name: COLUMN users.profile; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT(profile),UPDATE(profile) ON TABLE auth.users TO PUBLIC;


--
-- Name: TABLE definitions; Type: ACL; Schema: functions; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE functions.definitions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE functions.definitions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE functions.definitions TO project_admin;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_users TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_users TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_users TO project_admin;


--
-- Name: TABLE blocked_dates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.blocked_dates TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.blocked_dates TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.blocked_dates TO project_admin;


--
-- Name: TABLE bookings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.bookings TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.bookings TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.bookings TO project_admin;


--
-- Name: TABLE cafe_menu_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_categories TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_categories TO project_admin;


--
-- Name: TABLE cafe_menu_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_items TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_items TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_menu_items TO project_admin;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO project_admin;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.order_items TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.order_items TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.order_items TO project_admin;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.orders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.orders TO project_admin;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO project_admin;


--
-- Name: TABLE room_images; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_images TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_images TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_images TO project_admin;


--
-- Name: TABLE rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rooms TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rooms TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rooms TO project_admin;


--
-- Name: TABLE site_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_content TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_content TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_content TO project_admin;


--
-- Name: TABLE site_images; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_images TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_images TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.site_images TO project_admin;


--
-- Name: TABLE channels; Type: ACL; Schema: realtime; Owner: postgres
--

GRANT SELECT ON TABLE realtime.channels TO authenticated;
GRANT SELECT ON TABLE realtime.channels TO anon;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: postgres
--

GRANT INSERT ON TABLE realtime.messages TO authenticated;
GRANT INSERT ON TABLE realtime.messages TO anon;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.buckets TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.buckets TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.buckets TO project_admin;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.objects TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.objects TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.objects TO project_admin;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: system; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.audit_logs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.audit_logs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.audit_logs TO project_admin;


--
-- Name: TABLE mcp_usage; Type: ACL; Schema: system; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.mcp_usage TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.mcp_usage TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.mcp_usage TO project_admin;


--
-- Name: TABLE secrets; Type: ACL; Schema: system; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.secrets TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.secrets TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE system.secrets TO project_admin;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO project_admin;


--
-- Name: create_policies_on_rls_enable; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER create_policies_on_rls_enable ON ddl_command_end
         WHEN TAG IN ('ALTER TABLE')
   EXECUTE FUNCTION system.create_policies_after_rls();


ALTER EVENT TRIGGER create_policies_on_rls_enable OWNER TO postgres;

--
-- Name: create_policies_on_table_create; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER create_policies_on_table_create ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE')
   EXECUTE FUNCTION system.create_default_policies();


ALTER EVENT TRIGGER create_policies_on_table_create OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

\unrestrict VxXYZqtFMfbc8NIn62QPjDwcpac8Pw34gIi2yszLgQfKzcTSeTx4RcdI2k3LsSE

--
-- Migration: Cafe ordering (order_number + cafe_order_items)
--

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEXTVAL('public.order_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

CREATE TABLE IF NOT EXISTS public.cafe_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid,
    item_name text NOT NULL,
    quantity integer NOT NULL,
    price_at_purchase numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cafe_order_items OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_cafe_order_items_order ON public.cafe_order_items(order_id);

ALTER TABLE ONLY public.cafe_order_items
    ADD CONSTRAINT cafe_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cafe_order_items
    ADD CONSTRAINT cafe_order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.cafe_menu_items(id);
ALTER TABLE ONLY public.cafe_order_items
    ADD CONSTRAINT cafe_order_items_pkey PRIMARY KEY (id);

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_order_items TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_order_items TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cafe_order_items TO project_admin;

GRANT USAGE ON SEQUENCE public.order_number_seq TO anon;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO project_admin;

