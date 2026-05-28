import java.util.Date;

public class Order {
    private String orderId;
    private Date orderDate;
    private String status;

    public Order(String orderId, Date orderDate, String status) {
        this.orderId = orderId;
        this.orderDate = orderDate;
        this.status = status;
    }

    public void createOrder() {
        System.out.println("Don hang da duoc tao.");
    }

    public void updateStatus(String newStatus) {
        status = newStatus;
    }

    public void printInvoice() {
        System.out.println("Ma don hang: " + orderId);
        System.out.println("Ngay dat: " + orderDate);
        System.out.println("Trang thai: " + status);
    }
}