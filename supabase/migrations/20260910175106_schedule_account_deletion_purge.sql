do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'xfish-purge-deleted-accounts' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'xfish-purge-deleted-accounts',
  '17 3 * * *',
  $$
    select net.http_post(
      url := 'https://wohhibbpckzfxvcesrnu.supabase.co/functions/v1/purge-deleted-accounts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-xfish-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'xfish_account_purge_secret' limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
