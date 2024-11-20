// src/Components/Dashboard/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Navbar,
  Nav,
  ProgressBar,
  Button,
  Dropdown,
  Modal,
  Spinner,
  Alert,
  Form,
} from 'react-bootstrap';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { confirmAlert } from 'react-confirm-alert';
import jsPDF from 'jspdf';
import { QrReader } from 'react-qr-reader';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'react-confirm-alert/src/react-confirm-alert.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import AddNewExpense from './AddNewExpense';
import ExpenseOverview from './ExpenseOverview';
import ExpenseHistory from './ExpenseHistory';
import axios from 'axios';
import { MdQrCodeScanner } from "react-icons/md";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

// Initialize SweetAlert2 with React Content
const MySwal = withReactContent(Swal);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [filter, setFilter] = useState('monthly');
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');
  const [error, setError] = useState('');
  const [isAddingToDB, setIsAddingToDB] = useState(false);
  const scanHandled = useRef(false);

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
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch expenses. Please try again later.',
      });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.category || !newExpense.amount) {
      MySwal.fire({
        icon: 'warning',
        title: 'Incomplete Fields',
        text: 'Please fill in all fields to add a new expense.',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${backendUrl}/api/expenses/add`, {
        userId: user.id,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setExpenses([...expenses, response.data.expense]);
      setNewExpense({ category: '', amount: '' });
      MySwal.fire({
        icon: 'success',
        title: 'Expense Added',
        text: 'Your expense has been successfully added.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Failed to add expense:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add expense.';
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
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
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'],
      },
    ],
  };

  // Generate PDF report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Expense Report', 105, 20, null, null, 'center');
    doc.setFontSize(12);
    doc.text(`User: ${user?.fullName}`, 20, 40);
    doc.text(`Total Spent: $${totalExpenses.toFixed(2)}`, 20, 50);
    doc.text(`Report Type: ${filter.charAt(0).toUpperCase() + filter.slice(1)} Report`, 20, 60);

    let y = 70;
    expenses.forEach((expense, index) => {
      doc.text(`${index + 1}. ${expense.category} - $${expense.amount}`, 20, y);
      y += 10;
    });

    doc.save('expense-report.pdf');
  };

  const handleScan = (result, error) => {
    if (result?.text && !scanHandled.current) {
      scanHandled.current = true;
      setScanResult(result.text);
      setEditedResult(result.text);
      setShowScanModal(true);
      setShowScanner(false);
    }
    if (error && error.name !== 'NotFoundException') {
      // Handle specific errors
      if (error.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera device found. Please connect a camera and try again.');
      } else {
        setError('');
      }
    }
  };

  const handleAddToDB = async () => {
    setIsAddingToDB(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${backendUrl}/api/expenses/scan`, {
        userId: user.id,
        data: editedResult,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 201) {
        setExpenses([...expenses, response.data.expense]);
        MySwal.fire({
          icon: 'success',
          title: 'Expense Added',
          text: 'The scanned expense has been added successfully!',
          timer: 2000,
          showConfirmButton: false,
        });
        handleCloseScanModal();
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to add expense.',
        });
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Failed to add expense to the database.';
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    }
    setIsAddingToDB(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCloseScanModal = () => {
    setShowScanModal(false);
    setError('');
    setIsEditing(false);
    scanHandled.current = false;
  };

  const handleScannerClose = () => {
    setShowScanner(false);
    setError('');
    scanHandled.current = false;
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
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
          <Col md={6} className="position-relative">
            <AddNewExpense
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              handleAddExpense={handleAddExpense}
            />
            <div
              className="position-absolute text-center"
              style={{ top: '22px', right: '30px', cursor: 'pointer' }}
              onClick={() => setShowScanner(true)}
            >
              <MdQrCodeScanner
                size={30}
                color="#007bff"
                title="Scan QR Code"
              />
              <small style={{ display: 'block' }}>Scan QR Code</small>
            </div>
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

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <Modal
            show={showScanner}
            onHide={handleScannerClose}
            centered
            backdrop="static"
            keyboard={false}
            size="lg"
            aria-labelledby="scanner-modal"
            dialogClassName="scanner-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Modal.Header closeButton>
                <Modal.Title id="scanner-modal">Scan QR Code</Modal.Title>
              </Modal.Header>
              <Modal.Body className="d-flex justify-content-center align-items-center p-0">
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%', height: '100%' }}
                    videoStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                  />
                  {error && (
                    <Alert variant="danger" className="position-absolute top-0 w-100 text-center">
                      {error}
                    </Alert>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleScannerClose}>
                  Cancel
                </Button>
              </Modal.Footer>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Scan Result Modal */}
      <AnimatePresence>
        {showScanModal && (
          <Modal
            show={showScanModal}
            onHide={handleCloseScanModal}
            centered
            backdrop="static"
            keyboard={false}
            size="md"
            aria-labelledby="scan-result-modal"
          >
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
            >
              <Modal.Header>
                <Modal.Title id="scan-result-modal">Scan Result</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {isEditing ? (
                  <Form>
                    <Form.Group controlId="formScanResult">
                      <Form.Label>Edit Scan Result</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={editedResult}
                        onChange={(e) => setEditedResult(e.target.value)}
                      />
                    </Form.Group>
                  </Form>
                ) : (
                  <p>{scanResult}</p>
                )}
              </Modal.Body>
              <Modal.Footer>
                {isEditing ? (
                  <Button variant="success" onClick={handleAddToDB} disabled={isAddingToDB}>
                    {isAddingToDB ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        /> Adding...
                      </>
                    ) : (
                      'Add to DB'
                    )}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" onClick={handleEdit}>
                      Edit
                    </Button>
                    <Button variant="success" onClick={handleAddToDB}>
                      Add to DB
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
