const usersService = require("./service");

async function listUsers(req, res, next) {
  try {
    const users = await usersService.listUsers(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(
      req.companyId,
      req.body,
      req.user.id,
      req
    );
    return res.status(201).json({
      success: true,
      message: `User '${user.name}' created successfully with role ${user.role}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: `User '${user.name}' updated successfully.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function changeRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "New role is required.",
      });
    }

    const user = await usersService.changeUserRole(
      req.companyId,
      req.params.id,
      role,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: `User '${user.name}' role changed to ${user.role}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await usersService.deleteUser(
      req.companyId,
      req.params.id,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  changeRole,
  deleteUser,
};

