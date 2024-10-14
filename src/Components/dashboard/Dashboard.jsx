// src/Components/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Navbar, Nav, ProgressBar, Button, Form, Dropdown } from 'react-bootstrap';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { confirmAlert } from 'react-confirm-alert';
import jsPDF from 'jspdf'; // Import jsPDF library
import 'react-confirm-alert/src/react-confirm-alert.css';
import AddNewExpense from './AddNewExpense';
import ExpenseOverview from './ExpenseOverview';
import ExpenseHistory from './ExpenseHistory';
import axios from 'axios';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [filter, setFilter] = useState('monthly'); // Track filter type

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      fetchExpenses(storedUser.id, filter);
    }
  }, [filter]);

  const fetchExpenses = async (userId, filterType) => {
    try {
      const response = await axios.get(`${backendUrl}/api/expenses/${userId}`, {
        params: { filter: filterType },
      });
      setExpenses(response.data.expenses);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.category || !newExpense.amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await axios.post(`${backendUrl}/api/expenses/add`, {
        userId: user.id,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
      });
      setExpenses([...expenses, response.data.expense]);
      setNewExpense({ category: '', amount: '' });
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }, 2000);
  };

  const showLogoutConfirmation = () => {
    confirmAlert({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          label: 'Yes',
          onClick: handleLogout,
        },
        {
          label: 'No',
        },
      ],
      closeOnEscape: true,
      closeOnClickOutside: true,
    });
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  const chartData = {
    labels: expenses.map((exp) => exp.category),
    datasets: [
      {
        data: expenses.map((exp) => exp.amount),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      },
    ],
  };

  // Generate PDF report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.text('Expense Report', 10, 10);
    doc.text(`User: ${user?.fullName}`, 10, 20);
    doc.text(`Total Spent: $${totalExpenses.toFixed(2)}`, 10, 30);
    doc.text(`Report Type: ${filter.charAt(0).toUpperCase() + filter.slice(1)} Report`, 10, 40);

    let y = 50;
    expenses.forEach((expense, index) => {
      doc.text(`${index + 1}. ${expense.category} - $${expense.amount}`, 10, y);
      y += 10;
    });

    doc.save('expense-report.pdf');
  };

  return (
    <Container fluid className="p-0">
      <Navbar bg="light" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand>Dashboard</Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-danger" onClick={showLogoutConfirmation}>
              <FiLogOut /> Logout
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <Container className="mt-5">
        <Row className="mb-4 align-items-center">
          <Col md={8} xs={12}>
            <h2>Welcome, {user?.fullName}!</h2>
            <p>
              Monthly Budget: ${user?.monthlyBudget} | Preferred Currency: {user?.preferredCurrency} |{' '}
              <strong>Total Spent: ${totalExpenses.toFixed(2)}</strong>
            </p>
            <ProgressBar
              now={(totalExpenses / user?.monthlyBudget) * 100}
              label={`${((totalExpenses / user?.monthlyBudget) * 100).toFixed(1)}% Spent`}
              variant={totalExpenses > user?.monthlyBudget ? 'danger' : 'success'}
            />
          </Col>

          <Col md={4} xs={12} className="text-md-end text-center mt-2 mt-md-0">
            <Dropdown>
              <Dropdown.Toggle variant="secondary" id="dropdown-basic" className="w-100 w-md-auto">
                Filter Expenses
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setFilter('daily')}>Daily</Dropdown.Item>
                <Dropdown.Item onClick={() => setFilter('weekly')}>Weekly</Dropdown.Item>
                <Dropdown.Item onClick={() => setFilter('monthly')}>Monthly</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col md={6}>
            <AddNewExpense
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              handleAddExpense={handleAddExpense}
            />
          </Col>
          <Col md={6}>
            <ExpenseOverview chartData={chartData} />
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Button variant="primary" onClick={generatePDFReport} className="w-100">
              Download Report
            </Button>
          </Col>
        </Row>

        <Row>
          <Col>
            <ExpenseHistory expenses={expenses} />
          </Col>
        </Row>

        {isLoggingOut && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
          >
            <h3 className="text-white">Logging out...</h3>
          </div>
        )}
      </Container>
    </Container>
  );
};

export default Dashboard;
