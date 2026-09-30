const express = require('express');
const router = express.Router();
const { 
  getSummary,
  getMonthlyCollections,
  getCourseCollections,
  getRecentPayments,
  getUpcomingPayments,
  getTopDebtors,
  getActivity,
  getGoals
} = require('../controllers/dashboardController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Proteger todas las rutas del dashboard
router.use(verifyJWT);

router.get('/summary', getSummary);
router.get('/monthly-collections', getMonthlyCollections);
router.get('/course-collections', getCourseCollections);
router.get('/recent-payments', getRecentPayments);
router.get('/upcoming-payments', getUpcomingPayments);
router.get('/top-debtors', getTopDebtors);
router.get('/activity', getActivity);
router.get('/goals', getGoals);

module.exports = router;
