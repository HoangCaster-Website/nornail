-- Isolated temporary Stripe test data. Real store and other applications are untouched.
CREATE TABLE public.nornails_sandbox_products (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(jsonb_typeof(data::jsonb) = 'object'),
  position INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE public.nornails_sandbox_settings (id INTEGER PRIMARY KEY CHECK(id = 1), data TEXT NOT NULL CHECK(jsonb_typeof(data::jsonb) = 'object'));
CREATE TABLE public.nornails_sandbox_sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE INDEX nornails_sandbox_sessions_expiry ON public.nornails_sandbox_sessions(expires);
CREATE TABLE public.nornails_sandbox_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX nornails_sandbox_rate_limits_expiry ON public.nornails_sandbox_rate_limits(expires);
CREATE TABLE public.nornails_sandbox_orders (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  items TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  session_id TEXT UNIQUE,
  email TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX nornails_sandbox_orders_created ON public.nornails_sandbox_orders(created_at DESC);
CREATE TABLE public.nornails_sandbox_stripe_events (id TEXT PRIMARY KEY);

-- One merchant per Stripe mode. Invite credentials and OAuth states are hashed.
CREATE TABLE public.nornails_sandbox_stripe_merchants (
  mode TEXT PRIMARY KEY CHECK(mode IN ('test','live')),
  account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
CREATE TABLE public.nornails_sandbox_connect_invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  account_id TEXT,
  expires INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE public.nornails_sandbox_connect_states (
  state_hash TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES public.nornails_sandbox_connect_invites(id),
  expires INTEGER NOT NULL
);
CREATE TABLE public.nornails_sandbox_connect_sessions (
  token_hash TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES public.nornails_sandbox_connect_invites(id),
  verified_account TEXT,
  expires INTEGER NOT NULL
);
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN stripe_account TEXT;

ALTER TABLE public.nornails_sandbox_orders ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN shipping_ore INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN subtotal INTEGER;
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN checkout_url TEXT;
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN expires_at INTEGER;
ALTER TABLE public.nornails_sandbox_orders ADD COLUMN delivery_details TEXT;

CREATE TABLE public.nornails_sandbox_admin_credentials (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL CHECK(password_hash ~ '^[a-f0-9]{32}:[a-f0-9]{64}$'),
  enabled BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.nornails_sandbox_orders ADD CONSTRAINT nornails_sandbox_order_status CHECK(status IN ('pending','processing','paid','failed','expired'));
ALTER TABLE public.nornails_sandbox_orders ADD CONSTRAINT nornails_sandbox_order_mode CHECK(mode IN ('test','live'));
ALTER TABLE public.nornails_sandbox_orders ADD CONSTRAINT nornails_sandbox_order_amount CHECK(amount > 0 AND amount <= 99999999);
ALTER TABLE public.nornails_sandbox_orders ADD CONSTRAINT nornails_sandbox_order_currency CHECK(currency = 'nok');
ALTER TABLE public.nornails_sandbox_orders ADD CONSTRAINT nornails_sandbox_order_delivery CHECK(fulfillment IN ('pickup','shipping') AND shipping_ore >= 0);
CREATE INDEX nornails_sandbox_connect_states_invite ON public.nornails_sandbox_connect_states(invite_id);
CREATE INDEX nornails_sandbox_connect_sessions_invite ON public.nornails_sandbox_connect_sessions(invite_id);
ALTER TABLE public.nornails_sandbox_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_products FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_products TO service_role;
ALTER TABLE public.nornails_sandbox_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_settings TO service_role;
ALTER TABLE public.nornails_sandbox_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_sessions TO service_role;
ALTER TABLE public.nornails_sandbox_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_rate_limits TO service_role;
ALTER TABLE public.nornails_sandbox_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_orders TO service_role;
ALTER TABLE public.nornails_sandbox_stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_stripe_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_stripe_events TO service_role;
ALTER TABLE public.nornails_sandbox_stripe_merchants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_stripe_merchants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_stripe_merchants TO service_role;
ALTER TABLE public.nornails_sandbox_connect_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_connect_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_connect_invites TO service_role;
ALTER TABLE public.nornails_sandbox_connect_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_connect_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_connect_states TO service_role;
ALTER TABLE public.nornails_sandbox_connect_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_connect_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_connect_sessions TO service_role;
ALTER TABLE public.nornails_sandbox_admin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_admin_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_admin_credentials TO service_role;

CREATE TABLE public.nornails_sandbox_config (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 stripe_secret_id UUID,
 webhook_secret_id UUID,
 account_id TEXT,
 expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.nornails_sandbox_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nornails_sandbox_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nornails_sandbox_config TO service_role;
INSERT INTO public.nornails_sandbox_config(id,expires_at) VALUES (1,'2026-11-15T00:00:00Z');
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('w1','{"id":"w1","name":"Function Liquid W1","brand":"maiwell","group":"liquid","unit":"3,79 liter","tag":"AKRYL LIQUID","description":"Klar modelleringsvæske til akrylnegler. En salongstørrelse for det daglige arbeidet med akrylmodellering.","short":"Klar akryl liquid","specs":[["Type","Akryl liquid"],["Farge","Klar"],["Volum","3,79 l"]],"category":"negler","image":"assets/images/w1.webp","priceOre":10000,"active":true,"translations":{"en":{"name":"Function Liquid W1","unit":"3.79 litres","tag":"ACRYLIC LIQUID","description":"Clear modelling liquid for acrylic nails. A salon size for everyday acrylic nail modelling.","short":"Clear acrylic liquid","specs":[["Type","Acrylic liquid"],["Colour","Clear"],["Volume","3.79 l"]]}}}',0);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('w2','{"id":"w2","name":"Function Liquid W2","brand":"maiwell","group":"liquid","unit":"3,79 liter","tag":"AKRYL LIQUID","description":"Violett modelleringsvæske til akrylnegler. Function Liquid W2 er et alternativ for deg som jobber med akrylmodellering.","short":"Violett akryl liquid","specs":[["Type","Akryl liquid"],["Farge","Violett"],["Volum","3,79 l"]],"category":"negler","image":"assets/images/w2.webp","priceOre":12500,"active":true,"translations":{"en":{"name":"Function Liquid W2","unit":"3.79 litres","tag":"ACRYLIC LIQUID","description":"Violet modelling liquid for acrylic nails. Function Liquid W2 is an option for acrylic nail modelling.","short":"Violet acrylic liquid","specs":[["Type","Acrylic liquid"],["Colour","Violet"],["Volume","3.79 l"]]}}}',1);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('urawa','{"id":"urawa","name":"Super UP200","brand":"URAWA","group":"utstyr","unit":"Negledrill med håndstykke","tag":"ELEKTRISK UTSTYR","description":"Elektrisk negledrill med trinnløs hastighetskontroll opptil 25 000 omdreininger per minutt. Med forover- og reversfunksjon til presist arbeid med naturlige og kunstige negler.","short":"Presisjon til arbeidsbordet","specs":[["Type","Elektrisk negledrill"],["Hastighet","Opptil 25 000 o/min"],["Retning","Forover / revers"]],"category":"elektrisk","image":"assets/images/urawa.webp","priceOre":15000,"active":true,"translations":{"en":{"name":"Super UP200","unit":"Nail drill with handpiece","tag":"ELECTRICAL EQUIPMENT","description":"Electric nail drill with variable speed control up to 25,000 revolutions per minute. Forward and reverse rotation for precise work on natural and artificial nails.","short":"Precision for your workspace","specs":[["Type","Electric nail drill"],["Speed","Up to 25,000 rpm"],["Direction","Forward / reverse"]]}}}',2);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('novicide','{"id":"novicide","name":"Novicide konsentrat","brand":"NOVICIDE","group":"hygiene","unit":"2 000 ml","tag":"DESINFEKSJON","description":"Desinfeksjonskonsentrat til salongverktøy med ikke-porøse overflater. Følg alltid etiketten og produsentens anvisninger for blanding, kontakttid og materialer.","short":"Desinfeksjon til salongverktøy","specs":[["Type","Desinfeksjonskonsentrat"],["Volum","2 000 ml"],["Bruk","I henhold til etiketten"]],"safety":true,"category":"hygiene","image":"assets/images/novicide.webp","priceOre":7500,"active":true,"translations":{"en":{"name":"Novicide concentrate","unit":"2,000 ml","tag":"DISINFECTION","description":"Disinfectant concentrate for salon tools with non-porous surfaces. Always follow the label and manufacturer’s instructions for dilution, contact time and suitable materials.","short":"Disinfection for salon tools","specs":[["Type","Disinfectant concentrate"],["Volume","2,000 ml"],["Use","Follow the label"]]}}}',3);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('acetone','{"id":"acetone","name":"Aceton","brand":"maiwell","group":"hygiene","unit":"5 liter","tag":"RENS & FJERNING","description":"Aceton i en praktisk 5-liters kanne til salongbruk. Les alltid etiketten og produktinformasjonen før bruk.","short":"Salongstørrelse, 5 liter","specs":[["Type","Aceton"],["Volum","5 l"],["Emballasje","Plastkanne"]],"safety":true,"category":"hygiene","image":"assets/images/acetone.webp","priceOre":5000,"active":true,"translations":{"en":{"name":"Acetone","unit":"5 litres","tag":"CLEANSING & REMOVAL","description":"Acetone in a practical 5-litre container for salon use. Always read the label and product information before use.","short":"Salon size, 5 litres","specs":[["Type","Acetone"],["Volume","5 l"],["Packaging","Plastic container"]]}}}',4);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('alcohol','{"id":"alcohol","name":"Isopropanol 80 %","brand":"maiwell","group":"hygiene","unit":"5 liter","tag":"RENS & FORBEREDELSE","description":"Klar isopropanol 80 % til forberedelse og rens i neglearbeidet. Følg produktets etikett og anvisninger før bruk.","short":"Klar isopropanol","specs":[["Type","Isopropanol"],["Konsentrasjon","80 %"],["Volum","5 l"]],"safety":true,"category":"hygiene","image":"assets/images/alcohol.webp","priceOre":5000,"active":true,"translations":{"en":{"name":"Isopropanol 80%","unit":"5 litres","tag":"CLEANSING & PREPARATION","description":"Clear isopropanol 80% for preparation and cleansing during nail work. Follow the product label and instructions before use.","short":"Clear isopropanol","specs":[["Type","Isopropanol"],["Concentration","80%"],["Volume","5 l"]]}}}',5);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('buffer','{"id":"buffer","name":"Neglebuffer 100/180","brand":"maiwell","group":"utstyr","unit":"Oransje / hvit","tag":"MANIKYRUTSTYR","description":"Tresidig neglebuffer med korning 100/180 og myk polstring. For utjevning og forberedelse av neglens overflate.","short":"Form, jevn ut og forbered","specs":[["Type","Tresidig buffer"],["Korning","100 / 180"],["Farge","Oransje / hvit"]],"category":"manikyr","image":"assets/images/buffer.webp","priceOre":1000,"active":true,"translations":{"en":{"name":"Nail buffer 100/180","unit":"Orange / white","tag":"MANICURE TOOLS","description":"Three-sided nail buffer with 100/180 grit and soft padding. For smoothing and preparing the nail surface.","short":"Shape, smooth and prepare","specs":[["Type","Three-sided buffer"],["Grit","100 / 180"],["Colour","Orange / white"]]}}}',6);
INSERT INTO public.nornails_sandbox_products (id,data,position) VALUES ('novicide-small','{"id":"novicide-small","name":"Novicide konsentrat","brand":"NOVICIDE","group":"hygiene","unit":"500 ml","tag":"DESINFEKSJON","description":"Desinfeksjonskonsentrat til salongverktøy i en mindre flaske. Følg alltid etiketten og produsentens anvisninger for blanding, kontakttid og materialer.","short":"En mindre størrelse til salongen","specs":[["Type","Desinfeksjonskonsentrat"],["Volum","500 ml"],["Bruk","I henhold til etiketten"]],"safety":true,"category":"hygiene","image":"assets/images/novicide-small.webp","priceOre":5000,"active":true,"translations":{"en":{"name":"Novicide concentrate","unit":"500 ml","tag":"DISINFECTION","description":"Disinfectant concentrate for salon tools in a smaller bottle. Always follow the label and manufacturer’s instructions for dilution, contact time and suitable materials.","short":"A smaller size for the salon","specs":[["Type","Disinfectant concentrate"],["Volume","500 ml"],["Use","Follow the label"]]}}}',7);
INSERT INTO public.nornails_sandbox_settings(id,data) VALUES (1,'{"enabled":true,"currency":"NOK","pickupEnabled":true,"shippingEnabled":true,"shippingOre":2500,"taxMode":"included","termsConfirmed":true,"termsUrl":"https://hoangcaster-website.github.io/nornail/sandbox.html#terms"}');
