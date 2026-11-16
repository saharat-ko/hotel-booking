const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  checkInDate: {
    type: Date,
    required: [true, 'Please add a check-in date']
  },
  checkOutDate: {
    type: Date,
    required: [true, 'Please add a check-out date']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  hotel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate booking duration (1-3 nights)
BookingSchema.pre('validate', function () {
  if (!this.checkInDate || !this.checkOutDate) {
    return;
  }

  const toUTCDate = (date) =>
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );

  const nights =
    (toUTCDate(this.checkOutDate) -
      toUTCDate(this.checkInDate)) /
    (1000 * 60 * 60 * 24);

  if (nights < 1 || nights > 3) {
    this.invalidate(
      'checkOutDate',
      'Booking must be between 1 and 3 nights'
    );
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
