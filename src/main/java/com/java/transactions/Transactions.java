package com.java.transactions;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class Transactions {
    public static void main(String[] args) {
        System.out.println("Executing Java tests...");

        try {
            String httpResponse = httpRequest("https://jsonplaceholder.typicode.com/posts", "GET", "");
            System.out.println("HTTP Response: " + httpResponse);

            executeCreditLeg(100);
            executeDebitLeg(50);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static String httpRequest(String urlString, String method, String payload) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod(method);
        connection.setRequestProperty("Content-Type", "application/json");

        if ("POST".equals(method) || "PUT".equals(method)) {
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

    public static void executeCreditLeg(int amount) {
        System.out.println("Credit leg executed with amount: " + amount);
    }

    public static void executeDebitLeg(int amount) {
        System.out.println("Debit leg executed with amount: " + amount);
    }
}
