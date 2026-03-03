package com.superdo.ai.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.database")
public class DatabaseProperties {

    @NotBlank
    private String url;

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotBlank
    private String driverClassName = "org.postgresql.Driver";

    @NotNull
    private Boolean sslEnabled = true;

    @NotBlank
    private String sslMode = "require";

    @Valid
    private Pool pool = new Pool();

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDriverClassName() {
        return driverClassName;
    }

    public void setDriverClassName(String driverClassName) {
        this.driverClassName = driverClassName;
    }

    public Boolean getSslEnabled() {
        return sslEnabled;
    }

    public void setSslEnabled(Boolean sslEnabled) {
        this.sslEnabled = sslEnabled;
    }

    public String getSslMode() {
        return sslMode;
    }

    public void setSslMode(String sslMode) {
        this.sslMode = sslMode;
    }

    public Pool getPool() {
        return pool;
    }

    public void setPool(Pool pool) {
        this.pool = pool;
    }

    public static class Pool {
        @NotBlank
        private String poolName = "superdo-hikari-pool";

        @Min(1)
        private int minimumIdle = 1;

        @Min(2)
        private int maximumPoolSize = 3;

        @Min(10000)
        private long idleTimeoutMs = 30000L;

        @Min(30000)
        private long maxLifetimeMs = 60000L;

        @Min(250)
        private long connectionTimeoutMs = 30000L;

        @Min(250)
        private long validationTimeoutMs = 5000L;

        @Min(0)
        private long keepaliveTimeMs = 25000L;

        @Min(0)
        private long leakDetectionThresholdMs = 0L;

        public String getPoolName() {
            return poolName;
        }

        public void setPoolName(String poolName) {
            this.poolName = poolName;
        }

        public int getMinimumIdle() {
            return minimumIdle;
        }

        public void setMinimumIdle(int minimumIdle) {
            this.minimumIdle = minimumIdle;
        }

        public int getMaximumPoolSize() {
            return maximumPoolSize;
        }

        public void setMaximumPoolSize(int maximumPoolSize) {
            this.maximumPoolSize = maximumPoolSize;
        }

        public long getIdleTimeoutMs() {
            return idleTimeoutMs;
        }

        public void setIdleTimeoutMs(long idleTimeoutMs) {
            this.idleTimeoutMs = idleTimeoutMs;
        }

        public long getMaxLifetimeMs() {
            return maxLifetimeMs;
        }

        public void setMaxLifetimeMs(long maxLifetimeMs) {
            this.maxLifetimeMs = maxLifetimeMs;
        }

        public long getConnectionTimeoutMs() {
            return connectionTimeoutMs;
        }

        public void setConnectionTimeoutMs(long connectionTimeoutMs) {
            this.connectionTimeoutMs = connectionTimeoutMs;
        }

        public long getValidationTimeoutMs() {
            return validationTimeoutMs;
        }

        public void setValidationTimeoutMs(long validationTimeoutMs) {
            this.validationTimeoutMs = validationTimeoutMs;
        }

        public long getKeepaliveTimeMs() {
            return keepaliveTimeMs;
        }

        public void setKeepaliveTimeMs(long keepaliveTimeMs) {
            this.keepaliveTimeMs = keepaliveTimeMs;
        }

        public long getLeakDetectionThresholdMs() {
            return leakDetectionThresholdMs;
        }

        public void setLeakDetectionThresholdMs(long leakDetectionThresholdMs) {
            this.leakDetectionThresholdMs = leakDetectionThresholdMs;
        }
    }
}
