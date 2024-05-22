package transactions;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class Transactions {

    public static void executeCreditLeg(double amount, String account) {
        System.out.println("Crediting " + amount + " to account " + account);
    }

    public static void executeDebitLeg(double amount, String account) {
        System.out.println("Debiting " + amount + " from account " + account);
    }

    public static String httpRequest(String urlString, String method, String payload) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod(method);
        connection.setRequestProperty("Content-Type", "application/json");

        if (method.equals("POST") || method.equals("PUT")) {
            connection.setDoOutput(true);
            connection.getOutputStream().write(payload.getBytes("UTF-8"));
        }

        Scanner scanner = new Scanner(connection.getInputStream());
        StringBuilder response = new StringBuilder();
        while (scanner.hasNextLine()) {
            response.append(scanner.nextLine());
        }
        scanner.close();

        return response.toString();
    }

    public static void main(String[] args) {
        // Test the functions
        executeCreditLeg(100, "account1");
        executeDebitLeg(50, "account2");

        try {
            String response = httpRequest("https://jsonplaceholder.typicode.com/posts", "GET", "");
            System.out.println("HTTP Response: " + response);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}