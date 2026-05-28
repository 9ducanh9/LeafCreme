public class User {
    private int userId;
    private String username;
    private String password;
    private String role;

    public User(int userId, String username, String password, String role) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public boolean login(String u, String p) {
        return username.equals(u) && password.equals(p);
    }

    public void updateProfile(String name, String email) {
        System.out.println("Da cap nhat thong tin nguoi dung.");
    }

    public String getRole() {
        return role;
    }
}