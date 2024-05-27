def execute_credit_leg(amount, account):
    print(f"Crediting {amount} to account {account}")

def execute_debit_leg(amount, account):
    print(f"Debiting {amount} from account {account}")

def simple_add(a, b):
    return a + b

# Test the functions
if __name__ == "__main__":
    execute_credit_leg(100, "account1")
    execute_debit_leg(50, "account2")
    result = simple_add(10, 20)
    print(f"Result of simple_add: {result}")
