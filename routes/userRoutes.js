const express = require('express')
const router = express.Router()
const usersController = require('../Controllers/usersController')
const verifyJWT = require('../middleware/verifyJWT')

router.use("/updateUser", verifyJWT);
router.use("/getUserDetail", verifyJWT);
router.use("/updateUserPassword", verifyJWT);


router.route('/')
    .post(usersController.createNewUser)
    .delete(usersController.deleteUser)

router.route('/updateUser')
.post(usersController.updateUser)

router.route('/getUserDetail')
    .post(usersController.getUserDetail)

router.route('/updateUserPassword')
    .post(usersController.updateUserPassword)


module.exports = router


