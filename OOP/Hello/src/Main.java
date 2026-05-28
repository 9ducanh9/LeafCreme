import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        Product[] products = new Product[5];

        products[0] = new Product(1, "iPhone 17 Pro", "Apple", 34990000, 10, "Con hang");
        products[1] = new Product(2, "Galaxy S26 Ultra", "Samsung", 32990000, 8, "Con hang");
        products[2] = new Product(3, "Xiaomi 15 Ultra", "Xiaomi", 29990000, 12, "Con hang");
        products[3] = new Product(4, "OPPO Find X9 Ultra", "OPPO", 26990000, 6, "Con hang");
        products[4] = new Product(5, "OPPO Reno15 Pro 5G", "OPPO", 16990000, 0, "Het hang");

        System.out.println("DANH SACH SAN PHAM:");
        for (Product p : products) {
            p.displayInfo();
        }

        System.out.print("\nNhap ma san pham can cap nhat gia: ");
        int updateId = sc.nextInt();

        System.out.print("Nhap gia moi: ");
        double newPrice = sc.nextDouble();

        boolean updated = false;

        for (Product p : products) {
            if (p.getProductId() == updateId) {
                p.setPrice(newPrice);
                updated = true;
                System.out.println("Cap nhat gia thanh cong!");
                break;
            }
        }

        if (!updated) {
            System.out.println("Khong tim thay san pham can cap nhat.");
        }

        System.out.print("\nNhap ma san pham can tim kiem: ");
        int searchId = sc.nextInt();

        boolean found = false;

        for (Product p : products) {
            if (p.getProductId() == searchId) {
                System.out.println("Thong tin san pham tim thay:");
                p.displayInfo();
                found = true;
                break;
            }
        }

        if (!found) {
            System.out.println("Khong tim thay san pham.");
        }

        double totalInventoryValue = 0;

        for (Product p : products) {
            totalInventoryValue += p.getPrice() * p.getStockQuantity();
        }

        System.out.println("\nTong gia tri san pham hien co trong kho: " + String.format("%.0f", totalInventoryValue));

        sc.close();
    }
}