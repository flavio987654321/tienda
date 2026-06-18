-- Alternativa: crear la campaña de prueba directo en el SQL Editor de Supabase
-- (hace lo mismo que prisma/seed-canasta.ts)

DO $$
DECLARE
  campaign_id TEXT := 'cnst_' || replace(gen_random_uuid()::text, '-', '');
BEGIN
  INSERT INTO "DonationCampaign"
    ("id", "name", "description", "goalAmount", "reservePct", "status", "bannerActive", "updatedAt")
  VALUES
    (campaign_id, 'Canasta Solidaria #1',
     'Ayudemos juntos a completar una canasta familiar con alimentos básicos para un vecino de la comunidad.',
     50667, 10, 'ACTIVE', true, CURRENT_TIMESTAMP);

  INSERT INTO "DonationProduct" ("id", "campaignId", "name", "targetPrice", "sortOrder") VALUES
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Leche entera (1L x6)', 9000, 0),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Arroz 2kg', 3200, 1),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Fideos 2kg', 3000, 2),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Aceite de girasol 1.5L', 4200, 3),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Azúcar 1kg', 1800, 4),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Harina 000 2kg', 2600, 5),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Yerba mate 500g', 4500, 6),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Sal fina 500g', 700, 7),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Lentejas o porotos 500g', 2400, 8),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Puré de tomates x2', 2200, 9),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Polenta 500g', 1400, 10),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Galletitas de agua x2', 2800, 11),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Jabón en pan x3', 3600, 12),
    ('prd_' || replace(gen_random_uuid()::text, '-', ''), campaign_id, 'Papel higiénico x4', 4200, 13);

  RAISE NOTICE 'Campaña creada con id: %', campaign_id;
END $$;
