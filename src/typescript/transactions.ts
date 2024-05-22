// Importing necessary modules
import fetch from 'node-fetch';

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
        const headers = { 'Content-Type': 'application/json' };
        const options = {
            method: method,
            headers: headers,
            body: payload
        };
        if (method === "GET" || method === "HEAD") {
            delete options.body;  // GET or HEAD requests should not have a body
        }

        const response = await fetch(url, options);
        const data = await response.text();
        return data;
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
