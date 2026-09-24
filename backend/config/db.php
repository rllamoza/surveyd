<?php
/**
 * Configuración y Conexión PDO a Base de Datos MySQL
 * OmniPoll - Spatial Data Intelligence Core
 */

class Database {
    private static ?PDO $instance = null;
    private static bool $attempted = false;

    private static string $host = '127.0.0.1';
    private static string $dbName = 'app_encuestas';
    private static string $user = 'root';
    private static string $pass = '';
    private static string $charset = 'utf8mb4';
    private static int $port = 3306;

    /**
     * Cargar configuración desde JSON o variables de entorno
     */
    private static function initEnv(): void {
        $configFile = __DIR__ . '/db_credentials.json';
        if (file_exists($configFile)) {
            $json = json_decode(file_get_contents($configFile), true);
            if (is_array($json)) {
                self::$host = $json['host'] ?? self::$host;
                self::$port = (int)($json['port'] ?? self::$port);
                self::$dbName = $json['dbname'] ?? self::$dbName;
                self::$user = $json['user'] ?? self::$user;
                self::$pass = $json['password'] ?? self::$pass;
            }
        }

        // Variables de entorno tienen prioridad si están definidas
        if (getenv('DB_HOST')) self::$host = getenv('DB_HOST');
        if (getenv('DB_PORT')) self::$port = (int)getenv('DB_PORT');
        if (getenv('DB_NAME')) self::$dbName = getenv('DB_NAME');
        if (getenv('DB_USER')) self::$user = getenv('DB_USER');
        if (getenv('DB_PASS') !== false) self::$pass = getenv('DB_PASS');
    }

    /**
     * Obtener instancia singleton de la conexión PDO
     */
    public static function getConnection(): ?PDO {
        if (self::$instance === null && !self::$attempted) {
            self::$attempted = true;
            self::initEnv();

            $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$dbName . ";charset=" . self::$charset;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . self::$charset . " COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, self::$user, self::$pass, $options);
            } catch (PDOException $e) {
                // Registrar aviso y permitir fallback suave en las APIs
                error_log("OmniPoll DB Connection Notice: " . $e->getMessage());
                return null;
            }
        }

        return self::$instance;
    }

    /**
     * Verificar si la conexión a la base de datos está activa
     */
    public static function isConnected(): bool {
        return self::getConnection() !== null;
    }

    /**
     * Crear la base de datos y ejecutar el script inicial schema.sql
     */
    public static function autoSetup(): array {
        self::initEnv();
        $dsnWithoutDb = "mysql:host=" . self::$host . ";port=" . self::$port . ";charset=" . self::$charset;
        
        try {
            $pdo = new PDO($dsnWithoutDb, self::$user, self::$pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);

            $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . self::$dbName . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `" . self::$dbName . "`");

            $schemaPath = dirname(__DIR__) . '/database/schema.sql';
            if (file_exists($schemaPath)) {
                $sql = file_get_contents($schemaPath);
                $pdo->exec($sql);
                self::$instance = null;
                self::$attempted = false;
                return ['success' => true, 'message' => 'Base de datos app_encuestas inicializada e importada con éxito'];
            }

            return ['success' => true, 'message' => 'Base de datos creada.'];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
