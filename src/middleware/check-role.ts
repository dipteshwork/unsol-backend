const Role = require("../_common/role");

module.exports = {
  userIsAdministrator,
};

function userIsAdministrator(req, res, next) {
  if (compareRole(res.locals.userRole, Role.Administrator)) {
    next();
  }
  res.status(401).json({ message: "Auth failed" });
}
function compareRole(userRole, requiredRole) {
  if (userRole == requiredRole) {
    return true;
  }
  return false;
}
