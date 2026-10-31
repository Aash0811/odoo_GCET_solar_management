const express = require("express");
const router = express.Router();
const usersController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");

router.use(authenticate);
router.use(companyScope);
router.use(requireRole("ADMIN")); // All user management operations strictly reserved for Admin

// List users & detail
router.get("/", usersController.listUsers);
router.get("/:id", usersController.getUser);

// Create user
router.post("/", usersController.createUser);

// Update user details, assignments, status, or password
router.patch("/:id", usersController.updateUser);

// Quick role change endpoint
router.patch("/:id/role", usersController.changeRole);

// Delete user
router.delete("/:id", usersController.deleteUser);

module.exports = router;

