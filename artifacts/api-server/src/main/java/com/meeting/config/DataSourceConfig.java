package com.meeting.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() throws Exception {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            throw new IllegalStateException("DATABASE_URL environment variable is not set");
        }

        // Convert postgresql:// or postgres:// to JDBC URL
        String normalized = dbUrl
            .replace("postgresql://", "postgres-jdbc://")
            .replace("postgres://", "postgres-jdbc://");
        URI uri = new URI(normalized);

        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath();
        String database = path.startsWith("/") ? path.substring(1) : path;
        // Strip query params from database name
        if (database.contains("?")) {
            database = database.substring(0, database.indexOf("?"));
        }

        String userInfo = uri.getUserInfo();
        String username = "";
        String password = "";
        if (userInfo != null) {
            int sep = userInfo.indexOf(':');
            if (sep >= 0) {
                username = userInfo.substring(0, sep);
                password = userInfo.substring(sep + 1);
            } else {
                username = userInfo;
            }
        }

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;
        // Preserve query parameters (e.g. sslmode=require)
        String rawQuery = uri.getRawQuery();
        if (rawQuery != null && !rawQuery.isBlank()) {
            jdbcUrl += "?" + rawQuery;
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        config.setConnectionTimeout(30000);

        return new HikariDataSource(config);
    }
}
