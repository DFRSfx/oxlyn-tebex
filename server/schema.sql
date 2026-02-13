-- --------------------------------------------------------
-- Anfitrião:                    127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
-- SO do servidor:               Win64
-- HeidiSQL Versão:              12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- A despejar estrutura da base de dados para oxlyn_tebex
CREATE DATABASE IF NOT EXISTS `oxlyn_tebex` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `oxlyn_tebex`;

-- A despejar estrutura para tabela oxlyn_tebex.cart_stats
CREATE TABLE IF NOT EXISTS `cart_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_name` varchar(500) NOT NULL,
  `discord_id` varchar(255) DEFAULT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `removed_at` timestamp NULL DEFAULT NULL,
  `purchased` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_package_name` (`package_name`),
  KEY `idx_discord_id` (`discord_id`),
  KEY `idx_added_at` (`added_at`),
  KEY `idx_purchased` (`purchased`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.cart_stats: ~0 rows (aproximadamente)
DELETE FROM `cart_stats`;

-- A despejar estrutura para tabela oxlyn_tebex.download_tokens
CREATE TABLE IF NOT EXISTS `download_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `discord_user_id` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `file_name` varchar(500) NOT NULL,
  `max_downloads` int(11) NOT NULL DEFAULT 1,
  `remaining_downloads` int(11) NOT NULL,
  `is_claimed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `claimed_at` timestamp NULL DEFAULT NULL,
  `last_download_at` timestamp NULL DEFAULT NULL,
  `scripts_claimed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_discord_user` (`discord_user_id`),
  KEY `idx_claimed` (`is_claimed`),
  KEY `idx_remaining` (`remaining_downloads`),
  CONSTRAINT `chk_downloads` CHECK (`remaining_downloads` >= 0),
  CONSTRAINT `chk_max_downloads` CHECK (`max_downloads` >= 1)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.download_tokens: ~0 rows (aproximadamente)
DELETE FROM `download_tokens`;

-- A despejar estrutura para tabela oxlyn_tebex.download_users
CREATE TABLE IF NOT EXISTS `download_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `discord_id` varchar(255) DEFAULT NULL,
  `discord_username` varchar(255) DEFAULT NULL,
  `discord_avatar` varchar(255) DEFAULT NULL,
  `discord_roles` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `discord_id` (`discord_id`),
  KEY `idx_discord_id` (`discord_id`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.download_users: ~8 rows (aproximadamente)
DELETE FROM `download_users`;
INSERT INTO `download_users` (`id`, `email`, `password`, `role`, `discord_id`, `discord_username`, `discord_avatar`, `discord_roles`, `created_at`, `updated_at`) VALUES
	(1, 'dariofrsoares@gmail.com', NULL, 'admin', '902307850376871946', '.dfrs', '88ce8d296f9f30db3e37e61c5df41b8a', NULL, '2025-12-17 05:18:40', '2026-01-03 23:14:15'),
	(2, 'vanguardlabstebex@gmail.com', NULL, 'admin', '1294762024492072960', 'james_vanguard', '8f4fa671cbaabe0cc6662cedd414fce1', NULL, '2025-12-17 23:14:22', '2025-12-23 04:05:07'),
	(3, '964980696227668018@discord.user', NULL, 'user', '964980696227668018', 'street.31', NULL, NULL, '2025-12-17 23:53:53', '2025-12-18 22:10:32'),
	(4, 'ricardoandrade20042@gmail.com', NULL, 'user', '1294640082854084648', 'ca1cheadx', 'a_042327bd6eb05fe9f2700c0bb930c83e', NULL, '2025-12-18 00:20:15', '2025-12-19 23:34:23'),
	(5, 'maldivasrpbase@gmail.com', NULL, 'user', '797151975467778049', 'ttvpedrokas', '9465d7c108ca626bfeb97c3668e24cc0', NULL, '2025-12-18 01:00:22', '2025-12-19 22:49:33'),
	(6, '411924221598629890@discord.user', NULL, 'user', '411924221598629890', 'franciscosilva', NULL, NULL, '2025-12-19 18:29:31', '2025-12-19 18:30:24'),
	(7, '1004522175065247855@discord.user', NULL, 'user', '1004522175065247855', 'benny._.john', NULL, NULL, '2025-12-20 18:07:37', '2025-12-23 01:14:25'),
	(8, '907215494065561620@discord.user', NULL, 'user', '907215494065561620', 'filips.10', NULL, NULL, '2026-01-03 19:09:46', '2026-01-03 19:11:30');

-- A despejar estrutura para tabela oxlyn_tebex.login_stats
CREATE TABLE IF NOT EXISTS `login_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discord_id` varchar(255) DEFAULT NULL,
  `cfx_identifier` varchar(255) DEFAULT NULL,
  `login_type` enum('discord','cfx') NOT NULL,
  `last_login_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `login_count` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_discord_login` (`discord_id`,`login_type`),
  UNIQUE KEY `unique_cfx_login` (`cfx_identifier`,`login_type`),
  KEY `idx_discord_id` (`discord_id`),
  KEY `idx_cfx_identifier` (`cfx_identifier`),
  KEY `idx_login_type` (`login_type`),
  KEY `idx_last_login` (`last_login_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.login_stats: ~1 rows (aproximadamente)
DELETE FROM `login_stats`;
INSERT INTO `login_stats` (`id`, `discord_id`, `cfx_identifier`, `login_type`, `last_login_at`, `login_count`) VALUES
	(1, '902307850376871946', '15951249', 'discord', '2026-01-04 04:47:17', 3);

-- A despejar estrutura para tabela oxlyn_tebex.orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discord_user_id` varchar(255) NOT NULL,
  `product_name` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_discord_user` (`discord_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.orders: ~0 rows (aproximadamente)
DELETE FROM `orders`;

-- A despejar estrutura para tabela oxlyn_tebex.package_stats
CREATE TABLE IF NOT EXISTS `package_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_name` varchar(500) NOT NULL,
  `view_count` int(11) NOT NULL DEFAULT 0,
  `cart_count` int(11) NOT NULL DEFAULT 0,
  `last_viewed_at` timestamp NULL DEFAULT NULL,
  `last_added_to_cart_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_name` (`package_name`),
  KEY `idx_view_count` (`view_count`),
  KEY `idx_cart_count` (`cart_count`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.package_stats: ~1 rows (aproximadamente)
DELETE FROM `package_stats`;
INSERT INTO `package_stats` (`id`, `package_name`, `view_count`, `cart_count`, `last_viewed_at`, `last_added_to_cart_at`, `created_at`, `updated_at`) VALUES
	(1, 'Notify System', 3, 0, '2026-01-04 03:02:58', NULL, '2026-01-04 02:29:17', '2026-01-04 03:02:58');

-- A despejar estrutura para tabela oxlyn_tebex.package_views
CREATE TABLE IF NOT EXISTS `package_views` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_name` varchar(500) NOT NULL,
  `discord_id` varchar(255) DEFAULT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_package_name` (`package_name`),
  KEY `idx_discord_id` (`discord_id`),
  KEY `idx_viewed_at` (`viewed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.package_views: ~0 rows (aproximadamente)
DELETE FROM `package_views`;

-- A despejar estrutura para tabela oxlyn_tebex.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(10) unsigned NOT NULL,
  `data` mediumtext DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.sessions: ~0 rows (aproximadamente)
DELETE FROM `sessions`;

-- A despejar estrutura para tabela oxlyn_tebex.analytics_events
CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `event_id` varchar(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `discord_id` varchar(255) DEFAULT NULL,
  `page_url` text NOT NULL,
  `package_name` varchar(255) DEFAULT NULL,
  `device_type` enum('mobile','tablet','desktop') DEFAULT NULL,
  `browser` varchar(100) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `event_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_id` (`event_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_package_name` (`package_name`),
  KEY `idx_country` (`country`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.analytics_events: ~0 rows (aproximadamente)
DELETE FROM `analytics_events`;

-- A despejar estrutura para tabela oxlyn_tebex.analytics_sessions
CREATE TABLE IF NOT EXISTS `analytics_sessions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(36) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ended_at` timestamp NULL DEFAULT NULL,
  `duration_seconds` int(11) DEFAULT 0,
  `page_views` int(11) DEFAULT 0,
  `cart_additions` int(11) DEFAULT 0,
  `is_bounce` tinyint(1) DEFAULT 0,
  `is_converted` tinyint(1) DEFAULT 0,
  `device_type` enum('mobile','tablet','desktop') DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `idx_started_at` (`started_at`),
  KEY `idx_is_bounce` (`is_bounce`),
  KEY `idx_is_converted` (`is_converted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.analytics_sessions: ~0 rows (aproximadamente)
DELETE FROM `analytics_sessions`;

-- A despejar estrutura para tabela oxlyn_tebex.analytics_page_views
CREATE TABLE IF NOT EXISTS `analytics_page_views` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(36) NOT NULL,
  `page_url` varchar(500) NOT NULL,
  `time_on_page_seconds` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 1,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_viewed_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_page` (`session_id`, `page_url`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_viewed_at` (`viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.analytics_page_views: ~0 rows (aproximadamente)
DELETE FROM `analytics_page_views`;

-- A despejar estrutura para tabela oxlyn_tebex.analytics_conversions
CREATE TABLE IF NOT EXISTS `analytics_conversions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(36) NOT NULL,
  `package_name` varchar(255) NOT NULL,
  `viewed_at` timestamp NULL DEFAULT NULL,
  `added_to_cart_at` timestamp NULL DEFAULT NULL,
  `purchased_at` timestamp NULL DEFAULT NULL,
  `funnel_stage` enum('view','cart','purchase') NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_package_name` (`package_name`),
  KEY `idx_funnel_stage` (`funnel_stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela oxlyn_tebex.analytics_conversions: ~0 rows (aproximadamente)
DELETE FROM `analytics_conversions`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
