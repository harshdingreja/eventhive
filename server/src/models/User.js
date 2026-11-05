const { DataTypes } = require('sequelize');
const sequelize = require('../db/postgres');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true, // the database itself refuses a second account with the same email
    validate: { isEmail: true },
  },
  // We store a bcrypt hash, never the password. Even someone who reads the
  // database cannot get the original password back from it.
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('student', 'admin'),
    allowNull: false,
    defaultValue: 'student',
  },
});

// What the browser is allowed to see about a user (no password hash).
User.prototype.toSafeJSON = function toSafeJSON() {
  return { id: this.id, name: this.name, email: this.email, role: this.role };
};

module.exports = User;
