package sg.nus.iss.final_project.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.User;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setName(rs.getString("name"));
        user.setEmail(rs.getString("email"));
        user.setPasswordHash(rs.getString("password_hash"));
        try {
            user.setFirebaseId(rs.getString("firebase_id"));
        } catch (Exception e) {
            user.setFirebaseId(null);
        }
        user.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return user;
    };

    public int save(User user) {
        String sql = "INSERT INTO users (name, email, password_hash, firebase_id) VALUES (?, ?, ?, ?)";
        return jdbcTemplate.update(sql, user.getName(), user.getEmail(), user.getPasswordHash(), user.getFirebaseId());
    }

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        List<User> users = jdbcTemplate.query(sql, userRowMapper, email);
        return users.stream().findFirst();
    }

    public Optional<User> findByFirebaseId(String firebaseId) {
        try {
            String sql = "SELECT * FROM users WHERE firebase_id = ?";
            List<User> users = jdbcTemplate.query(sql, userRowMapper, firebaseId);
            return users.stream().findFirst();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public int updateFirebaseId(Long userId, String firebaseId) {
        String sql = "UPDATE users SET firebase_id = ? WHERE id = ?";
        return jdbcTemplate.update(sql, firebaseId, userId);
    }

    public List<User> findAll() {
        String sql = "SELECT * FROM users";
        return jdbcTemplate.query(sql, userRowMapper);
    }

    public int deleteById(Long id) {
        String sql = "DELETE FROM users WHERE id = ?";
        return jdbcTemplate.update(sql, id);
    }

    public Optional<User> findById(Long id) {
        try {
            User user = jdbcTemplate.queryForObject(
                    "SELECT * FROM users WHERE id = ?",
                    new Object[] { id },
                    (rs, rowNum) -> {
                        User u = new User();
                        u.setId(rs.getLong("id"));
                        u.setName(rs.getString("name"));
                        u.setEmail(rs.getString("email"));
                        u.setPasswordHash(rs.getString("password_hash"));
                        try {
                            u.setFirebaseId(rs.getString("firebase_id"));
                        } catch (Exception e) {
                            // Column might not exist yet, handle gracefully
                            u.setFirebaseId(null);
                        }
                        u.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
                        return u;
                    });
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public int updateUserWithFirebase(Long userId, String firebaseId, String name) {
        String sql = "UPDATE users SET firebase_id = ?, name = ? WHERE id = ?";
        return jdbcTemplate.update(sql, firebaseId, name, userId);
    }
}