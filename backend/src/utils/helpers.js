/**
 * Strips internal fields (contentHash) before sending to client.
 * Converts paise back to rupees as a string to preserve precision.
 */
const formatExpense=(expense)=> {
  return {
    id: expense.id,
    amount: (expense.amountPaise / 100).toFixed(2), // string, e.g. "10.50"
    category: expense.category,
    description: expense.description,
    date: expense.date,
    createdAt: expense.createdAt,
  };
}

module.exports={formatExpense}
