const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');

// Handle Booking errors
const handleError = (err, res) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: 'Server error'
  });
};

// @desc Get all bookings
// @route GET /api/v1/bookings
// @access Private
exports.getBookings = async (req, res, next) => {
  try {
    const filter = {};

    // Filter by hotel if requested
    if (req.params.hotelId) {
      filter.hotel = req.params.hotelId;
    }

    // General users can only view their own bookings
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    }

    const bookings = await Booking.find(filter)
      .populate({
        path: 'hotel',
        select: 'name address district province tel'
      })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (err) {
    return handleError(err, res);
  }
};

// @desc Get single booking
// @route GET /api/v1/bookings/:id
// @access Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'hotel',
        select: 'name address district province tel'
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check booking ownership
    if (
      booking.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });

  } catch (err) {
    return handleError(err, res);
  }
};

// @desc Create new booking
// @route POST /api/v1/bookings
// @route POST /api/v1/hotels/:hotelId/bookings
// @access Private
exports.addBooking = async (req, res, next) => {
  try {
    const hotelId = req.params.hotelId || req.body.hotel;

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a hotel'
      });
    }

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Create booking for logged-in user
    const booking = await Booking.create({
      checkInDate: req.body.checkInDate,
      checkOutDate: req.body.checkOutDate,
      hotel: hotelId,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      data: booking
    });

  } catch (err) {
    return handleError(err, res);
  }
};

// @desc Update booking
// @route PUT /api/v1/bookings/:id
// @access Private
exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check booking ownership
    if (
      booking.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update hotel if provided
    if (req.body.hotel !== undefined) {
      const hotel = await Hotel.findById(req.body.hotel);

      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel not found'
        });
      }

      booking.hotel = req.body.hotel;
    }

    // Update check-in date
    if (req.body.checkInDate !== undefined) {
      booking.checkInDate = req.body.checkInDate;
    }

    // Update check-out date
    if (req.body.checkOutDate !== undefined) {
      booking.checkOutDate = req.body.checkOutDate;
    }

    // Save and run Booking model validation
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });

  } catch (err) {
    return handleError(err, res);
  }
};

// @desc Delete booking
// @route DELETE /api/v1/bookings/:id
// @access Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check booking ownership
    if (
      booking.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    return handleError(err, res);
  }
};
