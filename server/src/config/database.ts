import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oxlyn_tebex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const createDownloadTokensTable = `
    CREATE TABLE IF NOT EXISTS download_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) UNIQUE NOT NULL,
      discord_user_id VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      max_downloads INT NOT NULL DEFAULT 1,
      remaining_downloads INT NOT NULL,
      is_claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL DEFAULT NULL,
      last_download_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_token (token),
      INDEX idx_discord_user (discord_user_id),
      INDEX idx_claimed (is_claimed),
      CONSTRAINT chk_downloads CHECK (remaining_downloads >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  
  await pool.query(createDownloadTokensTable);

  // Admin-managed tags shown on package cards (e.g. POPULAR, NEW, LAST RELEASE)
  const createPackageTagsTable = `
    CREATE TABLE IF NOT EXISTS package_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_keyword VARCHAR(255) NOT NULL,
      label VARCHAR(64) NOT NULL,
      variant VARCHAR(32) NOT NULL DEFAULT 'orange',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_keyword (package_keyword),
      INDEX idx_enabled (enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createPackageTagsTable);

  // Seed default BUNDLE tag — automatically badges any package whose name
  // contains "bundle" (e.g. "[BUNDLE] Admin"). Idempotent: only inserts when
  // a tag with keyword "bundle" doesn't already exist, so admins can rename,
  // recolor, or delete it from the panel without it being recreated on boot.
  const [existingBundleTag] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM package_tags WHERE package_keyword = 'bundle' LIMIT 1`
  );
  if ((existingBundleTag as RowDataPacket[]).length === 0) {
    await pool.query(
      `INSERT INTO package_tags (package_keyword, label, variant, enabled, display_order)
       VALUES ('bundle', 'BUNDLE', 'amber', TRUE, 0)`
    );
  }

  // Custom display ordering for Tebex packages (admin-controlled)
  const createPackageOrderTable = `
    CREATE TABLE IF NOT EXISTS package_order (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tebex_package_id INT UNIQUE NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_display_order (display_order),
      INDEX idx_tebex_package_id (tebex_package_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createPackageOrderTable);

  // Legacy tables removed during the dead-code purge: `hero_images`,
  // `hero_cards`, `featured_product`, `landing_settings`, `live_toasts` were
  // unreferenced after the hero redesign (parcels animation + top scripts
  // carousel). Drop them on boot so existing databases catch up.
  await pool.query('DROP TABLE IF EXISTS live_toasts');
  await pool.query('DROP TABLE IF EXISTS landing_settings');
  await pool.query('DROP TABLE IF EXISTS featured_product');
  await pool.query('DROP TABLE IF EXISTS hero_cards');
  await pool.query('DROP TABLE IF EXISTS hero_images');

  // Bundle contents — declares which Tebex packages compose a given bundle
  // package. Used by storefront to render the "Bundle Contents" section in
  // place of "Key Features" for any package whose name or category contains
  // the word BUNDLE. Each bundle is identified by its Tebex package id.
  const createBundleContentsTable = `
    CREATE TABLE IF NOT EXISTS bundle_contents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bundle_tebex_id INT NOT NULL,
      resource_tebex_id INT NOT NULL,
      resource_name VARCHAR(255) NOT NULL DEFAULT '',
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_bundle_resource (bundle_tebex_id, resource_tebex_id),
      INDEX idx_bundle (bundle_tebex_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createBundleContentsTable);

  // Storefront categories — admin-defined groupings shown as filter pills on
  // the /scripts page. Replaces the auto-categorization Tebex provides per
  // package; admin chooses which packages belong to each category via the
  // package_categories junction table below.
  const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(160) NOT NULL,
      description TEXT NULL,
      image VARCHAR(500) NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_slug (slug),
      INDEX idx_display_order (display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createCategoriesTable);

  // Junction: which Tebex packages belong to which category.
  // tebex_package_id is not a FK — Tebex packages live in the external API.
  // ON DELETE CASCADE: deleting a category drops all its assignments cleanly.
  const createPackageCategoriesTable = `
    CREATE TABLE IF NOT EXISTS package_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      tebex_package_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_cat_pkg (category_id, tebex_package_id),
      INDEX idx_category (category_id),
      INDEX idx_tebex_package (tebex_package_id),
      CONSTRAINT fk_pkgcat_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createPackageCategoriesTable);

  // Seed two default categories so the storefront keeps having "Bundles" and
  // "Free" filter pills out of the box. They start empty — admin assigns
  // packages from the Categorias admin page (drag-and-drop). Idempotent:
  // re-running this on subsequent boots is a no-op once the rows exist.
  await pool.query(`
    INSERT IGNORE INTO categories (name, slug, display_order) VALUES
      ('Bundles', 'bundles', 10),
      ('Free',    'free',    20)
  `);

  // Singleton row holding the global promo countdown shown on the top bar
  // above the navigation. `end_at` is the absolute UTC timestamp the
  // countdown ticks down to — every visitor sees the same remaining time
  // regardless of timezone because the client computes `end_at - Date.now()`.
  // Admins manage this from /admin/countdown.
  const createPromoCountdownTable = `
    CREATE TABLE IF NOT EXISTS promo_countdown (
      id INT PRIMARY KEY,
      end_at DATETIME NOT NULL,
      code VARCHAR(64) NOT NULL DEFAULT 'OXLYN-10',
      title VARCHAR(160) NOT NULL DEFAULT 'Discount Started',
      subtitle VARCHAR(255) NOT NULL DEFAULT 'The 10% discount is now valid on all scripts.',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createPromoCountdownTable);

  // Seed default 4d 4h 30m 10s from first boot (361 810s). Idempotent: only
  // inserts when the row doesn't exist, so admin edits aren't reset.
  await pool.query(`
    INSERT IGNORE INTO promo_countdown (id, end_at, code, title, subtitle, enabled)
    VALUES (
      1,
      DATE_ADD(NOW(), INTERVAL 361810 SECOND),
      'OXLYN-10',
      'Discount Started',
      'The 10% discount is now valid on all scripts.',
      TRUE
    )
  `);

  // "Top Scripts" — admin-curated horizontal carousel of packages rendered
  // with the same PackageCard as the catalog. Order is taken from
  // display_order so admins can drag-reorder. Old schema (slot INT PK +
  // eyebrow/title/description) is migrated by drop-and-recreate below.
  const [oldTopSellersCols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'top_sellers'`
  ) as [RowDataPacket[], any];
  const hasLegacyTopSellers = oldTopSellersCols.some(
    (c: any) => c.COLUMN_NAME === 'slot' || c.COLUMN_NAME === 'eyebrow'
  );
  if (hasLegacyTopSellers) {
    await pool.query('DROP TABLE IF EXISTS top_sellers');
  }
  // Old singleton settings table no longer needed — the new section is a
  // horizontal carousel, not a timed rotator.
  await pool.query('DROP TABLE IF EXISTS top_sellers_settings');

  const createTopSellersTable = `
    CREATE TABLE IF NOT EXISTS top_sellers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tebex_package_id INT NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tebex_package_id (tebex_package_id),
      INDEX idx_display_order (display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createTopSellersTable);

  // "Recent Payments" marquee shown on each package details page (and
  // possibly elsewhere). Each row is a fake-but-realistic purchase the
  // storefront surfaces as social proof. Names + avatars + amounts are
  // admin-managed; the `minutes_ago` timestamp offset is what makes the
  // "Today at HH:MM" line read as "recent" — the client subtracts this
  // from the visitor's local clock so the time always feels current
  // regardless of the visitor's timezone.
  //
  // Avatar files are referenced by basename and looked up under
  // /public/recentpayments/ on the client.
  const createRecentPaymentsTable = `
    CREATE TABLE IF NOT EXISTS recent_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_name VARCHAR(80) NOT NULL,
      avatar_filename VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      minutes_ago INT NOT NULL DEFAULT 5,
      display_order INT NOT NULL DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enabled (enabled),
      INDEX idx_display_order (display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.query(createRecentPaymentsTable);

  // Seed 50 unique buyer names. Each row has a distinct `minutes_ago` that
  // ranges from a few minutes up to 2h (1–120), with deliberately irregular
  // gaps — no two cards land on the same minute, and the spread keeps the
  // carousel from looking like a regular tick. Photos cycle through the 21
  // files in /public/recentpayments/. Amounts mix single-script prices
  // (12.99–44.98) with combined totals simulating multi-item baskets
  // (e.g. 14.99 + 24.99 = 39.98, 19.99×3 = 59.97).
  const [existingPayments] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM recent_payments LIMIT 1'
  );
  if ((existingPayments as RowDataPacket[]).length === 0) {
    await pool.query(`
      INSERT INTO recent_payments (buyer_name, avatar_filename, amount, minutes_ago, display_order) VALUES
        ('JozaxRP',        'calib.jpg',     14.99,   1,  10),
        ('Jorris091',      'casie.jpg',     24.99,   4,  20),
        ('StrawRoleplay',  'casier.jpg',    29.99,   8,  30),
        ('NeoVexHD',       'cassandra.jpg', 19.99,  13,  40),
        ('PixelKnight',    'catimage.jpg',  39.98,  17,  50),
        ('VexRP_77',       'cityrp.jpg',    12.99,  21,  60),
        ('NovaStrike',     'cover1.jpg',    26.99,  24,  70),
        ('SmoothVibe',     'gods.jpg',      44.98,  28,  80),
        ('GodzVibe',       'godzila.jpg',   32.98,  32,  90),
        ('RPL_Sniper',     'gplz1.jpg',     14.99,  36, 100),
        ('Joshua_RX',      'joshua.jpg',    19.99,  41, 110),
        ('KlzVortex',      'klz1.jpg',      24.99,  47, 120),
        ('LonerVibez',     'loner.jpg',     29.99,  52, 130),
        ('MerelGali',      'meregali.jpg',  44.98,  58, 140),
        ('Stilarsky',      'stilar.jpg',    12.99,  63, 150),
        ('StuartHD',       'stuart.jpg',    26.99,  68, 160),
        ('UkPlayerRP',     'ukman.jpg',     59.97,  73, 170),
        ('ViceRP_HD',      'vicerp.png',    14.99,  79, 180),
        ('ZenDayRP',       'zenday.jpg',    24.99,  84, 190),
        ('ZenPlz',         'zenp1.jpg',     19.99,  89, 200),
        ('ZodaylixRP',     'zodayli.jpg',   44.98,  94, 210),
        ('KaizenLP',       'calib.jpg',     12.99,  99, 220),
        ('ShadowMV',       'casie.jpg',     26.99, 104, 230),
        ('ApexRP_88',      'casier.jpg',    39.98, 109, 240),
        ('NightVexX',      'cassandra.jpg', 14.99, 115, 250),
        ('TitanRP_42',     'catimage.jpg',  24.99, 119, 260),
        ('FrostByte',      'cityrp.jpg',    29.99,   3, 270),
        ('KaosVibez',      'cover1.jpg',    19.99,   6, 280),
        ('EmberRP',        'gods.jpg',      44.98,  11, 290),
        ('CrimsonHD',      'godzila.jpg',   32.98,  16, 300),
        ('RogueVect',      'gplz1.jpg',     26.99,  19, 310),
        ('PhantomRP',      'joshua.jpg',    14.99,  23, 320),
        ('DraXoRP',        'klz1.jpg',      12.99,  27, 330),
        ('KestrelHD',      'loner.jpg',     39.98,  31, 340),
        ('MystRP',         'meregali.jpg',  19.99,  35, 350),
        ('NexusOPS',       'stilar.jpg',    24.99,  40, 360),
        ('OrionVibes',     'stuart.jpg',    29.99,  45, 370),
        ('PrismRP',        'ukman.jpg',     44.98,  49, 380),
        ('QuadzRP_HD',     'vicerp.png',    14.99,  54, 390),
        ('RaptorPlz',      'zenday.jpg',    12.99,  60, 400),
        ('SableRP',        'zenp1.jpg',     26.99,  65, 410),
        ('ThornGG',        'zodayli.jpg',   59.97,  70, 420),
        ('VortexRP_88',    'calib.jpg',     19.99,  75, 430),
        ('WolfRP_HD',      'casie.jpg',     44.98,  81, 440),
        ('XenonLP',        'casier.jpg',    24.99,  86, 450),
        ('YkonRP',         'cassandra.jpg', 29.99,  91, 460),
        ('ZephyrRP',       'catimage.jpg',  14.99,  96, 470),
        ('AzraelHD',       'cityrp.jpg',    12.99, 102, 480),
        ('BlitzRP_77',     'cover1.jpg',    26.99, 107, 490),
        ('CaspianHD',      'gods.jpg',      39.98, 112, 500)
    `);
  }

  // May 2026 batch — 18 new buyers pairing with the avatars added in this
  // sprint, plus the two new SKUs (escrow 22.99 / open-source 59.99) mixed
  // through the amounts so they surface in the marquee.
  //
  // Uses INSERT … WHERE NOT EXISTS so it's safe to re-run on existing
  // installs (production VPS) without duplicating rows — the initial 50-row
  // seed above only fires on an empty table, this batch fills the gap on
  // databases that were already populated.

  // One-off rename — BondAgent007 was renamed to BondKlash081 after first
  // deploy. Idempotent: returns 0 rows affected after the rename has run
  // once, so it's safe to leave in place on every boot.
  await pool.query(
    `UPDATE recent_payments SET buyer_name = ? WHERE buyer_name = ?`,
    ['BondKlash081', 'BondAgent007']
  );

  const newPaymentBatch: Array<[string, string, number, number, number]> = [
    ['BondKlash081',    'bond.jpg',            22.99,   2, 510],
    ['ChrisManuel',     'christmanuel.jpg',    59.99,   6, 520],
    ['CJ_GrovExt',      'cj.jpg',              35.98,  11, 530],
    ['DomDolazHD',      'domdolaz.jpg',        22.99,  15, 540],
    ['FuegoQueen',      'fuego.jpg',           47.98,  19, 550],
    ['GonzalesXP',      'gonzales.jpg',        14.99,  23, 560],
    ['JackBalboaRP',    'jackbalboa.jpg',      22.99,  27, 570],
    ['JoniStareRP',     'jonistare.jpg',       74.98,  33, 580],
    ['JuarezKingHD',    'juarez.jpg',          22.99,  38, 590],
    ['Katy_RPL',        'katy.jpg',            42.98,  44, 600],
    ['LosLadroes',      'losladroes.jpg',      59.99,  50, 610],
    ['ManoVentureLP',   'manoventure.jpg',     22.99,  56, 620],
    ['Rochi_88',        'rochi.jpg',           24.99,  62, 630],
    ['SoulOmarRP',      'soulomar.jpg',        82.98,  68, 640],
    ['StolInve_HD',     'stolinve.jpg',        22.99,  75, 650],
    ['TheDealer_RP',    'thedealer.jpg',       45.98,  82, 660],
    ['TonyStuartRP',    'tonystuart.jpg',      22.99,  90, 670],
    ['ViscarraNelson',  'viscarranelson.jpg',  59.99,  99, 680],
    // Letter-avatar entries — empty avatar_filename triggers the
    // generative coloured-initial tile on the client (see
    // RecentPaymentsSection > pickAvatarColor). First-letter spread
    // chosen so the 8-colour palette cycles visibly across the row.
    ['LuarteRP02',      '',                    22.99,   4, 690],
    ['KrampuxX',        '',                    24.99,   9, 700],
    ['TheStudio_MV',    '',                    59.99,  16, 710],
    ['NetherZenRP',     '',                    22.99,  22, 720],
    ['BarbaRoja_HD',    '',                    37.98,  29, 730],
    ['OmegaShiftLP',    '',                    22.99,  41, 740],
    ['SilverHookRP',    '',                    14.99,  53, 750],
    ['IronCladRP_88',   '',                    47.98,  72, 760],
  ];
  for (const [buyer, avatar, amount, minutesAgo, displayOrder] of newPaymentBatch) {
    await pool.query(
      `INSERT INTO recent_payments (buyer_name, avatar_filename, amount, minutes_ago, display_order)
         SELECT ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM recent_payments WHERE buyer_name = ?)`,
      [buyer, avatar, amount, minutesAgo, displayOrder, buyer]
    );
  }

  // Letter-avatar batch — 40 image-less buyers that render the generative
  // coloured-initial tile (empty avatar_filename → RecentPaymentsSection draws
  // the first letter on a colour picked from the buyer name). First letters are
  // spread across the alphabet so the 8-colour palette cycles visibly. Amounts
  // use the new price points (13.99 / 14.99 / 18.99 / 26.99 / 44.98); minutes_ago
  // is deliberately irregular so they interleave with the existing rows. Safe to
  // re-run (INSERT … WHERE NOT EXISTS by buyer_name).
  const letterPaymentBatch: Array<[string, number, number, number]> = [
    ['AlbieRP',       14.99,   2,  770],
    ['BexterHD',      13.99,  14,  780],
    ['CydoxRP',       18.99,  27,  790],
    ['DravenLP',      44.98,   5,  800],
    ['EzlowRP_77',    26.99,  39,  810],
    ['FynnVibez',     14.99,  11,  820],
    ['GorbaxHD',      13.99,  52,  830],
    ['HextorRP',      18.99,  20,  840],
    ['IzzyRoleplay',  44.98,  63,  850],
    ['JarvixLP',      26.99,   8,  860],
    ['KlausRP_88',    14.99,  44,  870],
    ['LumiVibez',     13.99,  31,  880],
    ['MaddoxHD',      18.99,  77,  890],
    ['NyxoraRP',      44.98,  17,  900],
    ['OrbitLP',       26.99,  58,  910],
    ['PryceRP_42',    14.99,   3,  920],
    ['QuillaxHD',     13.99,  88,  930],
    ['RustyVibez',    18.99,  35,  940],
    ['SableHexRP',    44.98,  69,  950],
    ['TovinLP',       26.99,  23,  960],
    ['UlricRP',       14.99,  96,  970],
    ['VandrixHD',     13.99,  48,  980],
    ['WrenlyRP',      18.99,  13,  990],
    ['XaltoVibez',    44.98,  74, 1000],
    ['YumaRP_77',     26.99,  29, 1010],
    ['ZorbaxLP',      14.99, 104, 1020],
    ['AshenRP_HD',    13.99,  41, 1030],
    ['BlytheVibez',   18.99,  61, 1040],
    ['CorvexRP',      44.98,   7, 1050],
    ['DunlapLP',      26.99,  83, 1060],
    ['EmberlyRP',     14.99,  19, 1070],
    ['FloxHD_88',     13.99,  55, 1080],
    ['GravenRP',      18.99, 112, 1090],
    ['HollyVibez',    44.98,  33, 1100],
    ['IronoxLP',      26.99,  66, 1110],
    ['JuniperRP',     14.99,  10, 1120],
    ['KestraHD',      13.99,  91, 1130],
    ['LowenRP_42',    18.99,  46, 1140],
    ['MirthVibez',    44.98,  25, 1150],
    ['NovaxRP_HD',    26.99,  72, 1160],
  ];
  for (const [buyer, amount, minutesAgo, displayOrder] of letterPaymentBatch) {
    await pool.query(
      `INSERT INTO recent_payments (buyer_name, avatar_filename, amount, minutes_ago, display_order)
         SELECT ?, '', ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM recent_payments WHERE buyer_name = ?)`,
      [buyer, amount, minutesAgo, displayOrder, buyer]
    );
  }

  // "IP Connection" admin log — one row per IP visit. A revisit within the
  // dedupe window (handled in the route as `IP_CONNECTION_WINDOW_MS`) only
  // bumps `visit_count` + `last_seen_at` on the most recent row for that IP;
  // an idle gap larger than the window creates a fresh row so admins can
  // see when the same person came back. Geo is filled from ip-api.com at
  // insert-time and never re-fetched.
  const createIpConnectionsTable = `
    CREATE TABLE IF NOT EXISTS ip_connections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ip_address VARCHAR(64) NOT NULL,
      country VARCHAR(80) NOT NULL DEFAULT '',
      country_code VARCHAR(8) NOT NULL DEFAULT '',
      region VARCHAR(80) NOT NULL DEFAULT '',
      city VARCHAR(80) NOT NULL DEFAULT '',
      isp VARCHAR(120) NOT NULL DEFAULT '',
      user_agent VARCHAR(500) NOT NULL DEFAULT '',
      visit_count INT NOT NULL DEFAULT 1,
      first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ip (ip_address),
      INDEX idx_last_seen (last_seen_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await pool.query(createIpConnectionsTable);
}
