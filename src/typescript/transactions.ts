// Importing necessary modules
import axios from 'axios';

class Transactions {
    public static async main(): Promise<void> {
        console.log("Executing TypeScript tests...");

        const args = process.argv.slice(2);
        const amountCredit = parseInt(args[0], 10) || 100; // Default to 100 if not provided
        const amountDebit = parseInt(args[1], 10) || 50; // Default to 50 if not provided

        try {
            const httpResponse = await Transactions.httpRequest("https://jsonplaceholder.typicode.com/posts", "GET", "");
            console.log("HTTP Response: " + httpResponse);

            Transactions.executeCreditLeg(amountCredit);
            Transactions.executeDebitLeg(amountDebit);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    private static async httpRequest(url: string, method: string, payload: string): Promise<string> {
        // Configure request based on method
        const options = {
            method: method,
            url: url,
            headers: { 'Content-Type': 'application/json' },
            data: (method === "POST" || method === "PUT") ? payload : null
        };

        // Axios automatically handles request method and data
        try {
            const response = await axios(options);
            return JSON.stringify(response.data);  // Converting response data to string for consistent output
        } catch (error) {
            console.error('HTTP request failed:', error);
            throw error;  // Re-throwing the error for upstream handling
        }
    }

    private static executeCreditLeg(amount: number): void {
        console.log("Credit leg executed with amount: " + amount);
    }

    private static executeDebitLeg(amount: number): void {
        console.log("Debit leg executed with amount: " + amount);
    }
}

// Running the main function of Transactions class only if executed directly
if (require.main === module) {
    Transactions.main();
}
