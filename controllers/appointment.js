const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');

//@desc Get all appointments
// @route GET /api/v1/appointments
// @access Private
exports.getAppointments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.params.hospitalId) {
      filter.hospital = req.params.hospitalId;
    }
    // General user can only see their own appointments
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    }
    const query = Appointment.find(filter).populate({
      path: 'hospital',
      select: 'name province tel'
    });
    const appointments = await query;
    res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot find Appointment' });
  }
};

//@desc Get single appointment
// @route GET /api/v1/appointments/:id
// @access Private
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: 'hospital',
      select: 'name description tel'
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot find Appointment' });
  }
};

//@desc Add single appointment
// @route POST /api/v1/hospitals/:hospitalId/appointments
// @access Private
exports.addAppointment = async (req, res, next) => {
  try {
    req.body.hospital = req.params.hospitalId;

    const hospital = await Hospital.findById(req.params.hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    //add user to req.body
    req.body.user = req.user.id;
    //check for existing appointment
    const existingAppointment = await Appointment.find({ user: req.user.id });
    //if the user is not an admin, they can only create 3 appointments
    if (existingAppointment.length >= 3 && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'The user with ID ${req.user.id} has already made 3 appointments' });
    }

    const appointment = await Appointment.create(req.body);
    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot create Appointment' });
  }
};

//@desc Update single appointment
// @route PUT /api/v1/appointments/:id
// @access Private
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Make sure user is appointment owner
    if (appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'User not authorized to update this appointment' });
    }

    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot update Appointment' });
  }
};

//@desc Delete single appointment
// @route DELETE /api/v1/appointments/:id
// @access Private
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    await appointment.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot delete Appointment' });
  }
};
