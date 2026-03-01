package com.superdo.ai.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(DatabaseProperties.class)
public class DatabaseConfig {

    @Bean
    public DataSource dataSource(DatabaseProperties properties) {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setDriverClassName(properties.getDriverClassName());
        hikariConfig.setJdbcUrl(withSslMode(properties.getUrl(), properties.getSslEnabled(), properties.getSslMode()));
        hikariConfig.setUsername(properties.getUsername());
        hikariConfig.setPassword(properties.getPassword());
        hikariConfig.setPoolName(properties.getPool().getPoolName());
        hikariConfig.setMinimumIdle(properties.getPool().getMinimumIdle());
        hikariConfig.setMaximumPoolSize(properties.getPool().getMaximumPoolSize());
        hikariConfig.setIdleTimeout(properties.getPool().getIdleTimeoutMs());
        hikariConfig.setMaxLifetime(properties.getPool().getMaxLifetimeMs());
        hikariConfig.setConnectionTimeout(properties.getPool().getConnectionTimeoutMs());
        hikariConfig.setValidationTimeout(properties.getPool().getValidationTimeoutMs());
        hikariConfig.setConnectionTestQuery("SELECT 1");
        hikariConfig.setInitializationFailTimeout(1);
        hikariConfig.addDataSourceProperty("reWriteBatchedInserts", "true");

        long leakDetectionThresholdMs = properties.getPool().getLeakDetectionThresholdMs();
        if (leakDetectionThresholdMs > 0) {
            hikariConfig.setLeakDetectionThreshold(leakDetectionThresholdMs);
        }

        return new HikariDataSource(hikariConfig);
    }

    private String withSslMode(String url, Boolean sslEnabled, String sslMode) {
        if (url == null || url.contains("sslmode=")) {
            return url;
        }
        String effectiveSslMode = Boolean.TRUE.equals(sslEnabled) ? sslMode : "disable";
        String separator = url.contains("?") ? "&" : "?";
        return url + separator + "sslmode=" + effectiveSslMode;
    }
}
