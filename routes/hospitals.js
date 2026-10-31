const express = require('express');
const appointments = require('./appointments');
const { getHospitals, getHospital, createHospital, updateHospital, deleteHospital } = require('../controllers/hospitals');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Re-route into other resource routers
router.use('/:hospitalId/appointments', appointments);

router.route('/').get(getHospitals).post(protect, authorize('admin'), createHospital);
router.route('/:id').get(getHospital).put(protect, authorize('admin'), updateHospital).delete(protect, authorize('admin'), deleteHospital);

module.exports = router;

/**
 * @swagger
 * components:
 *  schemas:
 *     Hospital:
 *      type: object
 *      required:
 *        - name
 *        - address
 *      properties:
 *        id:
 *          type: string
 *          format: uuid
 *          description: The auto-generated id of the hospital
 *          example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *        ลำดับ:
 *          type: string
 *          description: Ordinal number
 *        name:
 *          type: string
 *          description: The hospital's name
 *        address:
 *          type: string
 *          description: House No., Street, Road
 *        district:
 *          type: string
 *          description: The hospital's district
 *        province:
 *          type: string
 *          description: The hospital's province
 *        postalcode:
 *          type: string
 *          description: 5-digit postal code
 *        tel:
 *          type: string
 *          description: The hospital's telephone number
 *        region:
 *          type: string
 *          description: The hospital's region
 *      example:
 *        id: d290f1ee-6c54-4b01-90e6-d701748f0851
 *        ลำดับ: 1
 *        name: โรงพยาบาลศิริราช
 *        address: 2 ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพมหานคร 10700
 *        district: บางกอกน้อย
 *        province: กรุงเทพมหานคร
 *        postalcode: 10700
 *        tel: 02-419-7000
 *        region: กรุงเทพมหานคร
 */

/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: The hospitals managing API
 */

/**
 * @swagger
 * /api/v1/hospitals:
 *   get:
 *     summary: Returns the list of all the hospitals
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: The list of the hospitals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hospital'
 */

/**
 * @swagger
 * /api/v1/hospitals/{id}:
 *   get:
 *     summary: Get the hospital by id
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The hospital id
 *     responses:
 *       200:
 *         description: The hospital description by id
 *         contents:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       404:
 *         description: The hospital was not found
 */

/**
 * @swagger
 * /api/v1/hospitals:
 *   post:
 *     summary: Create a new hospital
 *     tags: [Hospitals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hospital'
 *     responses:
 *       201:
 *         description: The hospital was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       500:
 *         description: Some server error
 */

/**
 * @swagger
 * /api/v1/hospitals/{id}:
 *  put:
 *    summary: Update the hospital by the id
 *    tags: [Hospitals]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The hospital id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Hospital'
 *    responses:
 *      200:
 *        description: The hospital was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Hospital'
 *      404:
 *        description: The hospital was not found
 *      500:
 *        description: Some error happened
 */

/**
 * @swagger
 * /api/v1/hospitals/{id}:
 *   delete:
 *     summary: Remove the hospital by id
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The hospital id
 *
 *     responses:
 *       200:
 *         description: The hospital was deleted
 *       404:
 *         description: The hospital was not found
 */ 