const express = require('express');

const {
  getBookings,
  getBooking,
  addBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/booking');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// @route GET /api/v1/bookings
// @route GET /api/v1/hotels/:hotelId/bookings
// @route POST /api/v1/bookings
// @route POST /api/v1/hotels/:hotelId/bookings
router.route('/')
  .get(protect, getBookings)
  .post(protect, authorize('admin', 'user'), addBooking);

// @route GET /api/v1/bookings/:id
// @route PUT /api/v1/bookings/:id
// @route DELETE /api/v1/bookings/:id
router.route('/:id')
  .get(protect, getBooking)
  .put(protect, authorize('admin', 'user'), updateBooking)
  .delete(protect, authorize('admin', 'user'), deleteBooking);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Booking ID
 *         checkInDate:
 *           type: string
 *           format: date
 *           description: Check-in date
 *           example: "2026-11-20"
 *         checkOutDate:
 *           type: string
 *           format: date
 *           description: Check-out date (maximum 3 nights)
 *           example: "2026-11-23"
 *         hotel:
 *           type: string
 *           description: Hotel ID
 *         user:
 *           type: string
 *           description: User ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     BookingInput:
 *       type: object
 *       required:
 *         - hotel
 *         - checkInDate
 *         - checkOutDate
 *       properties:
 *         hotel:
 *           type: string
 *           description: Hotel ID
 *         checkInDate:
 *           type: string
 *           format: date
 *           example: "2026-11-20"
 *         checkOutDate:
 *           type: string
 *           format: date
 *           example: "2026-11-23"
 */

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Hotel booking management API
 */

/**
 * @swagger
 * /api/v1/bookings:
 *   get:
 *     summary: Get bookings (own bookings for users, all for admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Create a new booking (1-3 nights)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid booking data or duration
 *       404:
 *         description: Hotel not found
 */

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Get a booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   put:
 *     summary: Update a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotel:
 *                 type: string
 *               checkInDate:
 *                 type: string
 *                 format: date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       400:
 *         description: Invalid booking data or duration
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking or hotel not found
 */

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   delete:
 *     summary: Delete a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v1/hotels/{hotelId}/bookings:
 *   get:
 *     summary: Get bookings for a specific hotel
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel bookings filtered by user permissions
 */

/**
 * @swagger
 * /api/v1/hotels/{hotelId}/bookings:
 *   post:
 *     summary: Create a booking for a specific hotel
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkInDate
 *               - checkOutDate
 *             properties:
 *               checkInDate:
 *                 type: string
 *                 format: date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid booking dates
 *       404:
 *         description: Hotel not found
 */
