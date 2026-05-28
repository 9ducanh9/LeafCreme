public class Cart {
    private int cartId;
    private double totalAmount;

    public Cart(int cartId) {
        this.cartId = cartId;
        this.totalAmount = 0;
    }

    public void addItem(Product p, int qty) {
        totalAmount += p.getPrice() * qty;
    }

    public void removeItem(int productId) {
        System.out.println("Da xoa san pham co ma: " + productId);
    }

    public double calculateTotal() {
        return totalAmount;
    }
}