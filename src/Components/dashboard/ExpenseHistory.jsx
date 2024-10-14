// src/Components/Dashboard/ExpenseHistory.jsx
import React from 'react';
import { Table, Card } from 'react-bootstrap';

const ExpenseHistory = ({ expenses }) => {
  return (
    <Card className="p-4 shadow-sm">
      <h5>Expense History</h5>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, index) => (
            <tr key={expense.id}>
              <td>{index + 1}</td> {/* Display row number starting from 1 */}
              <td>{expense.category}</td>
              <td>${expense.amount}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
};

export default ExpenseHistory;
