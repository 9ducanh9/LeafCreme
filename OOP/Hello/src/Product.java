public class Product {
    private int productId;
    private String name;
    private String brand;
    private double price;
    private int stockQuantity;
    private String status;

    public Product(int productId, String name, String brand,
                   double price, int stockQuantity, String status) {
        this.productId = productId;
        this.name = name;
        this.brand = brand;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.status = status;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double newPrice) {
        if (newPrice > 0) {
            price = newPrice;
        }
    }

    public void updateStock(int qty) {
        stockQuantity += qty;
    }

    public void applyDiscount(double percentage) {
        if (percentage > 0 && percentage <= 100) {
            price = price - (price * percentage / 100);
        }
    }

    public int getProductId() {
        return productId;
    }

    public int getStockQuantity() {
        return stockQuantity;
    }

    public void displayInfo() {
        System.out.println(
            "ID: " + productId +
            ", Name: " + name +
            ", Brand: " + brand +
            ", Price: " + String.format("%.0f", price) +
            ", Stock: " + stockQuantity +
            ", Status: " + status
        );
    }
}