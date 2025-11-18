Ao executar o comando -> SELECT * FROM information_schema.role_table_grants WHERE table_schema = 'auth';

Resutado:

| grantor             | grantee  | table_catalog | table_schema | table_name        | privilege_type | is_grantable | with_hierarchy |
| ------------------- | -------- | ------------- | ------------ | ----------------- | -------------- | ------------ | -------------- |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_domains       | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_providers    | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sso_providers     | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | instances         | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | schema_migrations | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_factors       | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | refresh_tokens    | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | users             | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | users             | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | audit_log_entries | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | saml_relay_states | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_amr_claims    | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | flow_state        | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | identities        | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | one_time_tokens   | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | INSERT         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | SELECT         | YES          | YES            |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | UPDATE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | DELETE         | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | TRUNCATE       | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | REFERENCES     | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | mfa_challenges    | TRIGGER        | NO           | NO             |
| supabase_auth_admin | postgres | postgres      | auth         | sessions          | INSERT         | NO           | NO             |

E ao executar este comando aqui SELECT * FROM auth.users LIMIT 1; dar o resutado abaixo.

| instance_id                          | id                                   | aud           | role          | email                     | encrypted_password                                           | email_confirmed_at            | invited_at | confirmation_token | confirmation_sent_at | recovery_token | recovery_sent_at | email_change_token_new | email_change | email_change_sent_at | last_sign_in_at               | raw_app_meta_data                          | raw_user_meta_data      | is_super_admin | created_at                    | updated_at                    | phone | phone_confirmed_at | phone_change | phone_change_token | phone_change_sent_at | confirmed_at                  | email_change_token_current | email_change_confirm_status | banned_until | reauthentication_token | reauthentication_sent_at | is_sso_user | deleted_at | is_anonymous |
| ------------------------------------ | ------------------------------------ | ------------- | ------------- | ------------------------- | ------------------------------------------------------------ | ----------------------------- | ---------- | ------------------ | -------------------- | -------------- | ---------------- | ---------------------- | ------------ | -------------------- | ----------------------------- | ------------------------------------------ | ----------------------- | -------------- | ----------------------------- | ----------------------------- | ----- | ------------------ | ------------ | ------------------ | -------------------- | ----------------------------- | -------------------------- | --------------------------- | ------------ | ---------------------- | ------------------------ | ----------- | ---------- | ------------ |
| 00000000-0000-0000-0000-000000000000 | 54dc49eb-8745-4c24-91d6-0cc808ea988a | authenticated | authenticated | alaxricardsilva@gmail.com | $2a$10$9CP2EI1YuHJZNGoA12r.5eBGYKwbZeby0Bry4FoG7vv38ebqUWD.m | 2025-11-17 20:51:46.879678+00 | null       |                    | null                 |                | null             |                        |              | null                 | 2025-11-17 20:56:04.109014+00 | {"provider":"email","providers":["email"]} | {"email_verified":true} | null           | 2025-11-17 20:51:46.852336+00 | 2025-11-17 20:56:04.166397+00 | null  | null               |              |                    | null                 | 2025-11-17 20:51:46.879678+00 |                            | 0                           | null         |                        | null                     | false       | null       | false        |

Era para ter dois usuários o alaxricardsilva@gmail.com e o alaxricardsilva@outlook.com e não só um.