import requests

def execute_credit_leg(amount, account):
    print(f"Crediting {amount} to account {account}")

def execute_debit_leg(amount, account):
    print(f"Debiting {amount} from account {account}")

def http_request(url, method='GET', payload=None, headers=None):
    if headers is None:
        headers = {'Content-Type': 'application/json'}
    
    if method.upper() == 'GET':
        response = requests.get(url, headers=headers)
    elif method.upper() == 'POST':
        response = requests.post(url, json=payload, headers=headers)
    elif method.upper() == 'PUT':
        response = requests.put(url, json=payload, headers=headers)
    else:
        raise ValueError("Unsupported HTTP method")

    return response.json()

# Test the functions
if __name__ == "__main__":
    execute_credit_leg(100, "account1")
    execute_debit_leg(50, "account2")

    response = http_request("https://jsonplaceholder.typicode.com/posts")
    print(f"HTTP Response: {response}")
