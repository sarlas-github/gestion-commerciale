SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict feRWYZetEcecesrUG1WG4lHZZ6GLoXelk4VReF2Z59Y9Dpu78l0F9DIloHbGGBl

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '270e16d1-e4d8-4384-91fc-8ec102fddedc', 'authenticated', 'authenticated', 'zakaria.gestioncommerciale@gmail.com', '$2a$10$NpwUju42cqCkpq1rKqmN5OAcZjD8UOC2HDCmy8bIhR6yzY.SYSuYm', '2026-05-07 13:38:56.783845+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-07 17:27:24.248468+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-05-07 13:38:56.768161+00', '2026-05-07 17:27:24.264009+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'authenticated', 'authenticated', 'test.abderrazzak@gmail.com', '$2a$10$vwdLwBysn1AME4LjZl2iy.ZTZwQSUR0m9KVKHsG1Fw9GpX47IxysW', '2026-05-01 17:18:38.829842+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-09 16:41:45.996232+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-05-01 17:18:38.813412+00', '2026-05-11 13:11:52.794611+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '7af58026-049f-4cb7-96fc-32653c17a011', 'authenticated', 'authenticated', 'laasri.sarah@gmail.com', '$2a$10$kNHOslrtG3lHEiN3fl5iSeK1l/fU/lZDw/RgIfTta/P1Ay2FCFYVi', '2026-04-28 21:51:25.37387+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-11 09:35:22.434963+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-04-28 21:51:25.355666+00', '2026-05-11 13:13:04.6552+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'authenticated', 'authenticated', 'khadamat@gmail.com', '$2a$10$FbEw0RLUhUOyG0pwF2Zt4uc.eA/AnSmnh0OaTsl2lqQ1cbzPVO5GK', '2026-04-30 00:46:43.308447+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-09 11:25:48.51847+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-04-30 00:46:43.296456+00', '2026-05-10 22:37:37.329307+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('7af58026-049f-4cb7-96fc-32653c17a011', '7af58026-049f-4cb7-96fc-32653c17a011', '{"sub": "7af58026-049f-4cb7-96fc-32653c17a011", "email": "laasri.sarah@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-28 21:51:25.366434+00', '2026-04-28 21:51:25.36649+00', '2026-04-28 21:51:25.36649+00', 'f6c5f2bf-b892-419e-8ab3-ecdd54282949'),
	('0171ae54-3906-4cc6-b8a7-95166f6ca98c', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '{"sub": "0171ae54-3906-4cc6-b8a7-95166f6ca98c", "email": "khadamat@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-30 00:46:43.303948+00', '2026-04-30 00:46:43.304009+00', '2026-04-30 00:46:43.304009+00', '7161b1dd-a976-41e7-890e-e74132d01160'),
	('f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '{"sub": "f4c78c15-fda1-4c6c-ba8c-786917bf28ed", "email": "test.abderrazzak@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-01 17:18:38.825133+00', '2026-05-01 17:18:38.825186+00', '2026-05-01 17:18:38.825186+00', '4bc9c788-522e-4a75-9c06-34bb15ce66be'),
	('270e16d1-e4d8-4384-91fc-8ec102fddedc', '270e16d1-e4d8-4384-91fc-8ec102fddedc', '{"sub": "270e16d1-e4d8-4384-91fc-8ec102fddedc", "email": "zakaria.gestioncommerciale@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-07 13:38:56.778548+00', '2026-05-07 13:38:56.778602+00', '2026-05-07 13:38:56.778602+00', '47e72fb5-9662-4308-985c-9a5258ceabe3');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('1231003d-ba1c-453c-a739-c2854347d6c8', '7af58026-049f-4cb7-96fc-32653c17a011', '2026-05-11 09:35:22.435092+00', '2026-05-11 12:14:52.431747+00', NULL, 'aal1', NULL, '2026-05-11 12:14:52.431654', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '41.140.241.212', NULL, NULL, NULL, NULL, NULL),
	('7063dce8-b112-465c-a457-47882c0a4b5f', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '2026-05-09 16:41:46.006443+00', '2026-05-11 13:11:52.809919+00', NULL, 'aal1', NULL, '2026-05-11 13:11:52.809806', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '41.140.241.212', NULL, NULL, NULL, NULL, NULL),
	('8253407d-c4bb-49f9-a4ee-61dabe4dffcc', '7af58026-049f-4cb7-96fc-32653c17a011', '2026-05-10 22:49:59.139449+00', '2026-05-11 13:13:04.667896+00', NULL, 'aal1', NULL, '2026-05-11 13:13:04.667771', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '41.140.241.212', NULL, NULL, NULL, NULL, NULL),
	('ea3e9d25-f24e-4d05-8beb-de8993273504', '7af58026-049f-4cb7-96fc-32653c17a011', '2026-05-10 22:38:02.337023+00', '2026-05-11 09:35:22.396463+00', NULL, 'aal1', NULL, '2026-05-11 09:35:22.396295', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '41.140.241.212', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('7063dce8-b112-465c-a457-47882c0a4b5f', '2026-05-09 16:41:46.055545+00', '2026-05-09 16:41:46.055545+00', 'password', '48a4f4e5-2286-4af4-93a0-71c354faba69'),
	('ea3e9d25-f24e-4d05-8beb-de8993273504', '2026-05-10 22:38:02.361533+00', '2026-05-10 22:38:02.361533+00', 'password', 'd0ab0ea1-2521-4efe-bce6-fd329303ff26'),
	('8253407d-c4bb-49f9-a4ee-61dabe4dffcc', '2026-05-10 22:49:59.156937+00', '2026-05-10 22:49:59.156937+00', 'password', '5eb03bcb-a67d-44a0-a93d-dd825e7bea74'),
	('1231003d-ba1c-453c-a739-c2854347d6c8', '2026-05-11 09:35:22.461977+00', '2026-05-11 09:35:22.461977+00', 'password', '2c74e0c0-4270-46ef-8d00-5ef93664a44a');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 309, 'zs4ecdcp2eit', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', true, '2026-05-09 16:41:46.040206+00', '2026-05-09 20:27:59.60184+00', NULL, '7063dce8-b112-465c-a457-47882c0a4b5f'),
	('00000000-0000-0000-0000-000000000000', 318, 'uypw7pdinjvf', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-10 22:38:02.349908+00', '2026-05-11 06:34:39.965784+00', NULL, 'ea3e9d25-f24e-4d05-8beb-de8993273504'),
	('00000000-0000-0000-0000-000000000000', 320, 'j7wqtvl4wpfs', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 06:34:39.988683+00', '2026-05-11 07:33:39.491753+00', 'uypw7pdinjvf', 'ea3e9d25-f24e-4d05-8beb-de8993273504'),
	('00000000-0000-0000-0000-000000000000', 319, 'qhps75xu5zp5', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-10 22:49:59.152493+00', '2026-05-11 07:45:44.34622+00', NULL, '8253407d-c4bb-49f9-a4ee-61dabe4dffcc'),
	('00000000-0000-0000-0000-000000000000', 321, 'fhnbbn7xskjj', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 07:33:39.506051+00', '2026-05-11 09:35:22.363256+00', 'j7wqtvl4wpfs', 'ea3e9d25-f24e-4d05-8beb-de8993273504'),
	('00000000-0000-0000-0000-000000000000', 323, '7v5vdpm6fwuy', '7af58026-049f-4cb7-96fc-32653c17a011', false, '2026-05-11 09:35:22.373106+00', '2026-05-11 09:35:22.373106+00', 'fhnbbn7xskjj', 'ea3e9d25-f24e-4d05-8beb-de8993273504'),
	('00000000-0000-0000-0000-000000000000', 322, '464xrcgiwje7', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 07:45:44.352767+00', '2026-05-11 09:55:23.372799+00', 'qhps75xu5zp5', '8253407d-c4bb-49f9-a4ee-61dabe4dffcc'),
	('00000000-0000-0000-0000-000000000000', 324, 'amhpgebzlirc', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 09:35:22.449879+00', '2026-05-11 10:34:57.355782+00', NULL, '1231003d-ba1c-453c-a739-c2854347d6c8'),
	('00000000-0000-0000-0000-000000000000', 325, 'ih4kcsg6p5ds', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 09:55:23.38085+00', '2026-05-11 11:38:55.684932+00', '464xrcgiwje7', '8253407d-c4bb-49f9-a4ee-61dabe4dffcc'),
	('00000000-0000-0000-0000-000000000000', 326, 'ou7ftiasnuxt', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 10:34:57.365399+00', '2026-05-11 12:14:52.415832+00', 'amhpgebzlirc', '1231003d-ba1c-453c-a739-c2854347d6c8'),
	('00000000-0000-0000-0000-000000000000', 328, 'q5xvosjsvvwq', '7af58026-049f-4cb7-96fc-32653c17a011', false, '2026-05-11 12:14:52.423713+00', '2026-05-11 12:14:52.423713+00', 'ou7ftiasnuxt', '1231003d-ba1c-453c-a739-c2854347d6c8'),
	('00000000-0000-0000-0000-000000000000', 311, 'l7j4cgcls72j', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', true, '2026-05-09 20:27:59.623853+00', '2026-05-11 13:11:52.784034+00', 'zs4ecdcp2eit', '7063dce8-b112-465c-a457-47882c0a4b5f'),
	('00000000-0000-0000-0000-000000000000', 329, 'liskdti2c3o3', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', false, '2026-05-11 13:11:52.79005+00', '2026-05-11 13:11:52.79005+00', 'l7j4cgcls72j', '7063dce8-b112-465c-a457-47882c0a4b5f'),
	('00000000-0000-0000-0000-000000000000', 327, 'sfclvskqsnkk', '7af58026-049f-4cb7-96fc-32653c17a011', true, '2026-05-11 11:38:55.694332+00', '2026-05-11 13:13:04.637562+00', 'ih4kcsg6p5ds', '8253407d-c4bb-49f9-a4ee-61dabe4dffcc'),
	('00000000-0000-0000-0000-000000000000', 330, 'o2ng6dxjdpmr', '7af58026-049f-4cb7-96fc-32653c17a011', false, '2026-05-11 13:13:04.644472+00', '2026-05-11 13:13:04.644472+00', 'sfclvskqsnkk', '8253407d-c4bb-49f9-a4ee-61dabe4dffcc');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."clients" ("id", "user_id", "name", "phone", "address", "ice", "created_at", "updated_at") VALUES
	('68618da8-e2b3-45d6-940d-a6d2b4786c34', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Entreprise Alpha', '0600112233', '123 Rue de la Paix, Casablanca', '111111111111111', '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('c83078d1-872d-41b5-971d-6ca8799f4e9b', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Boutique Beta', '0611223344', '45 Boulevard Anfa, Rabat', '222222222222222', '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('dafdc3e4-dc05-4717-b442-ec5e90c3d5e5', '7af58026-049f-4cb7-96fc-32653c17a011', 'test', '0669295800', '', '', '2026-05-01 09:16:26.707398+00', '2026-05-01 09:16:26.707398+00'),
	('d655b5ae-368f-43ec-9f66-eaee2009b0c1', '7af58026-049f-4cb7-96fc-32653c17a011', 'testoneeee', '', '', '', '2026-05-01 09:17:01.20755+00', '2026-05-01 09:32:53.821456+00'),
	('5889037b-50c3-4b40-90c6-2d1a97328a1f', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'anuar el chahidi', '0698475324', 'tetuane', NULL, '2026-05-02 11:35:18.782854+00', '2026-05-02 11:35:18.782854+00'),
	('f6a2e676-81bb-4a67-b963-c514af6ba66d', '7af58026-049f-4cb7-96fc-32653c17a011', 'mon client 11', '0698888777', 'Rue fenikiyine iberia', '123456789', '2026-05-01 09:16:53.05243+00', '2026-05-03 11:15:50.718803+00'),
	('6fbfdb31-e5f3-449e-b8ee-f23e8d84a84f', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'ftah casa', '0653553353', 'casa', NULL, '2026-05-04 12:13:12.36387+00', '2026-05-04 12:13:12.36387+00'),
	('f3260e09-1f24-4c9a-a266-2943ae15cba7', '7af58026-049f-4cb7-96fc-32653c17a011', 'sarra lassrii', '0669295800', 'rue fnikiyine', '1256788999', '2026-04-29 08:57:00.046796+00', '2026-05-04 13:34:49.413944+00'),
	('7f830611-60aa-48d7-bf91-1aae11042c05', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Consulting Gamma', '0669295800', '78 Avenue Hassan II, Marrakech', '333333333333333', '2026-04-30 16:18:53.871739+00', '2026-05-04 13:49:14.050348+00');


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sales" ("id", "user_id", "client_id", "date", "total", "paid", "status", "note", "created_at", "updated_at", "reference", "tva_rate", "tva_amount") VALUES
	('ed731313-604d-41ad-b3f0-8f716716b04d', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-04-29', 1200.00, 600.00, 'partial', 'nt1', '2026-04-29 19:03:43.147162+00', '2026-04-30 01:43:38.640194+00', 'VEN-2026-004', 0.00, 0.00),
	('22c11683-e6d4-41e3-98c7-6314157f92e2', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '5889037b-50c3-4b40-90c6-2d1a97328a1f', '2026-05-05', 3744.00, 3000.00, 'partial', NULL, '2026-05-05 16:04:41.811895+00', '2026-05-05 16:04:41.811895+00', 'VEN-2026-007', 20.00, 624.00),
	('d1474c0d-7904-4e0a-88b6-cb4b9a52b27b', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-05', 330.00, 100.00, 'partial', NULL, '2026-05-05 10:36:21.163596+00', '2026-05-07 14:12:35.839135+00', 'VEN-2026-013', 10.00, 30.00),
	('d9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '2026-05-07', 1760.00, 1700.00, 'partial', NULL, '2026-05-07 15:02:45.531365+00', '2026-05-07 15:02:45.531365+00', 'VEN-2026-014', 10.00, 160.00),
	('80219446-f6ff-45d0-b235-fad600958b98', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '2026-05-02', 3300.00, 3300.00, 'paid', NULL, '2026-05-02 16:38:22.994987+00', '2026-05-02 17:06:37.49657+00', 'VEN-2026-005', 10.00, 300.00),
	('dcde1247-9b5f-471c-a2b8-a024fcef34a2', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '2026-05-03', 3300.00, 0.00, 'unpaid', 'ma ant eimprimee', '2026-05-03 11:09:43.017895+00', '2026-05-03 11:24:39.004586+00', 'VEN-2026-006', 10.00, 300.00),
	('b5d5fd01-1a7f-4ff1-a734-578d325d9039', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '5889037b-50c3-4b40-90c6-2d1a97328a1f', '2026-05-02', 175.00, 100.00, 'partial', NULL, '2026-05-02 11:37:28.805694+00', '2026-05-04 12:10:25.236114+00', 'VEN-2026-001', 0.00, 0.00),
	('b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '6fbfdb31-e5f3-449e-b8ee-f23e8d84a84f', '2026-05-04', 5908.80, 5000.00, 'partial', NULL, '2026-05-04 12:14:42.37718+00', '2026-05-04 12:14:42.37718+00', 'VEN-2026-002', 20.00, 984.80),
	('4d2931a3-3cc0-49d7-a686-1c00454e6e2a', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-04', 4400.00, 0.00, 'unpaid', 'Ma note', '2026-05-04 13:09:38.676618+00', '2026-05-04 13:09:38.676618+00', 'VEN-2026-007', 10.00, 400.00),
	('5191ca98-e6d0-4519-8fe4-751b41b6c2a8', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-04', 880.00, 0.00, 'unpaid', 'venete to test', '2026-05-04 13:22:08.443456+00', '2026-05-04 13:22:08.443456+00', 'VEN-2026-008', 10.00, 80.00),
	('e23a6517-6e85-4cc6-b1bc-d9fd31e2c136', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-04', 3300.00, 0.00, 'unpaid', NULL, '2026-05-04 13:35:51.552562+00', '2026-05-04 13:35:51.552562+00', 'VEN-2026-009', 10.00, 300.00),
	('db379efe-8d8b-4ff4-bd28-1944ebe9df90', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '6fbfdb31-e5f3-449e-b8ee-f23e8d84a84f', '2026-05-03', 11616.00, 5000.00, 'partial', NULL, '2026-05-04 16:40:03.657205+00', '2026-05-04 16:40:03.657205+00', 'VEN-2026-005', 20.00, 1936.00),
	('78df4434-d15f-4713-b7c8-711b8f3d1f66', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '5889037b-50c3-4b40-90c6-2d1a97328a1f', '2026-05-04', 1038.72, 0.00, 'unpaid', NULL, '2026-05-04 16:46:06.142416+00', '2026-05-04 16:46:06.142416+00', 'VEN-2026-006', 20.00, 173.12),
	('0826b1ed-3de9-4a7c-aa49-70964e672b64', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-05', 330.00, 0.00, 'unpaid', NULL, '2026-05-05 06:07:41.7434+00', '2026-05-05 06:07:41.7434+00', 'VEN-2026-010', 10.00, 30.00),
	('609c9cdd-631f-4037-9b8b-4a8a671fee2c', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '2026-05-05', 220.00, 220.00, 'paid', NULL, '2026-05-05 06:10:00.774053+00', '2026-05-05 06:10:00.774053+00', 'VEN-2026-011', 10.00, 20.00),
	('31dbcaee-c8b3-473b-823b-2fe530933cf0', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-05', 330.00, 330.00, 'paid', NULL, '2026-05-05 06:42:49.5786+00', '2026-05-05 06:43:36.749019+00', 'VEN-2026-012', 10.00, 30.00),
	('43ef9c93-ae80-47e2-86b0-f315b8ab70d1', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-07', 110.00, 105.00, 'partial', NULL, '2026-05-07 15:44:41.086688+00', '2026-05-07 15:53:16.998555+00', 'VEN-2026-015', 10.00, 10.00),
	('a5edd236-5885-40d8-852c-0f6257123738', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '2026-05-07', 1100.00, 1100.00, 'paid', NULL, '2026-05-07 15:54:21.816818+00', '2026-05-07 15:54:21.816818+00', 'VEN-2026-016', 10.00, 100.00),
	('ae5f64f0-3c39-4e9a-9e95-d486af4813d3', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '2026-05-08', 110.00, 0.00, 'unpaid', NULL, '2026-05-08 20:16:13.533977+00', '2026-05-08 20:16:13.533977+00', 'VEN-2026-018', 10.00, 10.00),
	('b52c3ee9-9193-49a2-8e58-a615c90ad31a', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'c83078d1-872d-41b5-971d-6ca8799f4e9b', '2026-05-09', 3300.00, 0.00, 'cancelled', NULL, '2026-05-09 13:18:45.430538+00', '2026-05-09 13:18:55.842039+00', 'VEN-2026-001', 10.00, 300.00),
	('83c6d4a9-1ba1-4ee7-9fb6-34b9e62f81d5', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '68618da8-e2b3-45d6-940d-a6d2b4786c34', '2026-05-09', 2750.00, 0.00, 'unpaid', NULL, '2026-05-09 13:20:08.50184+00', '2026-05-09 13:20:08.50184+00', 'VEN-2026-002', 10.00, 250.00);


--
-- Data for Name: client_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."client_payments" ("id", "user_id", "sale_id", "amount", "date", "note", "created_at", "methode_paiement") VALUES
	('189d7762-6ec9-40e9-bcb9-d8bd6019637d', '7af58026-049f-4cb7-96fc-32653c17a011', 'ed731313-604d-41ad-b3f0-8f716716b04d', 600.00, '2026-04-29', 'moitié', '2026-04-30 01:43:39.321747+00', 'Chèque'),
	('2270ebe0-3ab6-4017-a55d-3f31fc44a80e', '7af58026-049f-4cb7-96fc-32653c17a011', '80219446-f6ff-45d0-b235-fad600958b98', 3300.00, '2026-05-02', '10', '2026-05-02 17:06:37.993748+00', 'Effet'),
	('0571b12a-e6eb-4a92-aa0d-5797811f382d', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'b5d5fd01-1a7f-4ff1-a734-578d325d9039', 100.00, '2026-05-04', NULL, '2026-05-04 12:10:26.009005+00', 'Espèces'),
	('bb6d4a60-55d0-440d-b4e9-bf6edb242fa5', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', 5000.00, '2026-05-04', 'date cheque 24/5/26', '2026-05-04 12:14:44.305332+00', NULL),
	('ecf7ef15-9cb6-41ce-8261-1482a7625aea', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', 5000.00, '2026-05-04', NULL, '2026-05-04 16:40:05.648634+00', NULL),
	('2547d491-d14f-45ff-b4cf-8d4aa84dee05', '7af58026-049f-4cb7-96fc-32653c17a011', '609c9cdd-631f-4037-9b8b-4a8a671fee2c', 220.00, '2026-05-05', NULL, '2026-05-05 06:10:01.350086+00', NULL),
	('c36d5e10-0c36-44b4-ad7d-8dc830afd4cf', '7af58026-049f-4cb7-96fc-32653c17a011', '31dbcaee-c8b3-473b-823b-2fe530933cf0', 330.00, '2026-05-05', NULL, '2026-05-05 06:43:37.18037+00', 'Virement bancaire'),
	('f5cd1723-14e0-4c77-aa82-14ae2a74564f', '7af58026-049f-4cb7-96fc-32653c17a011', 'd1474c0d-7904-4e0a-88b6-cb4b9a52b27b', 100.00, '2026-05-07', 'nt1', '2026-05-07 14:12:36.343679+00', 'Virement bancaire'),
	('0dd1c4c1-54e6-42b2-9120-ba77a5628e08', '7af58026-049f-4cb7-96fc-32653c17a011', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', 1700.00, '2026-05-07', NULL, '2026-05-07 15:02:47.334475+00', NULL),
	('e4de650f-9260-487c-a976-2601ada45e94', '7af58026-049f-4cb7-96fc-32653c17a011', '43ef9c93-ae80-47e2-86b0-f315b8ab70d1', 100.00, '2026-05-07', NULL, '2026-05-07 15:53:17.399591+00', NULL),
	('e5e3fc0f-c324-4f02-ace6-def7338c6655', '7af58026-049f-4cb7-96fc-32653c17a011', '43ef9c93-ae80-47e2-86b0-f315b8ab70d1', 5.00, '2026-05-07', NULL, '2026-05-07 15:53:17.399591+00', NULL),
	('7c0e1c43-5d28-44ad-a89b-2db8c64e35b2', '7af58026-049f-4cb7-96fc-32653c17a011', 'a5edd236-5885-40d8-852c-0f6257123738', 1100.00, '2026-05-07', NULL, '2026-05-07 15:54:22.558811+00', NULL);


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."companies" ("id", "user_id", "name", "address", "phone", "email", "ice", "rc", "logo_url", "created_at", "updated_at", "forme_juridique", "site_web", "tva_number", "taux_tva_defaut", "if_number", "tp_number", "couleur_marque", "rib") VALUES
	('6b722760-e2db-4856-8c52-f7907553d8bf', '7af58026-049f-4cb7-96fc-32653c17a011', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '0669295800', 'digistart@gmail.com', '12883883', '8553', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '2026-04-29 23:41:12.964903+00', '2026-05-06 14:40:33.20489+00', 'SA', 'www.digistrat.com', NULL, 10.00, '98738', '9873', '#4f46e5', '123456789123456789123456789123456789'),
	('52ffd2c2-671a-448f-87ed-b0bad50389f7', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'DigStart', 'anfa place', '0679378394', 'digstart@gmail.com', '123998488484848', '88397838', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/0171ae54-3906-4cc6-b8a7-95166f6ca98c/logo.jpg', '2026-04-30 15:52:59.994483+00', '2026-05-09 10:45:01.088873+00', 'SA', 'www.digistrat.com', NULL, 10.00, '72772373', '146', '#4f46e5', '15377384849849494994949'),
	('f0c478fe-943c-40e3-82b7-ddbe020e381e', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'bnina volailles', 'dar bouazza casablanca', '087732672', 'conatct@bnonavolailles.com', '00099382u222', '343422', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/f4c78c15-fda1-4c6c-ba8c-786917bf28ed/logo.png', '2026-05-04 15:32:23.981896+00', '2026-05-04 16:38:48.991663+00', NULL, 'www.bninavolailles.com', NULL, 20.00, '242421', NULL, '#002e7a', NULL);


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."documents" ("id", "user_id", "client_id", "sale_id", "parent_id", "type", "number", "date", "status", "payment_status", "total", "paid", "note", "created_at", "updated_at", "payment_id", "client_name", "client_address", "client_ice", "company_name", "company_address", "company_ice", "company_if", "company_rc", "company_tp", "company_logo_url", "company_phone", "company_email", "company_rib", "tva_rate", "tva_amount", "company_couleur_marque", "company_site_web", "client_phone", "mode_paiement") VALUES
	('7415b216-84f9-4168-a93b-49e13779a011', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', 'ed731313-604d-41ad-b3f0-8f716716b04d', NULL, 'invoice', 'FAC-2026-001', '2026-04-29', 'confirmed', 'partial', 1200.00, 600.00, 'nt1', '2026-04-29 19:03:44.715279+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL),
	('df2f2987-9e51-482c-a827-924a3c708156', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', '80219446-f6ff-45d0-b235-fad600958b98', NULL, 'invoice', 'FAC-2026-002', '2026-05-02', 'confirmed', 'paid', 3300.00, 3300.00, NULL, '2026-05-02 16:38:24.302188+00', '2026-05-05 12:23:27.676018+00', NULL, 'mon client 11', '', '', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', NULL, NULL, 0, 0, NULL, NULL, NULL, 'Espèces'),
	('2c8f3c87-9755-48d4-891e-6b74730e80de', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '5889037b-50c3-4b40-90c6-2d1a97328a1f', 'b5d5fd01-1a7f-4ff1-a734-578d325d9039', NULL, 'invoice', 'FAC-2026-001', '2026-05-02', 'confirmed', 'partial', 175.00, 100.00, NULL, '2026-05-02 11:37:31.184878+00', '2026-05-05 12:36:31.06896+00', NULL, 'anuar el chahidi', 'tetuane', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL),
	('b8aeb9dd-d8c0-4ed3-bff9-0c93f7a043c5', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '6fbfdb31-e5f3-449e-b8ee-f23e8d84a84f', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', NULL, 'invoice', 'FAC-2026-002', '2026-05-03', 'confirmed', 'partial', 11616.00, 5000.00, NULL, '2026-05-04 16:41:10.278619+00', '2026-05-05 12:36:31.06896+00', NULL, 'ftah casa', 'casa', NULL, 'bnina volailles', 'dar bouazza casablanca', '00099382u222', '242421', '343422', NULL, 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/f4c78c15-fda1-4c6c-ba8c-786917bf28ed/logo.png', '087732672', 'conatct@bnonavolailles.com', NULL, 20, 1936, '#002e7a', 'www.bninavolailles.com', '0653553353', NULL),
	('ad03608d-77bf-4cff-8e68-7e16020465b5', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '6fbfdb31-e5f3-449e-b8ee-f23e8d84a84f', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', NULL, 'invoice', 'FAC-2026-003', '2026-05-04', 'confirmed', 'partial', 5908.80, 5000.00, NULL, '2026-05-04 12:14:45.132025+00', '2026-05-05 12:36:31.06896+00', NULL, 'ftah casa', 'casa', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL),
	('68678af6-26a6-40fe-ba10-5a728691215b', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', NULL, 'receipt', 'REC-2026-001', '2026-05-07', 'confirmed', 'paid', 1760.00, 1700.00, NULL, '2026-05-07 15:16:14.391537+00', '2026-05-07 15:41:32.777131+00', '0dd1c4c1-54e6-42b2-9120-ba77a5628e08', NULL, NULL, NULL, 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 160, '#4f46e5', 'www.digistrat.com', NULL, NULL),
	('bc0c8cf1-a2c0-44b2-ba4c-5a6a904e18ba', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '0826b1ed-3de9-4a7c-aa49-70964e672b64', NULL, 'invoice', 'FAC-2026-007', '2026-05-05', 'confirmed', 'unpaid', 330.00, 0.00, NULL, '2026-05-05 06:09:12.869404+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 30, '#22C55E', 'www.digistrat.com', '0669295800', NULL),
	('869e7533-3ac7-4e1b-bab8-f0472de0f54c', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', 'dcde1247-9b5f-471c-a2b8-a024fcef34a2', NULL, 'invoice', 'FAC-2026-003', '2026-05-03', 'confirmed', 'unpaid', 3300.00, 0.00, 'ma ant eimprimee', '2026-05-03 11:19:41.953861+00', '2026-05-05 12:23:27.676018+00', NULL, 'mon client 11', 'Rue fenikiyine iberia', '123456789', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', NULL, 0, 0, NULL, NULL, NULL, NULL),
	('e5d482c7-7701-452c-be12-a496a37579ac', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '4d2931a3-3cc0-49d7-a686-1c00454e6e2a', NULL, 'invoice', 'FAC-2026-004', '2026-05-04', 'confirmed', 'unpaid', 4400.00, 0.00, 'Ma note', '2026-05-04 13:10:32.313817+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', NULL, 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 400, '#22C55E', NULL, NULL, NULL),
	('cc86e961-f280-4e2d-8380-caf18d583cf9', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '5191ca98-e6d0-4519-8fe4-751b41b6c2a8', NULL, 'invoice', 'FAC-2026-005', '2026-05-04', 'confirmed', 'unpaid', 880.00, 0.00, 'venete to test', '2026-05-04 13:22:23.041227+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 80, '#6b947a', 'www.digistrat.com', '0669295801', NULL),
	('cd5c443a-5356-4240-9f35-4073bd4c7368', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', 'e23a6517-6e85-4cc6-b1bc-d9fd31e2c136', NULL, 'invoice', 'FAC-2026-006', '2026-05-04', 'confirmed', 'unpaid', 3300.00, 0.00, NULL, '2026-05-04 13:36:11.744856+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 300, '#6b947a', 'www.digistrat.com', '0669295800', NULL),
	('35813824-039e-43d7-a0ff-a33bfa6d021f', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '31dbcaee-c8b3-473b-823b-2fe530933cf0', NULL, 'invoice', 'FAC-2026-008', '2026-05-05', 'confirmed', 'unpaid', 330.00, 0.00, NULL, '2026-05-05 06:43:16.462844+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 30, '#22C55E', 'www.digistrat.com', '0669295800', 'Virement bancaire'),
	('ec524ade-d709-4332-ba02-437ee39c9690', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', 'd1474c0d-7904-4e0a-88b6-cb4b9a52b27b', NULL, 'invoice', 'FAC-2026-009', '2026-05-05', 'confirmed', 'unpaid', 330.00, 0.00, NULL, '2026-05-05 10:39:59.152482+00', '2026-05-05 12:23:27.676018+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 30, '#22C55E', 'www.digistrat.com', '0669295800', 'Virement bancaire'),
	('7551b581-a1d5-4cef-bbb3-bb312a10ca62', '7af58026-049f-4cb7-96fc-32653c17a011', 'f3260e09-1f24-4c9a-a266-2943ae15cba7', '43ef9c93-ae80-47e2-86b0-f315b8ab70d1', NULL, 'invoice', 'FAC-2026-010', '2026-05-07', 'confirmed', 'partial', 110.00, 100.00, NULL, '2026-05-07 15:48:54.845448+00', '2026-05-07 15:48:54.845448+00', NULL, 'sarra lassrii', 'rue fnikiyine', '1256788999', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 10, '#4f46e5', 'www.digistrat.com', '0669295800', NULL),
	('10cd493f-ab9c-4f5b-b3fc-52cd33ba5b13', '7af58026-049f-4cb7-96fc-32653c17a011', 'f6a2e676-81bb-4a67-b963-c514af6ba66d', 'ae5f64f0-3c39-4e9a-9e95-d486af4813d3', NULL, 'invoice', 'FAC-2026-011', '2026-05-08', 'confirmed', 'unpaid', 110.00, 0.00, NULL, '2026-05-08 20:16:45.048136+00', '2026-05-08 20:16:59.682564+00', NULL, 'mon client 11', 'Rue fenikiyine iberia', '123456789', 'DIGISTART', 'Bd de l''Océan Pacifique, arrondissement Ain Diab', '12883883', '98738', '8553', '9873', 'https://yirxzhazygrvymtfikap.supabase.co/storage/v1/object/public/logos/7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '0669295800', 'digistart@gmail.com', '123456789123456789123456789123456789', 10, 10, '#4f46e5', 'www.digistrat.com', '0698888777', 'Virement bancaire');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("id", "user_id", "name", "type", "pieces_count", "stock_alert", "created_at", "updated_at") VALUES
	('b44bc23b-68fb-41ef-916e-8e7836590e0f', '7af58026-049f-4cb7-96fc-32653c17a011', 'parfum', 'pack', 3, 5, '2026-04-29 02:07:53.059629+00', '2026-04-29 11:20:10.026032+00'),
	('56e04034-04ad-49a4-837e-5978c1cb4b79', '7af58026-049f-4cb7-96fc-32653c17a011', 'ensemble', 'individual', 1, 0, '2026-04-29 11:34:18.764484+00', '2026-04-29 11:34:18.764484+00'),
	('ade14234-c1ae-4156-a005-a5b55186b799', '7af58026-049f-4cb7-96fc-32653c17a011', 'merlan', 'pack', 10, 2, '2026-04-29 14:14:42.940295+00', '2026-04-29 14:15:02.594035+00'),
	('6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', '7af58026-049f-4cb7-96fc-32653c17a011', 'bouteille eau', 'pack', 10, 3, '2026-04-30 12:42:41.185268+00', '2026-04-30 12:42:41.185268+00'),
	('a10ca4c5-a7f7-4507-be0d-180bf73cbf0b', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'PC Portable Dell', 'individual', 1, 5, '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('98de0808-c827-4a4f-aea4-04daae4563e4', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Souris Sans Fil Logitech', 'individual', 1, 20, '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('764a643f-2abd-4547-9825-506788e0fa47', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Imprimante HP LaserJet', 'individual', 1, 3, '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('e2114fcc-2316-4957-8138-18367bea53f1', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Ramette Papier A4 (Carton de 5)', 'pack', 5, 10, '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('92f4fb99-f961-423f-8cf2-2e7b4d411094', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Pack Bureau (Écran + Clavier + Souris)', 'pack', 1, 2, '2026-04-30 16:18:53.871739+00', '2026-04-30 16:45:28.828361+00'),
	('ee1ef8cb-339a-4ff6-9bd6-300e01fa1465', '7af58026-049f-4cb7-96fc-32653c17a011', 'Prod1', 'individual', 1, 5, '2026-04-30 20:01:34.469408+00', '2026-04-30 20:01:34.469408+00'),
	('86b47ce6-06b9-4ff3-95e1-0d7455db7658', '7af58026-049f-4cb7-96fc-32653c17a011', 'baguettes', 'pack', 3, 3, '2026-04-29 14:24:14.915378+00', '2026-04-30 20:04:47.673212+00'),
	('1632b736-be83-4134-a8b2-de29dad5fb37', '7af58026-049f-4cb7-96fc-32653c17a011', 'test1', 'pack', 3, 0, '2026-05-01 08:41:08.471286+00', '2026-05-01 08:41:08.471286+00'),
	('b5686cbd-a572-4280-99bc-bcdfc2c69d67', '7af58026-049f-4cb7-96fc-32653c17a011', 'ttesttt', 'individual', 1, 0, '2026-05-01 08:52:52.193572+00', '2026-05-01 08:52:52.193572+00'),
	('85c39a98-9881-4d28-9f4f-78742966a2e2', '7af58026-049f-4cb7-96fc-32653c17a011', 'mon test1', 'individual', 1, 0, '2026-05-01 08:56:39.101646+00', '2026-05-01 08:56:39.101646+00'),
	('674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', '7af58026-049f-4cb7-96fc-32653c17a011', 'test2', 'individual', 1, 0, '2026-05-01 08:58:25.329184+00', '2026-05-01 08:58:25.329184+00'),
	('172ea880-a4ce-4ea2-aef8-6f93d18358ff', '7af58026-049f-4cb7-96fc-32653c17a011', 'mon test 10', 'individual', 1, 0, '2026-05-01 09:10:07.104963+00', '2026-05-01 09:10:07.104963+00'),
	('5593a5fa-31b7-4cda-819f-a5172788b6bd', '7af58026-049f-4cb7-96fc-32653c17a011', 'montest 11', 'individual', 1, 0, '2026-05-01 09:16:43.878775+00', '2026-05-01 09:16:43.878775+00'),
	('a462ebd8-fd1e-467d-a819-e2f7501a3d85', '7af58026-049f-4cb7-96fc-32653c17a011', 'prodouit 1', 'individual', 1, 0, '2026-05-01 09:45:01.575112+00', '2026-05-01 09:45:01.575112+00'),
	('c3ad5bfa-1465-4689-9cf6-4d93279370c8', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'kasher 500g', 'pack', 8, 0, '2026-05-02 11:33:00.265295+00', '2026-05-02 11:33:50.050923+00'),
	('e35edc6f-dac0-49ca-a164-587b5ae31c86', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'mini 90g', 'pack', 24, 50, '2026-05-02 11:33:11.582303+00', '2026-05-02 11:34:02.826988+00'),
	('bbd19eaf-c780-40cc-aac0-cd89ba8ec0c3', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'moratdel260g', 'pack', 10, 30, '2026-05-02 11:33:43.491829+00', '2026-05-02 11:34:07.941358+00'),
	('38c58d47-46fa-4c72-9555-064f69762d14', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'luncheon 1500g', 'pack', 4, 20, '2026-05-02 11:32:44.978717+00', '2026-05-02 11:34:16.760438+00'),
	('af2f0949-a02f-4d56-921a-fc55fad08a48', '7af58026-049f-4cb7-96fc-32653c17a011', 'new', 'individual', 1, 0, '2026-05-02 15:44:57.322729+00', '2026-05-02 15:44:57.322729+00'),
	('8412656d-55da-4b50-a8cd-749bc0859e49', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'paleria', 'pack', 8, 20, '2026-05-04 16:45:01.153535+00', '2026-05-04 16:45:01.153535+00'),
	('3f4bfd9b-dc42-432e-81b6-9a4ec12cd5af', '7af58026-049f-4cb7-96fc-32653c17a011', 'Merlan', 'pack', 2, 0, '2026-05-07 18:08:10.199249+00', '2026-05-07 18:08:10.199249+00'),
	('0b8dfdd0-6da0-4ae8-9315-a0f22585fa6a', '7af58026-049f-4cb7-96fc-32653c17a011', 'PROD3', 'individual', 1, 0, '2026-05-08 10:20:03.01999+00', '2026-05-08 10:20:03.01999+00');


--
-- Data for Name: document_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."document_items" ("id", "document_id", "product_id", "quantity", "pieces_count", "unit_price", "product_name") VALUES
	('48851893-6ded-4e47-bd8b-0ceebaca4ab6', '7415b216-84f9-4168-a93b-49e13779a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 2, 3, 200.00, 'parfum'),
	('12a63a0a-7625-4494-8caf-0b5bd0560524', 'df2f2987-9e51-482c-a827-924a3c708156', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 3, 1, 1000.00, 'new'),
	('db8ec9bd-924e-40c3-85ca-56ed41b11758', '869e7533-3ac7-4e1b-bab8-f0472de0f54c', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 3, 1, 100.00, 'bouteille eau'),
	('04ff1b7c-06f5-46e2-bf63-3fb7426ff430', '2c8f3c87-9755-48d4-891e-6b74730e80de', 'bbd19eaf-c780-40cc-aac0-cd89ba8ec0c3', 5, 10, 3.50, 'moratdel260g'),
	('f320f001-6016-445e-b173-922d38308e9a', 'ad03608d-77bf-4cff-8e68-7e16020465b5', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 45, 1, 6.50, 'kasher 500g'),
	('793f4b43-b634-426a-bf3f-5fce38db0c0d', 'ad03608d-77bf-4cff-8e68-7e16020465b5', '38c58d47-46fa-4c72-9555-064f69762d14', 34, 1, 19.00, 'luncheon 1500g'),
	('f8c10823-bdfa-4d05-a7cb-ccf20e54826f', 'e5d482c7-7701-452c-be12-a496a37579ac', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 1000.00, 'prodouit 1'),
	('1cd7acd4-d330-4ef9-9f33-981f3c7b1394', 'e5d482c7-7701-452c-be12-a496a37579ac', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 1, 1, 100.00, 'bouteille eau'),
	('d37d8d1b-4776-45f3-87da-834470665efc', 'cc86e961-f280-4e2d-8380-caf18d583cf9', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 2, 1, 100.00, 'prodouit 1'),
	('ef773695-435d-449c-988b-c39ee09ce51d', 'cc86e961-f280-4e2d-8380-caf18d583cf9', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 3, 1, 200.00, 'montest 11'),
	('f6d39cbc-401b-4ac5-b8f1-23b0dde7093b', 'cd5c443a-5356-4240-9f35-4073bd4c7368', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 1000.00, 'prodouit 1'),
	('ed717c58-4a56-4f40-8429-ee6dd96cccb0', 'b8aeb9dd-d8c0-4ed3-bff9-0c93f7a043c5', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 40, 1, 6.50, 'kasher 500g'),
	('f60ab907-9fe7-4ce0-b05b-29cbb88ee511', 'b8aeb9dd-d8c0-4ed3-bff9-0c93f7a043c5', '38c58d47-46fa-4c72-9555-064f69762d14', 100, 1, 19.00, 'luncheon 1500g'),
	('07954242-f4c2-4adb-b8a3-f49f6f4a4c5b', 'bc0c8cf1-a2c0-44b2-ba4c-5a6a904e18ba', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 100.00, 'prodouit 1'),
	('eb8edd51-577e-43df-a12c-a521a0f21073', '35813824-039e-43d7-a0ff-a33bfa6d021f', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 2, 1, 150.00, 'prodouit 1'),
	('d37a9fac-69d4-46f5-abcc-e5ed7cbeaae8', 'ec524ade-d709-4332-ba02-437ee39c9690', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 100.00, 'prodouit 1'),
	('662ca700-d270-4fe6-a675-b9d783dafafe', '68678af6-26a6-40fe-ba10-5a728691215b', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 1, 1, 100.00, 'prodouit 1'),
	('cec602c0-7bf0-4cff-ae40-b3ab5cf511d1', '68678af6-26a6-40fe-ba10-5a728691215b', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 1, 1, 200.00, 'montest 11'),
	('4cd15007-a631-4796-8ef9-15ec1eb376be', '68678af6-26a6-40fe-ba10-5a728691215b', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 3, 1, 300.00, 'mon test 10'),
	('94b5a3b8-bd29-45ec-9ccf-9d40eaee795f', '68678af6-26a6-40fe-ba10-5a728691215b', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 4, 1, 100.00, 'montest 11'),
	('230fb711-4a6b-4b89-a61b-09c31358ed55', '7551b581-a1d5-4cef-bbb3-bb312a10ca62', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 1, 1, 100.00, 'prodouit 1'),
	('ab8ee32a-b927-48a0-bbf2-c191bd422472', '10cd493f-ab9c-4f5b-b3fc-52cd33ba5b13', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 1, 1, 100.00, 'new');


--
-- Data for Name: document_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."document_sequences" ("id", "user_id", "type", "year", "last_number") VALUES
	('de9e1c8c-b32c-4f21-994a-af29ecf630be', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'purchase', 2026, 2),
	('ec1178cf-29e8-4702-9c0b-e5fcd9c679c8', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'sale', 2026, 2),
	('798540ad-d66e-4ead-9558-cd09b6492b77', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'invoice', 2026, 3),
	('7036064f-b90d-4026-9136-d6b856303aeb', '7af58026-049f-4cb7-96fc-32653c17a011', 'receipt', 2026, 4),
	('8452452d-af17-4287-a293-5cd52c286f95', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'sale', 2026, 7),
	('568b07fe-273c-4cf2-94d3-3e9942141f06', '7af58026-049f-4cb7-96fc-32653c17a011', 'sale', 2026, 18),
	('4045c2ac-55c7-4a8d-8c00-0f07852540a5', '7af58026-049f-4cb7-96fc-32653c17a011', 'purchase', 2026, 19),
	('c0ca2bfb-2fbc-4ee1-a2b5-11fda0d8e087', '7af58026-049f-4cb7-96fc-32653c17a011', 'invoice', 2026, 11);


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."suppliers" ("id", "user_id", "name", "phone", "address", "ice", "created_at", "updated_at") VALUES
	('4f8f7b6e-5ab2-47fe-b42c-20bde0fb812d', '7af58026-049f-4cb7-96fc-32653c17a011', 'sarra lassr', '0669295800', 'rue fnikiyine', '1883732', '2026-04-29 02:33:42.387091+00', '2026-04-29 02:33:42.387091+00'),
	('3e536a6a-a33b-4613-b9bb-4edd6600cc76', '7af58026-049f-4cb7-96fc-32653c17a011', 'parfuumerie', '0611111111', 'Bd de l''Océan Pacifique, arrondissement Ain Diab 1', '111111', '2026-04-29 11:37:59.945335+00', '2026-04-29 11:37:59.945335+00'),
	('2800940e-7e72-45c0-b82c-da6c1372b8ae', '7af58026-049f-4cb7-96fc-32653c17a011', 'boulangerie', '0698745211', 'casa', '222222', '2026-04-29 14:19:08.684803+00', '2026-04-29 14:19:08.684803+00'),
	('9929a724-cbdd-4bfb-bfe6-a88651f2c581', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Fournisseur GlobalTech', '0522001122', 'Zone Industrielle, Tanger', '999999999999999', '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('5992128d-ca7e-4c5f-a3b0-e279b83244a4', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Grossiste MegaStore', '0533001122', 'Quartier Industriel, Agadir', '888888888888888', '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('e06996f7-b308-4f4e-8acc-0fced03b43a9', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', 'Import-Export Pro', '0544001122', 'Port de Casablanca', '777777777777777', '2026-04-30 16:18:53.871739+00', '2026-04-30 16:18:53.871739+00'),
	('86279ed8-5f33-49d0-b67b-d1e39bccdc1a', '7af58026-049f-4cb7-96fc-32653c17a011', 'mon fourn', '', '', '', '2026-05-01 09:17:50.24213+00', '2026-05-01 09:17:50.24213+00'),
	('d1913559-6d5b-4342-9204-3608d72925b0', '7af58026-049f-4cb7-96fc-32653c17a011', 'mon fourni', '', '', '', '2026-05-01 09:19:25.490043+00', '2026-05-01 09:19:25.490043+00'),
	('a0bfd7a6-6bb3-44bf-8e67-623740a0129b', '7af58026-049f-4cb7-96fc-32653c17a011', 'four', NULL, NULL, NULL, '2026-05-01 09:44:50.288111+00', '2026-05-01 09:44:50.288111+00'),
	('f9a1a0c0-fd72-44a8-8094-bef8ad7ccf58', '7af58026-049f-4cb7-96fc-32653c17a011', 'lyne', '0678889999', NULL, NULL, '2026-05-06 21:05:34.682329+00', '2026-05-06 21:05:34.682329+00'),
	('f1e289ef-b093-4239-9873-c104a7387315', '7af58026-049f-4cb7-96fc-32653c17a011', 'Abdellah', NULL, NULL, NULL, '2026-05-07 17:35:18.708699+00', '2026-05-07 17:35:18.708699+00'),
	('671cb6a2-0c35-4d49-b13f-d29b7439931c', '7af58026-049f-4cb7-96fc-32653c17a011', 'Abdellaoui', NULL, NULL, NULL, '2026-05-07 17:38:58.466272+00', '2026-05-07 17:38:58.466272+00'),
	('b3c1feef-10ed-4cf8-984f-2eacc659271e', '7af58026-049f-4cb7-96fc-32653c17a011', 'Othman', NULL, NULL, NULL, '2026-05-07 17:40:27.651074+00', '2026-05-07 17:40:27.651074+00'),
	('5ce470f2-e957-4375-ae88-9618b3d23413', '7af58026-049f-4cb7-96fc-32653c17a011', 'Hzmzaui', NULL, NULL, NULL, '2026-05-07 17:43:43.706077+00', '2026-05-07 17:43:43.706077+00'),
	('dde143d2-b1d9-4a45-a3b6-df3b1fba7964', '7af58026-049f-4cb7-96fc-32653c17a011', 'Hamzaoui', NULL, NULL, NULL, '2026-05-07 17:46:36.501823+00', '2026-05-07 17:46:36.501823+00'),
	('817be7fd-8f7b-4644-bda9-fa54f844a27a', '7af58026-049f-4cb7-96fc-32653c17a011', 'Abellawi', NULL, NULL, NULL, '2026-05-07 18:04:20.951542+00', '2026-05-07 18:04:20.951542+00'),
	('eabcab63-dbdb-46a8-86ae-4418917da539', '7af58026-049f-4cb7-96fc-32653c17a011', 'Khatabi', NULL, NULL, NULL, '2026-05-07 18:07:20.247695+00', '2026-05-07 18:07:20.247695+00');


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."purchases" ("id", "user_id", "supplier_id", "reference", "date", "total", "paid", "status", "note", "created_at", "updated_at", "tva_rate", "tva_amount") VALUES
	('ba847240-c246-4541-a7cf-3ecc742b783a', '7af58026-049f-4cb7-96fc-32653c17a011', 'd1913559-6d5b-4342-9204-3608d72925b0', 'ACH-2026-013', '2026-05-02', 34800.00, 0.00, 'unpaid', NULL, '2026-05-02 08:18:26.13194+00', '2026-05-02 08:19:51.842221+00', 0.00, 0.00),
	('492af259-5f6c-415c-83e7-10a7b190f050', '7af58026-049f-4cb7-96fc-32653c17a011', '2800940e-7e72-45c0-b82c-da6c1372b8ae', 'ACH-2026-014', '2026-05-02', 3300.00, 3300.00, 'paid', NULL, '2026-05-02 17:05:51.64139+00', '2026-05-02 17:05:51.64139+00', 10.00, 300.00),
	('a85bfaa7-5c0c-45d0-bab5-ded14384ff8d', '7af58026-049f-4cb7-96fc-32653c17a011', 'd1913559-6d5b-4342-9204-3608d72925b0', 'ACH-2026-012', '2026-05-01', 300.00, 100.00, 'partial', NULL, '2026-05-01 09:57:02.353173+00', '2026-05-06 20:42:31.185662+00', 0.00, 0.00),
	('d6f97ecb-a08a-45f6-9374-4f59cf7820d9', '7af58026-049f-4cb7-96fc-32653c17a011', 'f9a1a0c0-fd72-44a8-8094-bef8ad7ccf58', 'ACH-2026-015', '2026-05-06', 220.00, 120.00, 'partial', NULL, '2026-05-06 21:06:36.163331+00', '2026-05-06 21:06:36.163331+00', 10.00, 20.00),
	('e6fa947d-3c14-4208-be47-9ea9b97dbfd1', '7af58026-049f-4cb7-96fc-32653c17a011', 'f9a1a0c0-fd72-44a8-8094-bef8ad7ccf58', 'ACH-2026-016', '2026-05-06', 110.00, 0.00, 'unpaid', NULL, '2026-05-06 21:33:21.440136+00', '2026-05-06 21:33:21.440136+00', 10.00, 10.00),
	('d8c1ca43-ce82-45a5-a94c-a9f606fdf25f', '7af58026-049f-4cb7-96fc-32653c17a011', '86279ed8-5f33-49d0-b67b-d1e39bccdc1a', 'ACH-2026-017', '2026-05-06', 110.00, 0.00, 'unpaid', NULL, '2026-05-06 21:34:31.069578+00', '2026-05-06 21:34:31.069578+00', 10.00, 10.00),
	('543e9833-bb1c-47e7-8cdf-f657a43b4a9a', '7af58026-049f-4cb7-96fc-32653c17a011', 'eabcab63-dbdb-46a8-86ae-4418917da539', 'ACH-2026-018', '2026-05-07', 1980.00, 1000.00, 'partial', NULL, '2026-05-07 18:09:26.187076+00', '2026-05-07 18:09:26.187076+00', 10.00, 180.00),
	('c41378aa-5af7-4928-8262-d587717ee2f7', '7af58026-049f-4cb7-96fc-32653c17a011', '4f8f7b6e-5ab2-47fe-b42c-20bde0fb812d', 'ACH-2026-006', '2026-04-29', 500.00, 0.00, 'unpaid', NULL, '2026-04-29 14:15:34.745451+00', '2026-04-29 14:15:34.745451+00', 0.00, 0.00),
	('55ebda44-4889-40ed-801d-8de60bb68551', '7af58026-049f-4cb7-96fc-32653c17a011', '2800940e-7e72-45c0-b82c-da6c1372b8ae', 'ACH-2026-009', '2026-04-29', 18.00, 0.00, 'unpaid', NULL, '2026-04-29 14:24:30.955054+00', '2026-04-29 14:24:30.955054+00', 0.00, 0.00),
	('ff309316-ca3a-496d-8d98-6445145ecf6c', '7af58026-049f-4cb7-96fc-32653c17a011', '2800940e-7e72-45c0-b82c-da6c1372b8ae', 'ACH-2026-010', '2026-04-29', 30.00, 0.00, 'unpaid', 'nttt', '2026-04-29 14:51:00.679511+00', '2026-04-29 14:51:00.679511+00', 0.00, 0.00),
	('f197bd75-af9b-40f9-9fb1-5a275f2dab7f', '7af58026-049f-4cb7-96fc-32653c17a011', '3e536a6a-a33b-4613-b9bb-4edd6600cc76', 'ACH-2026-005', '2026-04-29', 100.00, 100.00, 'paid', NULL, '2026-04-29 14:12:24.943301+00', '2026-04-30 01:42:48.882653+00', 0.00, 0.00),
	('d1098df7-9d5b-4726-b656-a9b60dd9d380', '7af58026-049f-4cb7-96fc-32653c17a011', '3e536a6a-a33b-4613-b9bb-4edd6600cc76', 'ACH-2026-001', '2026-04-30', 0.00, 200.00, 'paid', NULL, '2026-04-30 10:40:15.94954+00', '2026-04-30 10:40:15.94954+00', 0.00, 0.00),
	('b8daf262-93b4-4d0a-9f96-41e5d7e2e36d', '7af58026-049f-4cb7-96fc-32653c17a011', '2800940e-7e72-45c0-b82c-da6c1372b8ae', 'ACH-2026-011', '2026-05-01', 1000.00, 0.00, 'unpaid', NULL, '2026-05-01 08:44:27.507297+00', '2026-05-01 08:44:27.507297+00', 0.00, 0.00),
	('2286a45b-9553-4315-8414-4bf71f691890', '7af58026-049f-4cb7-96fc-32653c17a011', 'dde143d2-b1d9-4a45-a3b6-df3b1fba7964', 'ACH-2026-019', '2026-05-08', 220.00, 0.00, 'unpaid', NULL, '2026-05-08 20:16:34.017946+00', '2026-05-08 20:16:34.017946+00', 10.00, 20.00),
	('2a309397-02d6-4169-aec0-398ab7cf6dca', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '9929a724-cbdd-4bfb-bfe6-a88651f2c581', 'ACH-2026-001', '2026-05-09', 3300.00, 0.00, 'cancelled', NULL, '2026-05-09 13:18:13.490474+00', '2026-05-09 13:18:24.558768+00', 10.00, 300.00),
	('95d9cbec-4bf2-43b9-9ade-4752c04f9099', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '9929a724-cbdd-4bfb-bfe6-a88651f2c581', 'ACH-2026-002', '2026-05-09', 2200.00, 0.00, 'unpaid', NULL, '2026-05-09 13:19:30.601996+00', '2026-05-09 13:19:30.601996+00', 10.00, 200.00);


--
-- Data for Name: purchase_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."purchase_items" ("id", "purchase_id", "product_id", "quantity", "unit_price") VALUES
	('cd376a8b-3254-4213-89b8-dfd292a37446', '2a309397-02d6-4169-aec0-398ab7cf6dca', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 30, 100.00),
	('ca5b77c7-dad9-41a7-bc4b-8a68aabb2d7a', '95d9cbec-4bf2-43b9-9ade-4752c04f9099', '764a643f-2abd-4547-9825-506788e0fa47', 20, 100.00),
	('fd12b4f4-e520-4430-90df-4137e288902c', 'c41378aa-5af7-4928-8262-d587717ee2f7', 'ade14234-c1ae-4156-a005-a5b55186b799', 5, 10.00),
	('35b0365f-70b9-4aeb-aef2-c14eeaf96bd4', '55ebda44-4889-40ed-801d-8de60bb68551', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 2, 3.00),
	('8650c7d9-a7de-4e38-a019-54c2bd688d37', 'ff309316-ca3a-496d-8d98-6445145ecf6c', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 1, 10.00),
	('2fad4d28-419a-4f8c-bbc1-7c58c7ae0b93', 'f197bd75-af9b-40f9-9fb1-5a275f2dab7f', '56e04034-04ad-49a4-837e-5978c1cb4b79', 2, 50.00),
	('7f366a64-3c2f-4865-b8f7-e55b6d6926aa', 'd1098df7-9d5b-4726-b656-a9b60dd9d380', '56e04034-04ad-49a4-837e-5978c1cb4b79', 3, 0.00),
	('e9896d7b-69fa-40df-a780-a6b911ac11e4', 'b8daf262-93b4-4d0a-9f96-41e5d7e2e36d', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 1, 100.00),
	('eba86e1e-4100-4572-a8cb-9331927b5a2a', 'ba847240-c246-4541-a7cf-3ecc742b783a', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 3, 1000.00),
	('838c046e-1ec5-4e62-b82c-e4811a688e5a', 'ba847240-c246-4541-a7cf-3ecc742b783a', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 2, 800.00),
	('71d3687a-a6a3-4aaf-b113-106016648ace', '492af259-5f6c-415c-83e7-10a7b190f050', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1000.00),
	('7456de50-bdfe-4809-a134-6d02910bf681', 'a85bfaa7-5c0c-45d0-bab5-ded14384ff8d', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 3, 100.00),
	('3374ad2d-c366-428b-97a9-91a0072ba7d6', 'd6f97ecb-a08a-45f6-9374-4f59cf7820d9', '674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', 2, 100.00),
	('cfee3ecf-a60a-44b0-ad28-c17d331a017c', 'e6fa947d-3c14-4208-be47-9ea9b97dbfd1', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 1, 100.00),
	('d816f63a-af5e-47a7-a55f-f4f870b0f91f', 'd8c1ca43-ce82-45a5-a94c-a9f606fdf25f', '674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', 1, 100.00),
	('eaea89f6-97ca-4769-b2ba-c5cc8bce6c9a', '543e9833-bb1c-47e7-8cdf-f657a43b4a9a', '3f4bfd9b-dc42-432e-81b6-9a4ec12cd5af', 9, 100.00),
	('d5114b39-b736-47b2-9e1b-2121c1f35e33', '2286a45b-9553-4315-8414-4bf71f691890', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 1, 200.00);


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sale_items" ("id", "sale_id", "product_id", "quantity", "pieces_count", "unit_price") VALUES
	('407bc1e0-17f8-4704-811d-88f00a0cb8ea', '83c6d4a9-1ba1-4ee7-9fb6-34b9e62f81d5', '764a643f-2abd-4547-9825-506788e0fa47', 25, 1, 100.00),
	('c172f52c-86a5-4809-afb5-5744cb2b9ef3', 'ed731313-604d-41ad-b3f0-8f716716b04d', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 2, 1, 200.00),
	('76926817-f8f3-4f42-86cd-a4098c4dd86b', '80219446-f6ff-45d0-b235-fad600958b98', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 3, 1, 1000.00),
	('bd6fcd29-1d29-4185-ba51-ffd4034f0aee', 'dcde1247-9b5f-471c-a2b8-a024fcef34a2', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 3, 1, 100.00),
	('9834a24f-902c-4434-addd-7dfbb2d0d523', 'b5d5fd01-1a7f-4ff1-a734-578d325d9039', 'bbd19eaf-c780-40cc-aac0-cd89ba8ec0c3', 5, 1, 3.50),
	('a831880c-143c-4415-9104-124ddb34bb38', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 45, 1, 6.50),
	('f4c713d2-1493-4471-a940-eebb55a7f55d', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', '38c58d47-46fa-4c72-9555-064f69762d14', 34, 1, 19.00),
	('341f9197-46e3-4baa-b596-b97171414814', '4d2931a3-3cc0-49d7-a686-1c00454e6e2a', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 1000.00),
	('1debfd30-056b-4b71-89f7-bbb6ff77d720', '4d2931a3-3cc0-49d7-a686-1c00454e6e2a', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 1, 1, 100.00),
	('9a984e8d-d7de-48db-85d8-48f8ff8a6ab8', '5191ca98-e6d0-4519-8fe4-751b41b6c2a8', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 2, 1, 100.00),
	('c613b67d-9f70-48ec-af06-aa18059f6bb9', '5191ca98-e6d0-4519-8fe4-751b41b6c2a8', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 3, 1, 200.00),
	('e6b2e952-5cc2-4d94-a69c-123af15f5e7b', 'e23a6517-6e85-4cc6-b1bc-d9fd31e2c136', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 1000.00),
	('e8fe28fd-263b-4dc6-805a-b6bab688494b', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 40, 1, 6.50),
	('1f1fa33e-7dd9-4727-9d01-e63b07ee4b9a', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', '38c58d47-46fa-4c72-9555-064f69762d14', 100, 1, 19.00),
	('b2057fea-2331-4c48-9aaa-4a57218319ad', '78df4434-d15f-4713-b7c8-711b8f3d1f66', '8412656d-55da-4b50-a8cd-749bc0859e49', 20, 1, 5.41),
	('d25cb416-51ec-45bc-a51b-1d1ed399902b', '0826b1ed-3de9-4a7c-aa49-70964e672b64', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 100.00),
	('8f6cd03f-55a9-49e2-be52-25ad9f5277e7', '609c9cdd-631f-4037-9b8b-4a8a671fee2c', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 2, 1, 100.00),
	('31231045-fdd7-45dc-ae74-f0467d1e14f8', '31dbcaee-c8b3-473b-823b-2fe530933cf0', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 2, 1, 150.00),
	('222e3f31-04a2-402f-8669-98b73d32a1c2', '22c11683-e6d4-41e3-98c7-6314157f92e2', '8412656d-55da-4b50-a8cd-749bc0859e49', 60, 1, 6.50),
	('ad710526-be65-4bd1-ba1c-dd31afe29de9', 'd1474c0d-7904-4e0a-88b6-cb4b9a52b27b', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 3, 1, 100.00),
	('53873198-633a-4056-a7ae-e9b12ca2b642', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 1, 1, 100.00),
	('c671db95-4c94-4efb-8a4a-90b0666efc51', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 1, 1, 200.00),
	('0e6be9fa-6c8e-4f29-a354-213521b9bb82', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 3, 1, 300.00),
	('10c16338-fd8e-4e15-a012-7ab250aaba28', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 4, 1, 100.00),
	('7b7b7700-ce28-4bff-9670-04c399873c1f', '43ef9c93-ae80-47e2-86b0-f315b8ab70d1', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 1, 1, 100.00),
	('9f6642bd-56fd-4b4c-a805-1905c816ddd4', 'a5edd236-5885-40d8-852c-0f6257123738', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 1, 1, 100.00),
	('8dbbd233-ea1e-415f-aeb4-3d5bb0537f00', 'ae5f64f0-3c39-4e9a-9e95-d486af4813d3', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 1, 1, 100.00),
	('ac34e41e-2aae-4141-af92-8672be7342da', 'b52c3ee9-9193-49a2-8e58-a615c90ad31a', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 30, 1, 100.00);


--
-- Data for Name: stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."stock" ("id", "user_id", "product_id", "quantity", "updated_at") VALUES
	('cf8ffe22-40c4-4160-be53-0b13b484721e', '7af58026-049f-4cb7-96fc-32653c17a011', '674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', 3, '2026-05-01 08:58:25.500184+00'),
	('8682f558-4d21-4ac9-90f0-995f63e32088', '7af58026-049f-4cb7-96fc-32653c17a011', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 0, '2026-05-01 09:10:07.230953+00'),
	('030bc82f-78de-4cba-8545-411951b04612', '7af58026-049f-4cb7-96fc-32653c17a011', '5593a5fa-31b7-4cda-819f-a5172788b6bd', -7, '2026-05-01 09:16:44.005855+00'),
	('8128adf7-3d89-4b52-b68a-c8cbab272697', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', -17, '2026-05-01 09:45:01.709165+00'),
	('98767779-b004-4a9b-89be-e447911fdf82', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 5, '2026-04-30 12:42:41.400116+00'),
	('0281f121-88f6-4b95-ab99-da79469a8e7f', '7af58026-049f-4cb7-96fc-32653c17a011', '1632b736-be83-4134-a8b2-de29dad5fb37', -2, '2026-05-01 08:41:08.761447+00'),
	('324268f9-191b-4716-b127-2930bfcce5d8', '7af58026-049f-4cb7-96fc-32653c17a011', 'b5686cbd-a572-4280-99bc-bcdfc2c69d67', 0, '2026-05-01 08:52:52.471691+00'),
	('b2a348e5-f0b3-4d92-81db-0622fc0301e1', '7af58026-049f-4cb7-96fc-32653c17a011', '85c39a98-9881-4d28-9f4f-78742966a2e2', 0, '2026-05-01 08:56:39.250443+00'),
	('33ada729-6eed-4e8c-9534-a7abb94e267c', '7af58026-049f-4cb7-96fc-32653c17a011', '3f4bfd9b-dc42-432e-81b6-9a4ec12cd5af', 9, '2026-05-07 18:08:10.349735+00'),
	('8489997b-cf25-473c-bc76-966f48e0300b', '7af58026-049f-4cb7-96fc-32653c17a011', '0b8dfdd0-6da0-4ae8-9315-a0f22585fa6a', 0, '2026-05-08 10:20:03.223281+00'),
	('1207c8e9-006c-45b5-bb29-eb253e847a11', '7af58026-049f-4cb7-96fc-32653c17a011', 'ade14234-c1ae-4156-a005-a5b55186b799', 6, '2026-04-29 14:14:43.115882+00'),
	('aca2ef89-f504-4695-994a-8fc479ced9e0', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 9, '2026-04-29 11:34:18.982929+00'),
	('bfe0c717-6c82-4cce-8eed-d4b350c30a8f', '7af58026-049f-4cb7-96fc-32653c17a011', 'af2f0949-a02f-4d56-921a-fc55fad08a48', -3, '2026-05-02 15:44:57.647226+00'),
	('53d46134-b758-41d6-8932-2d8c2f3ada78', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 11, '2026-04-29 14:24:15.045388+00'),
	('f13cc67a-aaa3-4feb-a003-abeb43d6014b', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'e35edc6f-dac0-49ca-a164-587b5ae31c86', 0, '2026-05-02 11:33:11.722733+00'),
	('033e36d7-f8dd-4205-a11c-da58e2880616', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'bbd19eaf-c780-40cc-aac0-cd89ba8ec0c3', -5, '2026-05-02 11:33:43.663866+00'),
	('bace496c-5bcf-410a-bcff-9ccd7eb13e92', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', -85, '2026-05-02 11:33:00.409466+00'),
	('e936bdde-c6d2-4598-b815-237fa0cbc8d3', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '38c58d47-46fa-4c72-9555-064f69762d14', -134, '2026-05-02 11:32:45.349687+00'),
	('a7f0d122-7601-415d-bb96-cf9112c97521', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 0, '2026-05-09 13:18:55.842039+00'),
	('a715c109-b5f8-4975-9209-b64c31825a1b', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '764a643f-2abd-4547-9825-506788e0fa47', -5, '2026-05-09 13:19:30.950153+00'),
	('d9c90f77-ff65-46d0-9a73-e9c8a2c8254f', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 9, '2026-04-29 13:01:56.149888+00'),
	('8e594d1e-b953-48c1-948a-c38615766253', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '8412656d-55da-4b50-a8cd-749bc0859e49', -140, '2026-05-04 16:45:01.46726+00'),
	('565a937e-c2dc-4604-ba7a-9ac1aebd399d', '7af58026-049f-4cb7-96fc-32653c17a011', 'ee1ef8cb-339a-4ff6-9bd6-300e01fa1465', 4, '2026-04-30 20:01:34.631332+00');


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."stock_movements" ("id", "user_id", "product_id", "type", "quantity", "reference_type", "reference_id", "note", "date", "created_at") VALUES
	('cb953a58-0e93-4e51-abb6-10bb731c1271', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 'out', -30, 'purchase', '2a309397-02d6-4169-aec0-398ab7cf6dca', 'Annulation ACH-2026-001', '2026-05-09', '2026-05-09 13:18:24.558768+00'),
	('07d78ffb-3ba9-4dab-a90d-d9da95d0f8bc', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 'in', 30, 'sale', 'b52c3ee9-9193-49a2-8e58-a615c90ad31a', 'Annulation VEN-2026-001', '2026-05-09', '2026-05-09 13:18:55.842039+00'),
	('b56cd634-c48c-44c2-a0f6-94d51486cdef', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '764a643f-2abd-4547-9825-506788e0fa47', 'in', 20, 'purchase', '95d9cbec-4bf2-43b9-9ade-4752c04f9099', NULL, '2026-05-09', '2026-05-09 13:19:31.042221+00'),
	('f438c568-ec4d-4b9e-b7e9-54833e750253', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 6, 'purchase', 'efdecad6-4ee0-4f72-9619-622bbd37d32a', 'Mise à jour achat', '2026-04-29', '2026-04-29 13:02:40.355699+00'),
	('690f10c9-2d2c-4c58-9b96-0ac66623b442', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 2, 'purchase', 'a7318986-cefa-496f-803a-45e8983a2031', NULL, '2026-04-29', '2026-04-29 13:32:18.35015+00'),
	('ca75efdc-e691-4d61-909b-81cad84e859d', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 'in', 3, 'purchase', 'a7318986-cefa-496f-803a-45e8983a2031', 'Ajout nouvel article à l''achat', '2026-04-29', '2026-04-29 13:33:14.773072+00'),
	('0263c73c-dfc1-40b3-bb23-924aec2229f6', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 2, 'purchase', 'ee35b3f1-015a-4782-b626-5b6baa344ddc', NULL, '2026-04-29', '2026-04-29 13:43:58.653341+00'),
	('a6a8bcec-be81-40d1-93b3-c4f67f3021b4', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 'in', 3, 'purchase', 'ee35b3f1-015a-4782-b626-5b6baa344ddc', NULL, '2026-04-29', '2026-04-29 13:43:58.943263+00'),
	('2b2bfbcf-69ac-4998-8f25-1ee716bd2c1f', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 3, 'purchase', 'ee35b3f1-015a-4782-b626-5b6baa344ddc', 'Ajout nouvel article à l''achat', '2026-04-29', '2026-04-29 14:09:13.07573+00'),
	('a0461b0f-e4d3-4d7a-aefd-e87b8185206c', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 1, 'purchase', 'ee35b3f1-015a-4782-b626-5b6baa344ddc', 'Ajout nouvel article à l''achat', '2026-04-29', '2026-04-29 14:09:49.827926+00'),
	('787b7937-100a-4270-b0b5-6d4a1c813d27', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 'in', 2, 'purchase', 'f197bd75-af9b-40f9-9fb1-5a275f2dab7f', NULL, '2026-04-29', '2026-04-29 14:12:25.358959+00'),
	('ed521263-eb98-4af3-bc73-3d034dea3efd', '7af58026-049f-4cb7-96fc-32653c17a011', 'ade14234-c1ae-4156-a005-a5b55186b799', 'in', 5, 'purchase', 'c41378aa-5af7-4928-8262-d587717ee2f7', NULL, '2026-04-29', '2026-04-29 14:15:35.359692+00'),
	('3b7c269b-4312-43a0-8f74-ac52704af387', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 2, 'purchase', '55ebda44-4889-40ed-801d-8de60bb68551', NULL, '2026-04-29', '2026-04-29 14:24:31.426297+00'),
	('5495b049-3ed5-4244-82a4-0d820344e554', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 1, 'purchase', 'ff309316-ca3a-496d-8d98-6445145ecf6c', NULL, '2026-04-29', '2026-04-29 14:51:01.310886+00'),
	('12fbe908-34c7-4680-b5b7-678826deb21d', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'out', -2, 'sale', 'ed731313-604d-41ad-b3f0-8f716716b04d', NULL, '2026-04-29', '2026-04-29 19:03:43.876237+00'),
	('0a050619-1c6f-4e18-920b-e0e2d8c3f601', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 2, 'purchase', '32e8aef3-89d2-444d-8fad-3b9ff9988bf8', NULL, '2026-04-30', '2026-04-30 00:42:45.962719+00'),
	('765e0a1c-9c8a-4144-96c5-f34443bb3354', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 1, 'purchase', '518bb181-2ea3-4d97-90a7-e373e620d7a0', NULL, '2026-04-30', '2026-04-30 10:38:39.124296+00'),
	('b6c320a3-1aea-4743-b444-025c58b1588c', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 1, 'purchase', '48630c59-1228-4a20-851e-597ff61de4f3', NULL, '2026-04-30', '2026-04-30 10:39:23.517937+00'),
	('17cbb541-b5b3-4d3a-a2e2-c230df16e40d', '7af58026-049f-4cb7-96fc-32653c17a011', 'ade14234-c1ae-4156-a005-a5b55186b799', 'in', 1, 'purchase', '23712e67-7eb5-4fd5-b7f8-5606e35a5bb3', NULL, '2026-04-30', '2026-04-30 10:39:44.88907+00'),
	('a8b7d516-a27b-4e32-a82a-95040c2311e0', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 'in', 1, 'purchase', '23b2a1ee-a750-4d61-a38f-320bfc94091c', NULL, '2026-04-30', '2026-04-30 10:39:55.742124+00'),
	('c9f9ad32-6a88-463f-8ca7-191a0c8d3d79', '7af58026-049f-4cb7-96fc-32653c17a011', '56e04034-04ad-49a4-837e-5978c1cb4b79', 'in', 3, 'purchase', 'd1098df7-9d5b-4726-b656-a9b60dd9d380', NULL, '2026-04-30', '2026-04-30 10:40:16.34012+00'),
	('2206b40d-c193-4766-bf9c-8ebece5f1a8e', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'in', 1, 'purchase', 'b8daf262-93b4-4d0a-9f96-41e5d7e2e36d', NULL, '2026-05-01', '2026-05-01 08:44:28.136502+00'),
	('c647e321-db64-4933-9802-cf0c69ef9575', '7af58026-049f-4cb7-96fc-32653c17a011', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 'in', 3, 'purchase', 'a85bfaa7-5c0c-45d0-bab5-ded14384ff8d', NULL, '2026-05-01', '2026-05-01 09:57:03.022674+00'),
	('dcdfe8ad-9ab0-4e03-8903-6db7f59a4829', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'in', 3, 'purchase', 'ba847240-c246-4541-a7cf-3ecc742b783a', NULL, '2026-05-02', '2026-05-02 08:18:26.718214+00'),
	('c5e44933-1f22-4e26-a165-f9054e9d27df', '7af58026-049f-4cb7-96fc-32653c17a011', '86b47ce6-06b9-4ff3-95e1-0d7455db7658', 'in', 2, 'purchase', 'ba847240-c246-4541-a7cf-3ecc742b783a', NULL, '2026-05-02', '2026-05-02 08:18:27.081241+00'),
	('5bfa8d05-7361-43c7-b334-1ef8189b20cb', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'bbd19eaf-c780-40cc-aac0-cd89ba8ec0c3', 'out', -5, 'sale', 'b5d5fd01-1a7f-4ff1-a734-578d325d9039', NULL, '2026-05-02', '2026-05-02 11:37:29.748825+00'),
	('be7bd513-578e-468e-a687-a728d555cf73', '7af58026-049f-4cb7-96fc-32653c17a011', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 'out', -3, 'sale', '80219446-f6ff-45d0-b235-fad600958b98', NULL, '2026-05-02', '2026-05-02 16:38:23.697565+00'),
	('e76f21fd-eea9-4969-ad20-30910d5edf97', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'in', 3, 'purchase', '492af259-5f6c-415c-83e7-10a7b190f050', NULL, '2026-05-02', '2026-05-02 17:05:52.906936+00'),
	('1d359234-da38-4ca7-b5a1-8d82a2427c4c', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'out', -3, 'sale', 'dcde1247-9b5f-471c-a2b8-a024fcef34a2', NULL, '2026-05-03', '2026-05-03 11:09:43.899777+00'),
	('575b7c5b-1241-4599-920f-50ba5c105fb9', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 'out', -45, 'sale', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', NULL, '2026-05-04', '2026-05-04 12:14:43.605724+00'),
	('d5827f5f-6d1e-41d2-aa6b-c503fd79adf0', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '38c58d47-46fa-4c72-9555-064f69762d14', 'out', -34, 'sale', 'b2692a3a-3d5e-4c1c-b112-10cd5c0470d4', NULL, '2026-05-04', '2026-05-04 12:14:44.177219+00'),
	('927b208b-e9e5-418a-9d3a-1033de0cdafd', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -3, 'sale', '4d2931a3-3cc0-49d7-a686-1c00454e6e2a', NULL, '2026-05-04', '2026-05-04 13:09:39.305021+00'),
	('64505bca-085c-4b90-b03a-e668ccbe9915', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'out', -1, 'sale', '4d2931a3-3cc0-49d7-a686-1c00454e6e2a', NULL, '2026-05-04', '2026-05-04 13:09:39.939977+00'),
	('0e787db6-715e-4c73-917e-a4e9273c41c5', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -2, 'sale', '5191ca98-e6d0-4519-8fe4-751b41b6c2a8', NULL, '2026-05-04', '2026-05-04 13:22:08.962821+00'),
	('14eec6ca-8729-4bdd-9b66-7a20e91d7e35', '7af58026-049f-4cb7-96fc-32653c17a011', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 'out', -3, 'sale', '5191ca98-e6d0-4519-8fe4-751b41b6c2a8', NULL, '2026-05-04', '2026-05-04 13:22:09.36643+00'),
	('2133bf0e-8992-43da-ba84-51abed2e055d', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -3, 'sale', 'e23a6517-6e85-4cc6-b1bc-d9fd31e2c136', NULL, '2026-05-04', '2026-05-04 13:35:52.392345+00'),
	('05fcd373-eefd-4292-9c89-15b22f5f7f74', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', 'c3ad5bfa-1465-4689-9cf6-4d93279370c8', 'out', -40, 'sale', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', NULL, '2026-05-03', '2026-05-04 16:40:04.742833+00'),
	('aa53ad41-bada-408c-beb2-ae61efab14bc', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '38c58d47-46fa-4c72-9555-064f69762d14', 'out', -100, 'sale', 'db379efe-8d8b-4ff4-bd28-1944ebe9df90', NULL, '2026-05-03', '2026-05-04 16:40:05.394293+00'),
	('fc50c180-8be1-403c-abcb-20a2275c5283', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '8412656d-55da-4b50-a8cd-749bc0859e49', 'out', -20, 'sale', '78df4434-d15f-4713-b7c8-711b8f3d1f66', NULL, '2026-05-04', '2026-05-04 16:46:06.954699+00'),
	('113224fd-1a32-4e43-9998-c059eadf5b64', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -3, 'sale', '0826b1ed-3de9-4a7c-aa49-70964e672b64', NULL, '2026-05-05', '2026-05-05 06:07:42.347402+00'),
	('2442bcd5-1912-46ee-a535-b0ef070e4404', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -2, 'sale', '609c9cdd-631f-4037-9b8b-4a8a671fee2c', NULL, '2026-05-05', '2026-05-05 06:10:01.200218+00'),
	('dffae1d5-fcc5-4335-875c-6be6b90158f9', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -2, 'sale', '31dbcaee-c8b3-473b-823b-2fe530933cf0', NULL, '2026-05-05', '2026-05-05 06:42:50.005244+00'),
	('e2c28239-c3b7-435d-8047-b1b6849750ce', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 'in', 30, 'purchase', '2a309397-02d6-4169-aec0-398ab7cf6dca', NULL, '2026-05-09', '2026-05-09 13:18:13.908266+00'),
	('d3db1956-d229-4945-9121-3b2995868787', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '92f4fb99-f961-423f-8cf2-2e7b4d411094', 'out', -30, 'sale', 'b52c3ee9-9193-49a2-8e58-a615c90ad31a', NULL, '2026-05-09', '2026-05-09 13:18:45.860051+00'),
	('080bbbb4-78d5-4425-958b-529e751be56b', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -3, 'sale', 'd1474c0d-7904-4e0a-88b6-cb4b9a52b27b', NULL, '2026-05-05', '2026-05-05 10:36:21.904409+00'),
	('8cbbaabd-d529-4af6-857f-b66bb78a50a2', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'in', 6, 'manual', NULL, 'Production', '2026-05-05', '2026-05-05 11:40:30.440118+00'),
	('21884a03-9256-4501-ac80-5c993562e3ca', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'in', 3, 'manual', NULL, 'Production 2', '2026-05-05', '2026-05-05 11:40:47.775433+00'),
	('e966fbda-8fc1-45b5-938b-7f5099d9ac43', '7af58026-049f-4cb7-96fc-32653c17a011', 'b44bc23b-68fb-41ef-916e-8e7836590e0f', 'in', 5, 'manual', NULL, 'prod1', '2026-05-05', '2026-05-05 11:43:01.802398+00'),
	('14ea20b5-43c7-4002-9074-3cd30e00a16f', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'out', -3, 'manual', NULL, 'donne', '2026-05-05', '2026-05-05 11:43:52.030534+00'),
	('2ac5ac83-2783-4ddf-894d-e6b87c2e8f39', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '8412656d-55da-4b50-a8cd-749bc0859e49', 'out', -60, 'sale', '22c11683-e6d4-41e3-98c7-6314157f92e2', NULL, '2026-05-05', '2026-05-05 16:04:42.78787+00'),
	('cb345385-60cf-4498-9bfb-e41d9b5929ab', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '8412656d-55da-4b50-a8cd-749bc0859e49', 'out', -60, 'sale', 'b9dbc7e2-a3b8-4af3-a7a8-f9af3e31d2f4', NULL, '2026-05-05', '2026-05-05 16:05:01.149868+00'),
	('1a5d03bc-94b3-4d52-8f82-bfb3786feeb9', '7af58026-049f-4cb7-96fc-32653c17a011', 'ee1ef8cb-339a-4ff6-9bd6-300e01fa1465', 'in', 4, 'manual', NULL, 'ajout', '2026-05-06', '2026-05-06 20:29:15.059764+00'),
	('ff05bf97-4920-4226-8593-05980e65c9da', '7af58026-049f-4cb7-96fc-32653c17a011', '674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', 'in', 2, 'purchase', 'd6f97ecb-a08a-45f6-9374-4f59cf7820d9', NULL, '2026-05-06', '2026-05-06 21:06:36.726088+00'),
	('a16f64c0-1225-4139-a7d1-7860b2b68350', '7af58026-049f-4cb7-96fc-32653c17a011', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 'in', 1, 'purchase', 'e6fa947d-3c14-4208-be47-9ea9b97dbfd1', NULL, '2026-05-06', '2026-05-06 21:33:22.107534+00'),
	('60fb34ea-edeb-4f15-bde3-c1e2f85a2d45', '7af58026-049f-4cb7-96fc-32653c17a011', '674b8ab0-16c5-4d4a-9b53-3c6d2b4891b7', 'in', 1, 'purchase', 'd8c1ca43-ce82-45a5-a94c-a9f606fdf25f', NULL, '2026-05-06', '2026-05-06 21:34:31.586911+00'),
	('23b7290b-d5c0-45a3-a275-7b20dbe6950f', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -1, 'sale', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', NULL, '2026-05-07', '2026-05-07 15:02:46.14895+00'),
	('bddd93d4-766d-4bd5-a236-395413ae32be', '7af58026-049f-4cb7-96fc-32653c17a011', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 'out', -1, 'sale', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', NULL, '2026-05-07', '2026-05-07 15:02:46.535001+00'),
	('949142dc-453b-4890-931e-2586e0ce6f41', '7af58026-049f-4cb7-96fc-32653c17a011', '172ea880-a4ce-4ea2-aef8-6f93d18358ff', 'out', -3, 'sale', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', NULL, '2026-05-07', '2026-05-07 15:02:46.92078+00'),
	('5461ffb6-32a8-4563-aeea-22d11ce1d7a3', '7af58026-049f-4cb7-96fc-32653c17a011', '5593a5fa-31b7-4cda-819f-a5172788b6bd', 'out', -4, 'sale', 'd9bbbc6b-0863-43d4-bbf1-ce4bf4bdabf6', NULL, '2026-05-07', '2026-05-07 15:02:47.218994+00'),
	('b365a6b0-5c93-40b1-a30b-cbc777c71cee', '7af58026-049f-4cb7-96fc-32653c17a011', 'a462ebd8-fd1e-467d-a819-e2f7501a3d85', 'out', -1, 'sale', '43ef9c93-ae80-47e2-86b0-f315b8ab70d1', NULL, '2026-05-07', '2026-05-07 15:44:41.507154+00'),
	('a39b67dc-452c-42dd-8719-9351e32fd184', '7af58026-049f-4cb7-96fc-32653c17a011', '6abbb3f4-60f3-4d5d-8fad-56f7d4b689aa', 'out', -1, 'sale', 'a5edd236-5885-40d8-852c-0f6257123738', NULL, '2026-05-07', '2026-05-07 15:54:22.459395+00'),
	('16419914-249c-4e5d-b220-53521b8c1144', '7af58026-049f-4cb7-96fc-32653c17a011', '1632b736-be83-4134-a8b2-de29dad5fb37', 'out', -2, 'sale', '556ac582-9f82-4160-9250-ee4427d2ac76', NULL, '2026-05-07', '2026-05-07 15:55:08.439304+00'),
	('e2396fdc-8d24-4a1d-8311-71b2f4e38730', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '764a643f-2abd-4547-9825-506788e0fa47', 'out', -25, 'sale', '83c6d4a9-1ba1-4ee7-9fb6-34b9e62f81d5', NULL, '2026-05-09', '2026-05-09 13:20:09.064795+00'),
	('9a8ef1ae-5813-4a45-b2d1-4e8dc4b6f32b', '7af58026-049f-4cb7-96fc-32653c17a011', '3f4bfd9b-dc42-432e-81b6-9a4ec12cd5af', 'in', 9, 'purchase', '543e9833-bb1c-47e7-8cdf-f657a43b4a9a', NULL, '2026-05-07', '2026-05-07 18:09:26.826118+00'),
	('0f576e0a-dfd4-4c51-9f94-cc9e5a0d1a5a', '7af58026-049f-4cb7-96fc-32653c17a011', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 'out', -1, 'sale', 'ae5f64f0-3c39-4e9a-9e95-d486af4813d3', NULL, '2026-05-08', '2026-05-08 20:16:14.220538+00'),
	('a199391f-b673-40e1-96d6-6eee13ff127b', '7af58026-049f-4cb7-96fc-32653c17a011', 'af2f0949-a02f-4d56-921a-fc55fad08a48', 'in', 1, 'purchase', '2286a45b-9553-4315-8414-4bf71f691890', NULL, '2026-05-08', '2026-05-08 20:16:34.477145+00');


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."supplier_payments" ("id", "user_id", "purchase_id", "amount", "date", "note", "created_at", "methode_paiement") VALUES
	('838e0b91-ec29-4a5b-a76a-7c35ee06d365', '7af58026-049f-4cb7-96fc-32653c17a011', 'f197bd75-af9b-40f9-9fb1-5a275f2dab7f', 100.00, '2026-04-29', NULL, '2026-04-30 01:42:49.263159+00', 'Espèces'),
	('9b05df0a-4343-4847-9443-03082cf02da9', '7af58026-049f-4cb7-96fc-32653c17a011', 'd1098df7-9d5b-4726-b656-a9b60dd9d380', 200.00, '2026-04-30', NULL, '2026-04-30 10:40:16.489196+00', NULL),
	('a155eda6-0c0e-4fbb-9d0f-cb2a56086dd0', '7af58026-049f-4cb7-96fc-32653c17a011', '492af259-5f6c-415c-83e7-10a7b190f050', 3300.00, '2026-05-02', NULL, '2026-05-02 17:05:53.065566+00', NULL),
	('4be9ab63-00ce-49cc-8960-e2a51a2dca2f', '7af58026-049f-4cb7-96fc-32653c17a011', 'a85bfaa7-5c0c-45d0-bab5-ded14384ff8d', 100.00, '2026-05-06', NULL, '2026-05-06 20:42:31.634602+00', NULL),
	('9d535b5c-babf-41ce-bbbe-a4d13a382a0b', '7af58026-049f-4cb7-96fc-32653c17a011', 'd6f97ecb-a08a-45f6-9374-4f59cf7820d9', 120.00, '2026-05-06', NULL, '2026-05-06 21:06:36.821856+00', NULL),
	('3b0e07f5-5f67-4059-b10c-90fc51f56017', '7af58026-049f-4cb7-96fc-32653c17a011', '543e9833-bb1c-47e7-8cdf-f657a43b4a9a', 1000.00, '2026-05-07', NULL, '2026-05-07 18:09:26.961706+00', NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('logos', 'logos', NULL, '2026-04-29 20:54:13.396834+00', '2026-04-29 20:54:13.396834+00', true, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('ac3c0596-5c7a-439e-b3be-fba00cc2774d', 'logos', '7af58026-049f-4cb7-96fc-32653c17a011/logo.jpeg', '7af58026-049f-4cb7-96fc-32653c17a011', '2026-04-29 23:37:33.152303+00', '2026-04-29 23:41:12.623832+00', '2026-04-29 23:37:33.152303+00', '{"eTag": "\"67e39a18b2250d6db3b5c00e566772da\"", "size": 596985, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-04-29T23:41:13.000Z", "contentLength": 596985, "httpStatusCode": 200}', '6d749dea-9351-4e9a-a20e-6dca6be76e21', '7af58026-049f-4cb7-96fc-32653c17a011', '{}'),
	('497784f5-664f-4afa-babf-199dd765444c', 'logos', '0171ae54-3906-4cc6-b8a7-95166f6ca98c/logo.png', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '2026-04-30 15:52:57.180074+00', '2026-04-30 15:52:57.180074+00', '2026-04-30 15:52:57.180074+00', '{"eTag": "\"4eaca051789f6f963e75d468f47a06a1\"", "size": 85840, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-30T15:52:58.000Z", "contentLength": 85840, "httpStatusCode": 200}', 'f3a38179-00f5-4166-bb1b-40148620a2d9', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '{}'),
	('f048e3a9-890b-4cf3-8c24-85a52f2017f8', 'logos', '0171ae54-3906-4cc6-b8a7-95166f6ca98c/logo.jpg', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '2026-04-30 17:29:03.730052+00', '2026-04-30 17:29:03.730052+00', '2026-04-30 17:29:03.730052+00', '{"eTag": "\"63880c1ca71000d6d3ea38f150497594\"", "size": 87226, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-04-30T17:29:04.000Z", "contentLength": 87226, "httpStatusCode": 200}', '4bbc2dc6-b229-4381-bb86-b1b51935b4f0', '0171ae54-3906-4cc6-b8a7-95166f6ca98c', '{}'),
	('be3c296b-ff0f-4db9-9cec-88cee54d013d', 'logos', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed/logo.png', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '2026-05-04 16:38:48.746174+00', '2026-05-04 16:38:48.746174+00', '2026-05-04 16:38:48.746174+00', '{"eTag": "\"82c09580ebd2f7ff99580ab83d79a808\"", "size": 37925, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-04T16:38:49.000Z", "contentLength": 37925, "httpStatusCode": 200}', 'a1707499-37e7-44d0-9d0f-05dfbac1eb54', 'f4c78c15-fda1-4c6c-ba8c-786917bf28ed', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 330, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict feRWYZetEcecesrUG1WG4lHZZ6GLoXelk4VReF2Z59Y9Dpu78l0F9DIloHbGGBl

RESET ALL;
